import { ChatInputCommandInteraction } from "discord.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { error, log } from "../utils/logger.js";
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
		const logStr = `${commandStr}; Guild: ${interaction.guild.name}(${interaction.guild.id}); User: ${interaction.member.nickname}(${interaction.user.displayName}/${interaction.user.username}/${interaction.user.id}); ID: ${interaction.id}`;
		try {
			log(`Running: ${logStr}`, 'Command');
			await command.callback({ interaction, options: interaction.options });
			log(`Done: ${logStr}`, 'Command');
		} catch (e) {
			error(`Failed: ${logStr}`, 'Command');
			error(e);

			const embed = buildErrorEmbed()
				.setDescription(`❌ **An error occurred while executing this command!**\n\nCommand: ${commandStr}`);

			await interaction.reply({ embeds: [embed], ephemeral: true });
		}
	},
}
