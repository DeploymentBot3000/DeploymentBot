import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";

export default new Button({
    id: "leaveDeployment",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function({ interaction }) {
        try {
            // Fetch the member to ensure they still exist in the guild
            const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to fetch your member data. Please try again.");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

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

            // Add error handling for database operations
            try {
                if (existingSignup) await existingSignup.remove();
                if (existingBackup) await existingBackup.remove();
            } catch (error) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to remove you from the deployment. Please try again.");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

            // Add error handling for message edit
            try {
                await interaction.message.edit({ embeds: [embed] });
            } catch (error) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to update the deployment message. Your signup was removed.");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await interaction.update({});
        } catch (error) {
            console.error('Error in leaveDeployment button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred. Please try again later.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
}) 