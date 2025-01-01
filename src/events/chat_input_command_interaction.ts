import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { error, log } from "../utils/logger.js";
import { checkBlacklist, hasRequiredPermissions, hasRequiredRoles } from "../utils/permissions.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
	callback: async function (interaction: ChatInputCommandInteraction) {
		const command = getSlashCommand(interaction.commandName);

		if (await checkBlacklist(interaction, command.blacklistedRoles)) return;
		if (!(await hasRequiredRoles(interaction, command.requiredRoles))) return;
		if (!(await hasRequiredPermissions(interaction, command.permissions))) return;

		const commandStr = `/${interaction.commandName} ${interaction.options.data.map(o => `${o.name}: ${o.value}`).join(', ')}`;
		const nickname = interaction.member instanceof GuildMember ? interaction.member.nickname : interaction.member.nick;
		const logStr = `${commandStr}; Guild: ${interaction.guild.name}(${interaction.guild.id}); User: ${nickname}(${interaction.user.displayName}/${interaction.user.username}/${interaction.user.id}); ID: ${interaction.id}`;
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
