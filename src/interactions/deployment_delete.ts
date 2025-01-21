import { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import { DateTime, Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { buildInfoEmbed } from "../embeds/embed.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { DeploymentDetails, deploymentToDetails, formatRoleEmoji, parseRole } from "../utils/deployments.js";
import { sendDmToUser } from "../utils/dm.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { sendEmbedToLogChannel, sendErrorToLogChannel } from "../utils/log_channel.js";
import { success } from "../utils/logger.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";

export const DeploymentDeleteButton = new Button({
    id: "deleteDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<'cached'> }) {
        await interaction.deferReply({ ephemeral: true });
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            await editReplyWithError(interaction, "Deployment not found");
            return;
        }

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!(isAdmin || deployment.user == interaction.user.id)) {
            await editReplyWithError(interaction, "You do not have permission to delete this deployment");
            return;
        }

        const client = interaction.client;
        let oldDetails: DeploymentDetails = null;
        try {
            const signups = (await Signups.find({ where: { deploymentId: deployment.id } }));
            const backups = (await Backups.find({ where: { deploymentId: deployment.id } }));
            oldDetails = await deploymentToDetails(client, deployment, signups, backups);
            const deploymentTime = DateTime.fromMillis(Number(deployment.startTime));
            const timeToDeployment = deploymentTime.diff(DateTime.now(), 'minutes').shiftTo('days', 'hours', 'minutes');

            await Promise.all((signups as (Signups | Backups)[]).concat(backups).map(async player => {
                const user = await client.users.fetch(player.userId);
                const embed = _buildDeploymentDeletedConfirmationEmbed(deployment.title, timeToDeployment);
                await sendDmToUser(user, { embeds: [embed] });
            }));

            const embed = _buildDeploymentDeletedConfirmationEmbedForLog(deployment, signups, backups);
            await sendEmbedToLogChannel(embed, client);
        } catch (e) {
            await sendErrorToLogChannel(e, client);
        }


        await deployment.remove();

        await editReplyWithSuccess(interaction, "Deployment deleted successfully");

        await interaction.message.delete();

        success(`User: ${formatMemberForLog(interaction.member)} deleted Deployment: ${oldDetails.title}; Message: ${oldDetails.message.id}; ID: ${oldDetails.id}`);
    }
});

function _buildDeploymentDeletedConfirmationEmbed(deploymentTitle: string, timeToDeployment: Duration) {
    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(`A deployment you were signed up for has been deleted!\nDeployment Name: ${deploymentTitle}\n Scheduled to start in: ${timeToDeployment.toHuman()}`);
}

function _buildDeploymentDeletedConfirmationEmbedForLog(deployment: Deployment, signups: Signups[], backups: Backups[]) {
    const hostRoleEmoji = formatRoleEmoji(parseRole(signups.filter(player => player.userId == deployment.user).at(0).role));
    const description = `Title: ${deployment.title}\n`
        + `Channel: <#${deployment.channel}>\n`
        + `Start Time: ${DateTime.fromMillis(Number(deployment.startTime)).toISO()}\n`
        + `Host: ${hostRoleEmoji} <@${deployment.user}>\n`
        + `Fireteam: ${signups.filter(player => player.userId != deployment.user).map(player => `${formatRoleEmoji(parseRole(player.role))} <@${player.userId}>`).join(', ') || '` - `'}\n`
        + `Backups: ${backups.map(player => `${config.backupEmoji} <@${player.userId}>`).join(', ') || '` - `'}`;

    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(description);
}
