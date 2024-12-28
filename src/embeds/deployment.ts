import { ColorResolvable, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import config from "../config.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";
import { buildEmbed } from "./embed.js";


export async function buildDeploymentEmbedFromDb(deployment: Deployment, color: ColorResolvable, started: boolean) {
    const signups = await Signups.find({ where: { deploymentId: deployment.id } });
    const backups = await Backups.find({ where: { deploymentId: deployment.id } });
    return buildDeploymentEmbed(deployment, signups, backups, color, started);
}

export function buildDeploymentEmbed(deployment: Deployment, signups: Signups[], backups: Backups[], color: ColorResolvable, started: boolean) {
    console.log('Building deployment embed with color:', color);

    const googleCalendarLink = getGoogleCalendarLink(deployment.title, deployment.description, deployment.startTime, deployment.endTime);

    const startTime = DateTime.fromMillis(Number(deployment.startTime));
    const endtTime = DateTime.fromMillis(Number(deployment.endTime));

    return new EmbedBuilder()
        .setTitle(`Operation: ${deployment.title}${started ? ' - Started' : ''}`)
        .addFields([
            {
                name: "Deployment Details:",
                value: `📅 ${formatDiscordTime(startTime, DiscordTimestampFormat.SHORT_DATE)} - [Calendar](${googleCalendarLink})\n
🕒 ${formatDiscordTime(startTime, DiscordTimestampFormat.SHORT_TIME)} - ${formatDiscordTime(endtTime, DiscordTimestampFormat.SHORT_TIME)}\n
🪖 ${deployment.difficulty}`
            },
            {
                name: "Description:",
                value: deployment.description
            },
            {
                name: "Signups:",
                value: signups.map(signup => {
                    const role = config.roles.find(role => role.name === signup.role);
                    return `${role.emoji} <@${signup.userId}>`;
                }).join("\n") || "` - `",
                inline: true
            },
            {
                name: "Backups:",
                value: backups.map(backup => `${config.backupEmoji} <@${backup.userId}>`).join("\n") || "` - `",
                inline: true
            }
        ])
        .setColor(color)
        .setFooter({ text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4` })
        .setTimestamp(Number(deployment.startTime));
} export function buildPanelEmbed() {
    return buildEmbed(config.embeds.panel);
}

