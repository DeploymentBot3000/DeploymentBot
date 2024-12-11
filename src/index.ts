// Package imports
import config from "./config.js";
import {error, log} from "./utils/logger.js";
import { ActivityType } from "discord.js";

// Handlers & Database
import { registerEventHandlers } from "./handlers/eventHandler.js";
import database from "./handlers/databaseHandler.js";

// Type imports
import gracefulShutdown from "./utils/gracefulShutdown.js";
import { client } from "./custom_client.js";

//Add status when client is ready
client.on('ready', () => {
   client.user?.setActivity(config.satus.text, { type: ActivityType.Watching });
});

if (database.isInitialized) {
    log('Successfully connected to the database', 'Startup');
}

registerEventHandlers(client);

// Catching all the errors
process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

client.login(config.token).catch(error => {
    console.error('Critical error during startup:', error);
    process.exit(1);
});
