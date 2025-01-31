import { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import { DateTime, Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { buildInfoEmbed } from "../embeds/embed.js";
import { DeploymentDetails, DeploymentManager, formatDeployment, formatRoleEmoji } from "../utils/deployments.js";
import { sendDmToUser } from "../utils/dm.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { deferReply, editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { sendEmbedToLogChannel } from "../utils/log_channel.js";
import { success } from "../utils/logger.js";

export const DeploymentDeleteButton = new Button({
    id: "deleteDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<'cached'> }) {
        if (!await deferReply(interaction)) { return; }

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const oldDetails = await DeploymentManager.get().delete(interaction.member.id, interaction.message.id, isAdmin);
        if (oldDetails instanceof Error) {
            await editReplyWithError(interaction, oldDetails.message);
            return;
        }

        await interaction.message.delete();

        const timeToDeployment = oldDetails.startTime.diff(DateTime.now(), 'minutes').shiftTo('days', 'hours', 'minutes');
        let embed = _buildDeploymentDeletedConfirmationEmbed(oldDetails.title, timeToDeployment);

        await Promise.all(oldDetails.signups
            .map(s => s.guildMember.user)
            .concat(oldDetails.backups.map(b => b.guildMember.user))
            .map(async user => {
                await sendDmToUser(user, { embeds: [embed] });
            }));

        embed = _buildDeploymentDeletedConfirmationEmbedForLog(oldDetails);
        await sendEmbedToLogChannel(embed, interaction.client);

        await editReplyWithSuccess(interaction, "Deployment deleted successfully");
        success(`User: ${formatMemberForLog(interaction.member)} deleted Deployment: ${formatDeployment(oldDetails)}`);
    }
});

function _buildDeploymentDeletedConfirmationEmbed(deploymentTitle: string, timeToDeployment: Duration) {
    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(`A deployment you were signed up for has been deleted!\nDeployment Name: ${deploymentTitle}\n Scheduled to start in: ${timeToDeployment.toHuman()}`);
}

function _buildDeploymentDeletedConfirmationEmbedForLog(deployment: DeploymentDetails) {
    const host = deployment.signups.filter(s => s.guildMember.id == deployment.host.guildMember.id).at(0);
    const fireteam = deployment.signups.filter(s => s.guildMember.id != host.guildMember.id);
    const description = `Title: ${deployment.title}\n`
        + `Channel: <#${deployment.channel}>\n`
        + `Start Time: ${deployment.startTime.toISO()}\n`
        + `Host: ${formatRoleEmoji(host.role)} <@${host.guildMember.id}>\n`
        + `Fireteam: ${fireteam.map(f => `${formatRoleEmoji(f.role)} <@${f.guildMember.id}>`).join(', ') || '` - `'}\n`
        + `Backups: ${deployment.backups.map(b => `${config.backupEmoji} <@${b.guildMember.id}>`).join(', ') || '` - `'}`;

    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(description);
}
