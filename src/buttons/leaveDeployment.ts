import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { EmbedBuilder } from "discord.js";
import config from "../config.js";

export default new Button({
    id: "leaveDeployment",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user === interaction.user.id) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You cannot leave your own deployment!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const existingSignup = await Signups.findOne({ 
            where: { 
                deploymentId: deployment.id, 
                userId: interaction.user.id 
            } 
        });
        const existingBackup = await Backups.findOne({ 
            where: { 
                deploymentId: deployment.id, 
                userId: interaction.user.id 
            } 
        });

        if (!existingSignup && !existingBackup) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are not signed up for this deployment!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (existingSignup) await existingSignup.remove();
        if (existingBackup) await existingBackup.remove();

        // Update the embed
        const signups = await Signups.find({ where: { deploymentId: deployment.id } });
        const backups = await Backups.find({ where: { deploymentId: deployment.id } });

        const embed = new EmbedBuilder()
            .setTitle(deployment.title)
            .addFields([
                {
                    name: "Event Info:",
                    value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d>\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.endTime) / 1000)}:t>`
                },
                {
                    name: "Description:",
                    value: deployment.description
                },
                {
                    name: "Signups:",
                    value: signups.map(signup => {
                        const role = config.roles.find(role => role.name === signup.role);
                        return `${role.emoji} <@${signup.userId}>`;
                    }).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Backups:",
                    value: backups.length ?
                        backups.map(backup => `<@${backup.userId}>`).join("\n")
                        : "` - `",
                    inline: true
                }
            ])
            .setColor("Green")
            .setFooter({ text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4` })
            .setTimestamp(Number(deployment.startTime));

        await interaction.message.edit({ embeds: [embed] });

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("You have left the deployment");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
}) 