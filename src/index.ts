// Package imports
import config from "./config.js";
import {error, log} from "./utils/logger.js";
import { ActivityType } from "discord.js";

// Database
import database from "./handlers/databaseHandler.js";

// Type imports
import gracefulShutdown from "./utils/gracefulShutdown.js";
import { client } from "./custom_client.js";

// Client ready event
import ready from "./events/client_ready_event.js";

// Discord Events
import removeExpiredVoiceChannels from "./events/voice_state_update_event.js";

// Discord Interactions
import autocompleteInteraction from "./events/auto_complete_Interaction.js";
import buttonInteraction from "./events/button_interaction.js";
import interactionCreate from "./events/chat_input_command_interaction.js";
import modalSubmittionInteraction from "./events/modal_submit_interaction.js";
import selectMenuInteraction from "./events/select_menu_interaction.js";

//Add status when client is ready
client.on('ready', () => {
   client.user?.setActivity(config.satus.text, { type: ActivityType.Watching });
});

if (database.isInitialized) {
    log('Successfully connected to the database', 'Startup');
}

// Client Events
client.on(autocompleteInteraction.name, autocompleteInteraction.function.bind(null));
client.on(buttonInteraction.name, buttonInteraction.function.bind(null));
client.on(interactionCreate.name, interactionCreate.function.bind(null));
client.on(modalSubmittionInteraction.name, modalSubmittionInteraction.function.bind(null));
client.on(removeExpiredVoiceChannels.name, removeExpiredVoiceChannels.function.bind(null));
client.on(selectMenuInteraction.name, selectMenuInteraction.function.bind(null));

// Client Ready Event
client.once(ready.name, ready.function);

// Catching all the errors
process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

client.login(config.token).catch(error => {
    console.error('Critical error during startup:', error);
    process.exit(1);
});
