import { Client, Collection } from "discord.js";
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
