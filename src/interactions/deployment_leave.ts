import { ButtonInteraction, Colors } from "discord.js";
import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { DeploymentManager } from "../utils/deployments.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { error, success } from "../utils/logger.js";

export const DeploymentLeaveButton = new Button({
    id: "leaveDeployment",
    cooldown: Duration.fromDurationLike({ seconds: 0 }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<"cached"> }) {
        await interaction.deferReply({ ephemeral: true });

        const newDetails = await DeploymentManager.get().leave(interaction.member.id, interaction.message.id);
        if (newDetails instanceof Error) {
            await editReplyWithError(interaction, newDetails.message);
            return;
        }

        const embed = buildDeploymentEmbed(newDetails, Colors.Green, /*started=*/false);
        try {
            await interaction.message.edit({ embeds: [embed] });
        } catch (e: any) {
            error(e);
            await editReplyWithError(interaction, "Failed to update the deployment message. Your signup was removed.");
            return;
        }

        await editReplyWithSuccess(interaction, 'You left the deployment');
        success(`User: ${formatMemberForLog(interaction.member)} left deployment: ${newDetails.title}; ID: ${newDetails.id}; Message: ${newDetails.message.id}`);
    }
});
