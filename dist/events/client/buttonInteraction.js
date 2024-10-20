import colors from "colors";
import { error, log } from "../../utils/logger.js";
import { client } from "../../index.js";
import { buildEmbed } from "../../utils/configBuilders.js";
import Cooldown from "../../classes/Cooldown.js";
export default {
    name: "interactionCreate",
    once: false,
    function: async function (interaction) {
        if (!interaction.isButton())
            return;
        const button = client.buttons.get(interaction.customId) || client.buttons.get(interaction.customId.split("-")[0]);
        if (!button)
            return;
        const existingCooldown = client.cooldowns.get(`${interaction.user.id}-${button.id}`);
        if (existingCooldown && !existingCooldown.isExpired()) {
            const cooldownEmbed = buildEmbed({ name: "cooldown", preset: "error", placeholders: { timestamp: `<t:${Math.round(existingCooldown.getRemainingTime() / 1000)}:R>` } });
            return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
        if (button.permissions.length) {
            if (!interaction.inCachedGuild()) {
                const embed = buildEmbed({ preset: "error" })
                    .setDescription(":x: **This command can only be used in a server!**");
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const invalidPerms = [];
            const memberPerms = interaction.member.permissions;
            for (const perm of button.permissions) {
                if (!memberPerms.has(perm))
                    invalidPerms.push(perm);
            }
            if (invalidPerms.length) {
                const embed = buildEmbed({ preset: "error" })
                    .setTitle("Missing Permissions")
                    .setDescription(`You are missing the following permissions:\n${invalidPerms.map(p => `- ${p}`).join("\n")}`);
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        if (button.requiredRoles.length) {
            if (!interaction.inCachedGuild()) {
                const embed = buildEmbed({ preset: "error" })
                    .setDescription(":x: **This command can only be used in a server!**");
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            for (const role of button.requiredRoles) {
                const roleObj = interaction.guild.roles.cache.find(r => r.id === role.role || r.name === role.role) || await interaction.guild.roles.fetch(role.role).catch(() => null);
                if (!roleObj)
                    return interaction.reply({ content: `:x: **The role \`${role.role}\` does not exist!**`, ephemeral: true });
                if (role.required && !interaction.member.roles.cache.has(roleObj.id))
                    return interaction.reply({ content: `:x: **You don't have the required role ${roleObj.name}!**`, ephemeral: true });
                if (!role.required && interaction.member.roles.highest.comparePositionTo(roleObj) < 0)
                    return interaction.reply({ content: `:x: **You don't have the required role ${roleObj.name}!**`, ephemeral: true });
            }
        }
        try {
            log(`[Button Clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
            button.function({ interaction });
        }
        catch (e) {
            error(`[Button Error] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
            error(e);
            const embed = buildEmbed({ preset: "error" })
                .setDescription(":x: **An error occurred while executing this command!**");
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        if (button.cooldown) {
            client.cooldowns.set(`${interaction.user.id}-${button.id}`, new Cooldown(`${interaction.user.id}-${button.id}`, button.cooldown));
        }
    },
};
