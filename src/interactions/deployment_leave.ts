import { ButtonInteraction } from "discord.js";
import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { DeploymentManager, formatDeployment } from "../utils/deployments.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { deferReply, editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { error, success } from "../utils/logger.js";

export const DeploymentLeaveButton = new Button({
    id: "leaveDeployment",
    cooldown: Duration.fromDurationLike({ seconds: 0 }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<"cached"> }) {
        if (!await deferReply(interaction)) { return; }

        const newDetails = await DeploymentManager.get().leave(interaction.member.id, interaction.message.id);
        if (newDetails instanceof Error) {
            await editReplyWithError(interaction, newDetails.message);
            return;
        }

        const embed = buildDeploymentEmbed(newDetails);
        try {
            await interaction.message.edit({ embeds: [embed] });
        } catch (e: any) {
            error(e);
            await editReplyWithError(interaction, "Failed to update the deployment message. Your signup was removed.");
            return;
        }

        await editReplyWithSuccess(interaction, 'You left the deployment');
        success(`User: ${formatMemberForLog(interaction.member)} left deployment: ${formatDeployment(newDetails)}`, 'Deployment');
    }
});
