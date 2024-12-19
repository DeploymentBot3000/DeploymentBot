import { error, log } from "../utils/logger.js";
import { Interaction, GuildMember, InteractionType, PermissionsBitField } from "discord.js";
import { client } from "../custom_client.js";
import Cooldown from "../classes/Cooldown.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import checkBlacklist from "../utils/interaction/checkBlacklist.js";
import hasRequiredRoles from "../utils/interaction/hasRequiredRoles.js";
import hasRequiredPermissions from "../utils/interaction/hasRequiredPermissions.js";
import checkCooldowns from "../utils/interaction/checkCooldown.js";
import { getSlashCommand } from "../utils/slash_commands_registery.js";

export default {
	name: "interactionCreate",
	function: async function (interaction: Interaction) {
		if (interaction.type !== InteractionType.ApplicationCommand) return;
		if (!interaction.isChatInputCommand()) return;

		const command = getSlashCommand(interaction.commandName);
		if (!command) return;

		if (await checkBlacklist(interaction, command.blacklistedRoles)) return;
		if (!(await hasRequiredRoles(interaction, command.requiredRoles))) return;
		if (!(await hasRequiredPermissions(interaction, command.permissions))) return;
		if (await checkCooldowns(interaction, client.cooldowns.get(`${interaction.user.id}-${command.name}`))) return;

		const commandStr = `/${interaction.commandName} ${interaction.options.data.map(o => `${o.name}: ${o.value}`).join(', ')}`;
		const nickname = interaction.member instanceof GuildMember ? interaction.member.nickname : interaction.member.nick;
		const logStr = `${commandStr}; Guild: ${interaction.guild.name}(${interaction.guild.id}); User: ${nickname}(${interaction.user.displayName}/${interaction.user.username}/${interaction.user.id}); ID: ${interaction.id}`;
		try {
			log(`Running: ${logStr}`, 'Command');
			command.function({ interaction, options: interaction.options });
			log(`Done: ${logStr}`, 'Command');
		} catch (e) {
			error(`Failed: ${logStr}`, 'Command');
			error(e);

			const embed = buildEmbed({ preset: "error" })
				.setDescription(`❌ **An error occurred while executing this command!**\n\nCommand: ${commandStr}`);

			await interaction.reply({ embeds: [embed], ephemeral: true });
		}

		if (command.cooldown) {
			if (!interaction.inCachedGuild() || !interaction.member!.permissions.has(PermissionsBitField.Flags.Administrator)) {
				client.cooldowns.set(`${interaction.user.id}-${command.name}`, new Cooldown(`${interaction.user.id}-${command.name}`, command.cooldown));
			}
		}
	},
};