import { ChatInputCommandInteraction } from "discord.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { error, success, verbose } from "../utils/logger.js";
import { checkPermissions } from "../utils/permissions.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
	callback: async function (interaction: ChatInputCommandInteraction<'cached'>) {
		const command = getSlashCommand(interaction.commandName);

		const e = await checkPermissions(interaction.member, command.permissions);
		if (e) {
			await replyWithError(interaction, e.message);
			return;
		}

		const commandStr = `/${interaction.commandName} ${interaction.options.data.map(o => `${o.name}: ${o.value}`).join(', ')}`;
		try {
			verbose(`Running: ${commandStr}`, 'Command');
			await command.callback({ interaction, options: interaction.options });
			success(`Done: ${commandStr}`, 'Command');
		} catch (e) {
			error(`Failed: ${commandStr}`, 'Command');
			error(e);
			await replyWithError(interaction, `❌ **An error occurred while executing this command!**\n\nCommand: ${commandStr}`);
		}
	},
}
