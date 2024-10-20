// Package imports
import config from "./config.js";
import { error, log } from "./utils/logger.js";
import { Client, Collection, IntentsBitField, Partials } from "discord.js";
// Handlers & Database
import eventHandler from "./handlers/eventHandler.js";
import idkHowToCallThisHandler from "./handlers/interactionHandler.js";
import database from "./handlers/databaseHandler.js";
import fs from "fs";
import { startQueuedGame } from "./utils/startQueuedGame.js";
// Define a new class that extends Client
class CustomClient extends Client {
  commands = new Collection();
  cooldowns = new Collection();
  slashCommands = new Collection();
  selectMenus = new Collection();
  modals = new Collection();
  contextMenus = new Collection();
  buttons = new Collection();
  nextGame;
  interval;
}
// Initialize the extended client
export const client = new CustomClient({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.GuildMember,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
  ],
});

export const getDeploymentTime = () => {
  const deploymentTime = fs.readFileSync("./deploymentTime.txt", "utf-8");
  return Number(deploymentTime);
};
export const setDeploymentTime = (time) => {
  fs.writeFileSync("./deploymentTime.txt", time, "utf-8");
  client.interval.unref();
  client.interval = setInterval(startQueuedGame, Number(time));
};
if (database.isInitialized) log("Successfully connected to the database");
idkHowToCallThisHandler.init();
eventHandler.function();
// Catching all the errors
process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);
client.login(config.token);
