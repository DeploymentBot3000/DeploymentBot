import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { DateTime, Duration } from "luxon";
import { sendEmbedToLogChannel, sendErrorToLogChannel } from "../utils/log_channel.js";

function buildDeploymentDeletedConfirmationEmbed(deploymentTitle: string, timeToDeployment: Duration) {
    return buildEmbed({ preset: "info" })
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(`A deployment you were signed up for has been deleted!\nDeployment Name: ${deploymentTitle}\n Scheduled to start in: ${timeToDeployment.toHuman()}`);
}

function getRoleEmoji(roleName: string) {
    return config.roles.find(role => role.name === roleName).emoji;
}

function buildDeploymentDeletedConfirmationEmbedForLog(deployment: Deployment, signups: Signups[], backups: Backups[]) {
    const hostRoleEmoji = getRoleEmoji(signups.filter(player => player.userId == deployment.user).at(0).role);
    const description = `Title: ${deployment.title}\n`
        + `Channel: <#${deployment.channel}>\n`
        + `Start Time: ${DateTime.fromMillis(Number(deployment.startTime)).toISO()}\n`
        + `Host: ${hostRoleEmoji} <@${deployment.user}>\n`
        + `Fireteam: ${signups.filter(player => player.userId != deployment.user).map(player => `${getRoleEmoji(player.role)} <@${player.userId}>`).join(', ') || '` - `'}\n`
        + `Backups: ${backups.map(player => `${config.backupEmoji} <@${player.userId}>`).join(', ') || '` - `'}`;

    return buildEmbed({ preset: "info" })
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(description);
}


export default new Button({
    id: "deleteDeployment",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function ({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user !== interaction.user.id) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You do not have permission to delete this deployment");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const client = interaction.client;
        try {
            const signups = (await Signups.find({ where: { deploymentId: deployment.id } }));
            const backups = (await Backups.find({ where: { deploymentId: deployment.id } }));
            const deploymentTime = DateTime.fromMillis(Number(deployment.startTime));
            const timeToDeployment = deploymentTime.diff(DateTime.now(), 'minutes').shiftTo('days', 'hours', 'minutes');

            await Promise.all((signups as (Signups | Backups)[]).concat(backups).map(async player => {
                // Catch individial message failures so we don't interrupt the other messages from being sent.
                try {
                    const user = await client.users.fetch(player.userId);
                    const embed = buildDeploymentDeletedConfirmationEmbed(deployment.title, timeToDeployment);
                    await user.send({ embeds: [embed] });
                } catch (e) {
                    sendErrorToLogChannel(e, client);
                }

            }));

            const embed = buildDeploymentDeletedConfirmationEmbedForLog(deployment, signups, backups);
            sendEmbedToLogChannel(embed, client);
        } catch (e) {
            sendErrorToLogChannel(e, client);
        }


        await deployment.remove();

        const successEmbed = buildEmbed({ preset: "success" })
        .setDescription("Deployment deleted successfully");
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
        await interaction.message.delete();
    }
})