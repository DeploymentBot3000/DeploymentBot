// Package imports
import config from "./config.js";
import { error, log } from "./utils/logger.js";
import { Client, Collection, IntentsBitField, Partials, ActivityType } from "discord.js";

// Handlers & Database
import eventHandler from "./handlers/eventHandler.js";
import idkHowToCallThisHandler from "./handlers/interactionHandler.js";
import database from "./handlers/databaseHandler.js";

// Type imports
import Cooldown from "./classes/Cooldown.js";
import Slashcommand from "./classes/Slashcommand.js";
import SelectMenu from "./classes/SelectMenu.js";
import Button from "./classes/Button.js";
import Modal from "./classes/Modal.js";
import ContextMenu from "./classes/ContextMenu.js";
import Command from "./classes/Command.js";
import fs from "fs/promises";
import { startQueuedGame } from "./utils/startQueuedGame.js";

// Define a new class that extends Client
class CustomClient extends Client {
    commands: Collection<String, Command> = new Collection();
    cooldowns: Collection<String, Cooldown> = new Collection();
    slashCommands: Collection<String, Slashcommand> = new Collection();
    selectMenus: Collection<String, SelectMenu> = new Collection();
    modals: Collection<String, Modal> = new Collection();
    contextMenus: Collection<String, ContextMenu> = new Collection();
    buttons: Collection<String, Button> = new Collection();
    queueJoinTimes: Collection<String, Date> = new Collection<String, Date>();
    battalionStrikeMode: boolean = false;
    nextGame: Date;
    interval: NodeJS.Timeout;
}

// Initialize the extended client
export const client = new CustomClient({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildVoiceStates],
    partials: [Partials.Message, Partials.GuildMember, Partials.Channel, Partials.Reaction, Partials.User]
});

//Add status when client is ready
client.on('ready', () => {
   client.user?.setActivity(config.satus.text, { type: ActivityType.Watching });
});

export const getDeploymentTime = async () => {
    const deploymentTime = await fs.readFile("./deploymentTime.txt", "utf-8");
    return Number(deploymentTime);
};

export const setDeploymentTime = async (time: string) => {
    await fs.writeFile("./deploymentTime.txt", time, "utf-8");

    clearInterval(client.interval);

    client.interval = setInterval(() => {
        startQueuedGame(Number(time));
    }, Number(time));
};

if (database.isInitialized) log("Successfully connected to the database");
idkHowToCallThisHandler.init();
eventHandler.function();

// Catching all the errors
process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);

client.login(config.token);
