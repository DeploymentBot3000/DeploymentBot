import { Events, Interaction } from "discord.js";
import { config } from "./config.js";
import { client } from "./custom_client.js";
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
