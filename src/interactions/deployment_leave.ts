import { Colors } from "discord.js";
import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { deprecated_buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";

export const DeploymentLeaveButton = new Button({
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
                await replyWithError(interaction, "Failed to fetch your member data. Please try again.");
                return;
            }

            const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

            if (!deployment) {
                await replyWithError(interaction, "Deployment not found");
                return;
            }

            if (deployment.user === interaction.user.id) {
                await replyWithError(interaction, "You cannot leave your own deployment!");
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
                await replyWithError(interaction, "You are not signed up for this deployment!");
                return;
            }

            // Add error handling for database operations
            try {
                if (existingSignup) await existingSignup.remove();
                if (existingBackup) await existingBackup.remove();
            } catch (error) {
                await replyWithError(interaction, "Failed to remove you from the deployment. Please try again.");
                return;
            }

            const embed = await deprecated_buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);

            // Add error handling for message edit
            try {
                await interaction.message.edit({ embeds: [embed] });
            } catch (error) {
                await replyWithError(interaction, "Failed to update the deployment message. Your signup was removed.");
                return;
            }

            await interaction.update({});
            success(`User: ${formatMemberForLog(interaction.member)} left deployment: ${deployment.title}; ID: ${deployment.id}; Message: ${deployment.message}`);
        } catch (error) {
            console.error('Error in leaveDeployment button:', error);
            await replyWithError(interaction, "An unexpected error occurred. Please try again later.");
        }
    }
});
