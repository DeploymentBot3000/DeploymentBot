import { DataSource, DataSourceOptions } from "typeorm";
import config from "./config.js";
import { client } from "./custom_client.js";
import autocompleteInteraction from "./events/auto_complete_Interaction.js";
import buttonInteraction from "./events/button_interaction.js";
import chatInputCommandInteraction from "./events/chat_input_command_interaction.js";
import ready from "./events/client_ready_event.js";
import modalSubmittionInteraction from "./events/modal_submit_interaction.js";
import selectMenuInteraction from "./events/select_menu_interaction.js";
import removeExpiredVoiceChannels from "./events/voice_state_update_event.js";
import Backups from "./tables/Backups.js";
import Deployment from "./tables/Deployment.js";
import LatestInput from "./tables/LatestInput.js";
import Queue from "./tables/Queue.js";
import QueueStatusMsg from "./tables/QueueStatusMsg.js";
import Signups from "./tables/Signups.js";
import { Events, Interaction, VoiceState } from "discord.js";
import { sendErrorToLogChannel } from "./utils/log_channel.js";
import Settings from "./tables/Settings.js";
import { log } from "./utils/logger.js";

await new DataSource({
    ...config.database as DataSourceOptions,
    entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups, Settings]),
    synchronize: config.synchronizeDatabase,
    dropSchema: config.resetDatabase
}).initialize();

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
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
            await sendErrorToLogChannel(new Error(`Unknown interaction: ${interaction.id}`), client);
            console.log(interaction);
        }
    } catch (e: any) {
        await sendErrorToLogChannel(e, client);
    }
});

client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    try {
        await removeExpiredVoiceChannels.callback(oldState, newState);
    } catch (e: any) {
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

process.on('SIGINT', async () => {
    await sendErrorToLogChannel(new Error('Manually interrupted, shutting down.'), client);
    await client.destroy();
    log('Destroyed discord client!');
    process.exit(1);
});

// Log in bot
log('Logging in discord client', 'Startup');
client.once(Events.ClientReady, ready.callback).login(config.token);
