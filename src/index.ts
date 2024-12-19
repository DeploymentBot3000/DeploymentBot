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
import { Interaction, VoiceState } from "discord.js";
import { sendErrorToLogChannel } from "./utils/log_channel.js";

await new DataSource({
    ...config.database as DataSourceOptions,
    entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups]),
    synchronize: config.synchronizeDatabase,
    dropSchema: config.resetDatabase
}).initialize();

// Client Events
client.on(removeExpiredVoiceChannels.name, async (oldState: VoiceState, newState: VoiceState) => {
    try {
        await removeExpiredVoiceChannels.function(oldState, newState);
    } catch (e: any) {
        await sendErrorToLogChannel(e, client);
    }
});

// Client Interactions
async function handleEventWithErrorLog(callback: (interaction: Interaction) => Promise<void>, interaction: Interaction) {
    try {
        await callback(interaction);
    } catch (e: any) {
        await sendErrorToLogChannel(e, client);
    }
}
client.on(autocompleteInteraction.name, handleEventWithErrorLog.bind(null, autocompleteInteraction.function));
client.on(buttonInteraction.name, handleEventWithErrorLog.bind(null, buttonInteraction.function));
client.on(chatInputCommandInteraction.name, handleEventWithErrorLog.bind(null, chatInputCommandInteraction.function));
client.on(modalSubmittionInteraction.name, handleEventWithErrorLog.bind(null, modalSubmittionInteraction.function));
client.on(selectMenuInteraction.name, handleEventWithErrorLog.bind(null, selectMenuInteraction.function));

// Log in bot
client.once(ready.name, ready.function).login(config.token);
