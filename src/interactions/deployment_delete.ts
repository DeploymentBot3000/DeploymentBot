import { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import { DateTime, Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { sendDmToUser } from "../utils/dm.js";
import { sendEmbedToLogChannel, sendErrorToLogChannel } from "../utils/log_channel.js";

export const DeploymentDeleteButton = new Button({
    id: "deleteDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<'cached'> }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildErrorEmbed()
                .setDescription("Deployment not found");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!(isAdmin || deployment.user == interaction.user.id)) {
            const errorEmbed = buildErrorEmbed()
                .setDescription("You do not have permission to delete this deployment");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const client = interaction.client;
        try {
            const signups = (await Signups.find({ where: { deploymentId: deployment.id } }));
            const backups = (await Backups.find({ where: { deploymentId: deployment.id } }));
            const deploymentTime = DateTime.fromMillis(Number(deployment.startTime));
            const timeToDeployment = deploymentTime.diff(DateTime.now(), 'minutes').shiftTo('days', 'hours', 'minutes');

            await Promise.all((signups as (Signups | Backups)[]).concat(backups).map(async player => {
                const user = await client.users.fetch(player.userId);
                const embed = _buildDeploymentDeletedConfirmationEmbed(deployment.title, timeToDeployment);
                await sendDmToUser(user, { embeds: [embed] });
            }));

            const embed = _buildDeploymentDeletedConfirmationEmbedForLog(deployment, signups, backups);
            sendEmbedToLogChannel(embed, client);
        } catch (e) {
            sendErrorToLogChannel(e, client);
        }


        await deployment.remove();

        const successEmbed = buildSuccessEmbed()
            .setDescription("Deployment deleted successfully");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        await interaction.message.delete();
    }
});

function _buildDeploymentDeletedConfirmationEmbed(deploymentTitle: string, timeToDeployment: Duration) {
    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(`A deployment you were signed up for has been deleted!\nDeployment Name: ${deploymentTitle}\n Scheduled to start in: ${timeToDeployment.toHuman()}`);
}

function _getRoleEmoji(roleName: string) {
    return config.roles.find(role => role.name === roleName).emoji;
}

function _buildDeploymentDeletedConfirmationEmbedForLog(deployment: Deployment, signups: Signups[], backups: Backups[]) {
    const hostRoleEmoji = _getRoleEmoji(signups.filter(player => player.userId == deployment.user).at(0).role);
    const description = `Title: ${deployment.title}\n`
        + `Channel: <#${deployment.channel}>\n`
        + `Start Time: ${DateTime.fromMillis(Number(deployment.startTime)).toISO()}\n`
        + `Host: ${hostRoleEmoji} <@${deployment.user}>\n`
        + `Fireteam: ${signups.filter(player => player.userId != deployment.user).map(player => `${_getRoleEmoji(player.role)} <@${player.userId}>`).join(', ') || '` - `'}\n`
        + `Backups: ${backups.map(player => `${config.backupEmoji} <@${player.userId}>`).join(', ') || '` - `'}`;

    return buildInfoEmbed()
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(description);
}
