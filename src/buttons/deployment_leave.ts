import { Colors } from "discord.js";
import { Duration } from "luxon";
import config from "../config.js";
import { deprecated_buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Button from "./button.js";

export default new Button({
    id: "leaveDeployment",
    cooldown: Duration.fromDurationLike({ seconds: 0 }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        try {
            // Fetch the member to ensure they still exist in the guild
            const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null as null);
            if (!member) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("Failed to fetch your member data. Please try again.");
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

            if (!deployment) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("Deployment not found");

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            if (deployment.user === interaction.user.id) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("You cannot leave your own deployment!");

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
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
                const errorEmbed = buildErrorEmbed()
                    .setDescription("You are not signed up for this deployment!");

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Add error handling for database operations
            try {
                if (existingSignup) await existingSignup.remove();
                if (existingBackup) await existingBackup.remove();
            } catch (error) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("Failed to remove you from the deployment. Please try again.");
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const embed = await deprecated_buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);

            // Add error handling for message edit
            try {
                await interaction.message.edit({ embeds: [embed] });
            } catch (error) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("Failed to update the deployment message. Your signup was removed.");
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            await interaction.update({});
        } catch (error) {
            console.error('Error in leaveDeployment button:', error);
            const errorEmbed = buildErrorEmbed()
                .setDescription("An unexpected error occurred. Please try again later.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => { });
        }
    }
}) 