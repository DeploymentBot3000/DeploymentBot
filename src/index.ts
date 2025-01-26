import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { config } from "./config.js";
import { secrets } from "./config/secrets_loader.js";
import autocompleteInteraction from "./events/auto_complete_Interaction.js";
import buttonInteraction from "./events/button_interaction.js";
import chatInputCommandInteraction from "./events/chat_input_command_interaction.js";
import { discordClientReadyCallback } from "./events/client_ready_event.js";
import modalSubmittionInteraction from "./events/modal_submit_interaction.js";
import selectMenuInteraction from "./events/select_menu_interaction.js";
import { formatInteractionDetailsForLog } from "./utils/interaction_format.js";
import { sendErrorToLogChannel } from "./utils/log_channel.js";
import { action, fatal, logger, LogLevel, success, verbose } from "./utils/logger.js";
import { isEnumKey } from "./utils/typescript.js";

if (!isEnumKey(LogLevel, config.logLevel)) {
    fatal(`${config.logLevel} is not a valid log level`);
}
logger.level = LogLevel[config.logLevel];

verbose(`Loaded secrets file with env: ${secrets.env}`);

// Initialize the client
const client = new Client({
    // Intents: Intents are event subscriptions that send information from the discord server to the bot.
    // These are often needed to populate the discord client cache, even if not subscribing to events explicitly.
    // They do not give permissions to do any operations.
    // https://discord.com/developers/docs/events/gateway#list-of-intents
    intents: [
        // Required to receive responses to vc channel creation and to find vc categories in the channel cache.
        // This intent provides basic information about the guild to our discord client.
        GatewayIntentBits.Guilds,

        // Required for the bot to know how many members are in a voice channel.
        // This event notifies our discord client when people leave/join a vc.
        GatewayIntentBits.GuildVoiceStates,

        // Privileged Gateway Intents
        // Privileged Gateway Intents must also be enabled in the discord app bot config:
        // https://discord.com/developers/applications/1312896264475508839/bot
        // No Privileged Gateway Intents are required.
    ],
});


client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
        if (!interaction.inCachedGuild()) {
            throw new Error('Interaction not in a cached guild!');
        }
        action(formatInteractionDetailsForLog(interaction));
        if (interaction.isAutocomplete()) {
            await autocompleteInteraction.callback(interaction);
        } else if (interaction.isChatInputCommand()) {
            await chatInputCommandInteraction.callback(interaction);
        } else if (interaction.isButton()) {
            await buttonInteraction.callback(interaction);
        } else if (interaction.isModalSubmit()) {
            await modalSubmittionInteraction.callback(interaction);
        } else if (interaction.isAnySelectMenu()) {
            await selectMenuInteraction.callback(interaction);
        } else {
            console.log('Unknown interaction object:', interaction);
            throw new Error(`Unknown interaction: ${interaction.id}`);
        }
        success(`Interaction Done: ${interaction.id}`);
    } catch (e: any) {
        console.log(interaction);
        await sendErrorToLogChannel(e, client);
    }
});

process.on('uncaughtException', async (e: Error) => {
    try {
        await sendErrorToLogChannel(e, client);
        await sendErrorToLogChannel(new Error('🚨🚨🚨 Uncaught Exception, exiting process! 🚨🚨🚨'), client);
        await client.destroy();
    } catch (e) {
        console.log(e);
    }
    process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async (signal: string) => {
        await sendErrorToLogChannel(new Error(`Received signal: ${signal}, shutting down.`), client);
        await client.destroy();
        verbose('Destroyed discord client!');
        process.exit(1);
    });
}

// Log in bot
verbose('Logging in discord client', 'Startup');
client.once(Events.ClientReady, discordClientReadyCallback.bind(null)).login(config.token);
