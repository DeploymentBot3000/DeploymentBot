import { AutocompleteInteraction } from "discord.js";
import Command from "../classes/Command.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
    callback: async function (interaction: AutocompleteInteraction) {
        const command = getSlashCommand(interaction.commandName);
        if (command.autocomplete) {
            if (command instanceof Command) {
                await command.autocomplete({ interaction });
            } else {
                await command.autocomplete(interaction);
            }
        }
    }
}
