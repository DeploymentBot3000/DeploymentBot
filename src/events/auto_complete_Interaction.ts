import { Interaction } from "discord.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
    name: "interactionCreate",
    callback: async function (interaction: Interaction) {
        if (!interaction.isAutocomplete()) return;

        const command = getSlashCommand(interaction.commandName);
        if (!command) return;

        if (command.autocomplete) command.autocomplete({ interaction });
    }
}
