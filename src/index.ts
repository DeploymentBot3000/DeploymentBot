// Package imports
import config from "./config.js";
import {error, log} from "./utils/logger.js";
import { ActivityType, GatewayIntentBits } from "discord.js";

// Handlers & Database
import { registerEventHandlers } from "./handlers/eventHandler.js";
import database from "./handlers/databaseHandler.js";

// Type imports
import fs from "fs/promises";
import { registerStartQueuedGameInterval } from "./utils/startQueuedGame.js";
import gracefulShutdown from "./utils/gracefulShutdown.js";
import { Duration } from "luxon";
import { CustomClient } from "./custom_client.js";
import { importAllTheThings } from "./import_all_the_things.js";

// Initialize the extended client
export const client = new CustomClient({
    // Invite link, this defines the permissions the bot has and what it can do.
    // https://discord.com/developers/applications/1312896264475508839/oauth2
    // Move Members
    //   - To set permissions on new voice channels to allow the host to kick out non squad members.
    // Create Instant Invite
    //   - To allow the host to invite others to the voice channel.
    // https://discord.com/oauth2/authorize?client_id=1312896264475508839&permissions=16777217&integration_type=0&scope=bot
    // The bot then must be given the `Manage Channels` permission on the hot drops and strikes VC categories.

    // Intents: Intents are event subscriptions that send information from the discord server to the bot.
    // These are often needed to populate the discord client cache, even if not subscribing to events explicitly.
    // They do not give permissions to do any operations.
    // https://discord.com/developers/docs/events/gateway#list-of-intents
    intents: [
        // Required to receive responses to vc channel creation and to find vc categories in the channel cache.
        GatewayIntentBits.Guilds,

        // Privileged Gateway Intents
        // Privileged Gateway Intents must also be enabled in the discord app bot config:
        // https://discord.com/developers/applications/1312896264475508839/bot
        // No Privileged Gateway Intents are required.
    ],
});

//Add status when client is ready
client.on('ready', () => {
   client.user?.setActivity(config.satus.text, { type: ActivityType.Watching });
});

// Returns the interval between hot drop deployments.
// In strike mode this servers as the time until the strike begins.
export async function getDeploymentInterval() {
    return Duration.fromMillis(Number(await fs.readFile("./deploymentTime.txt", "utf-8")));
};

export async function setDeploymentInterval(deploymentInterval: Duration) {
    await fs.writeFile("./deploymentTime.txt", deploymentInterval.toMillis().toString(), "utf-8");

    registerStartQueuedGameInterval(deploymentInterval);
};

if (database.isInitialized) {
    log('Successfully connected to the database', 'Startup');
}

importAllTheThings(client);
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
