import { ColorResolvable, EmbedBuilder } from "discord.js";
import config from "../config.js";
import { client } from "../custom_client.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { DeploymentDetails, deploymentToDetails } from "../utils/deployments.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";
import { buildEmbed } from "./embed.js";

/**
 * @deprecated Use `buildDeploymentEmbedV2()` instead.
 */
export async function deprecated_buildDeploymentEmbedFromDb(deployment: Deployment, color: ColorResolvable, started: boolean) {
    const signups = Signups.find({ where: { deploymentId: deployment.id } });
    const backups = Backups.find({ where: { deploymentId: deployment.id } });
    const details = await deploymentToDetails(client, deployment, await signups, await backups);
    return buildDeploymentEmbed(details, color, started);
}

export function buildDeploymentEmbed(details: DeploymentDetails, color: ColorResolvable, started: boolean) {
    console.log('Building deployment embed with color:', color);

    const googleCalendarLink = getGoogleCalendarLink(details.title, details.description, details.startTime.toMillis(), details.endTime.toMillis());

    return new EmbedBuilder()
        .setTitle(`Operation: ${details.title}${started ? ' - Started' : ''}`)
        .addFields([
            {
                name: "Deployment Details:",
                value: `📅 ${formatDiscordTime(details.startTime, DiscordTimestampFormat.SHORT_DATE)} - [Calendar](${googleCalendarLink})\n
🕒 ${formatDiscordTime(details.startTime, DiscordTimestampFormat.SHORT_TIME)} - ${formatDiscordTime(details.endTime, DiscordTimestampFormat.SHORT_TIME)}\n
🪖 ${details.difficulty}`
            },
            {
                name: "Description:",
                value: details.description
            },
            {
                name: "Signups:",
                value: details.signups.map(signup => {
                    const role = config.roles.find(role => role.name === signup.role);
                    return `${role.emoji} <@${signup.guildMember.user.id}>`;
                }).join("\n") || "` - `",
                inline: true
            },
            {
                name: "Backups:",
                value: details.backups.map(backup => `${config.backupEmoji} <@${backup.guildMember.user.id}>`).join("\n") || "` - `",
                inline: true
            }
        ])
        .setColor(color)
        .setFooter({ text: `Sign ups: ${details.signups.length}/4 ~ Backups: ${details.backups.length}/4` })
        .setTimestamp(details.startTime.toMillis());
}

export function buildPanelEmbed() {
    return buildEmbed(config.embeds.panel);
}
