import { AutocompleteInteraction } from "discord.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
    callback: async function (interaction: AutocompleteInteraction) {
        const command = getSlashCommand(interaction.commandName);
        if (command.autocomplete) {
            command.autocomplete({ interaction });
        }
    }
}
