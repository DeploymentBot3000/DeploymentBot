import { DataSource, DataSourceOptions } from "typeorm";
import config from "./config.js";
import { client } from "./custom_client.js";
import autocompleteInteraction from "./events/auto_complete_Interaction.js";
import buttonInteraction from "./events/button_interaction.js";
import interactionCreate from "./events/chat_input_command_interaction.js";
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

await new DataSource({
    ...config.database as DataSourceOptions,
    entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups]),
    synchronize: config.synchronizeDatabase,
    dropSchema: config.resetDatabase
}).initialize();

// Client Events
client.on(autocompleteInteraction.name, autocompleteInteraction.function.bind(null));
client.on(buttonInteraction.name, buttonInteraction.function.bind(null));
client.on(interactionCreate.name, interactionCreate.function.bind(null));
client.on(modalSubmittionInteraction.name, modalSubmittionInteraction.function.bind(null));
client.on(removeExpiredVoiceChannels.name, removeExpiredVoiceChannels.function.bind(null));
client.on(selectMenuInteraction.name, selectMenuInteraction.function.bind(null));

// Client Ready Event
client.once(ready.name, ready.function);

client.login(config.token); 
