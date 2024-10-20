import colors from "colors";
import { error, log } from "../../utils/logger.js";
import { client } from "../../index.js";
import config from "../../config.js";
import { Message, PermissionsBitField, PermissionsString } from "discord.js";
import { buildEmbed } from "../../utils/configBuilders.js";
import Cooldown from "../../classes/Cooldown.js";

export default {
	name: "messageCreate",
	once: false,
	function: async function (message: Message) {
		if (!config.prefix || message.author.bot || !message.content.startsWith(config.prefix)) return;

		const args = message.content.slice(config.prefix.length).split(/ +/);
		const cmd = args.shift()?.toLowerCase();
		if (!cmd) return;

		const command = client.commands.get(cmd) || client.commands.find((a: any) => a.aliases && a.aliases.includes(cmd));
		if (!command) return;

		if (command.permissions) {
			if (!message.inGuild()) {
				const embed = buildEmbed({ preset: "error" })
					.setDescription(":x: **This command can only be used in a server!**");

				const msg = await message.reply({ embeds: [embed] });
				await message.delete();

				return setTimeout(() => msg.delete(), 5000);
			}

			const invalidPerms: PermissionsString[] = [];
			const memberPerms: PermissionsBitField = message.member!.permissions as PermissionsBitField;
			for (const perm of command.permissions) {
				if (!memberPerms.has(perm)) invalidPerms.push(perm);
			}
			if (invalidPerms.length) {
				const embed = buildEmbed({ preset: "error" })
					.setTitle("Missing Permissions")
					.setDescription(`You are missing the following permissions:\n${invalidPerms.map(p => `- ${p}`).join("\n")}`);

				const msg = await message.reply({ embeds: [embed] });
				await message.delete();

				return setTimeout(() => msg.delete(), 5000);
			}
		}

		if (command.requiredRoles?.length) {
			if (!message.inGuild()) {
				const embed = buildEmbed({ preset: "error" })
					.setDescription(":x: **This command can only be used in a server!**");

				const msg = await message.reply({ embeds: [embed] });
				await message.delete();

				return setTimeout(() => msg.delete(), 5000);
			}

			for (const role of command.requiredRoles) {
				const roleObj = message.guild!.roles.cache.find(r => r.id === role.role || r.name === role.role) || await message.guild!.roles.fetch(role.role).catch(() => null);
				if (!roleObj) {
					const msg = await message.reply({ content: `:x: **The role \`${role.role}\` does not exist!**` });
					await message.delete();

					return setTimeout(() => msg.delete(), 5000);
				}
				if (role.required && !message.member.roles.cache.has(roleObj.id)) {
					const msg = await message.reply({ content: `:x: **You don't have the required role ${roleObj.name}!**` });
					await message.delete();

					return setTimeout(() => msg.delete(), 5000);
				}
				if (!role.required && message.member.roles.highest.comparePositionTo(roleObj) < 0) {
					const msg = await message.reply({ content: `:x: **You don't have the required role ${roleObj.name}!**` });
					await message.delete();

					return setTimeout(() => msg.delete(), 5000);
				}
			}
		}

		const existingCooldown = client.cooldowns.get(`${message.author.id}-${command.name}`);

		if (existingCooldown && !existingCooldown.isExpired()) {
			const cooldownEmbed = buildEmbed({ name: "cooldown", preset: "error", placeholders: { timestamp: `<t:${Math.round(existingCooldown.getRemainingTime() / 1000)}:R>` } });

			const msg = await message.reply({ embeds: [cooldownEmbed] });
			await message.delete();

			return setTimeout(() => msg.delete(), 5000);
		}

		try {
			command.function({ message, args });
			log(`[Command Ran] ${command.name} ${colors.blue("||")} Author: ${message.author.username} ${colors.blue("||")} ID: ${message.author.id} ${colors.blue("||")} Server: ${message.guild?.name || "DM"}`);
		} catch (e) {
			error(`[Command Error] ${command.name} ${colors.blue("||")} Author: ${message.author.username} ${colors.blue("||")} ID: ${message.author.id} ${colors.blue("||")} Server: ${message.guild?.name || "DM"} ${colors.red("||")} ${e}`);
			error(e);

			const embed = buildEmbed({ preset: "error" })
				.setDescription(":x: **An error occurred while executing this command!**");

			const msg = await message.reply({ embeds: [embed] });
			await message.delete();

			setTimeout(() => msg.delete(), 5000);
		}

		if (command.cooldown) {
			if (!message.inGuild() || !message.member!.permissions.has(PermissionsBitField.Flags.Administrator)) {
				client.cooldowns.set(`${message.author.id}-${command.name}`, new Cooldown(`${message.author.id}-${command.name}`, command.cooldown));
			}
		}
	},
};
