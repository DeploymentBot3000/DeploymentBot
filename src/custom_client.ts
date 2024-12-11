import { Client, Collection, GatewayIntentBits } from "discord.js";
import Command from "./classes/Command.js";
import Slashcommand from "./classes/Slashcommand.js";
import SelectMenu from "./classes/SelectMenu.js";
import Modal from "./classes/Modal.js";
import Button from "./classes/Button.js";
import Cooldown from "./classes/Cooldown.js";

// Define a new class that extends Client
export class CustomClient extends Client {
    commands: Collection<String, Command> = new Collection();
    cooldowns: Collection<String, Cooldown> = new Collection();
    slashCommands: Collection<String, Slashcommand> = new Collection();
    selectMenus: Collection<String, SelectMenu> = new Collection();
    modals: Collection<String, Modal> = new Collection();
    buttons: Collection<String, Button> = new Collection();
    queueJoinTimes: Collection<String, Date> = new Collection<String, Date>();
    battalionStrikeMode: boolean = false;
    nextGame: Date;
}

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
