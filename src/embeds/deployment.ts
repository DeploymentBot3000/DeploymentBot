import { ColorResolvable, EmbedBuilder } from "discord.js";
import { config } from "../config.js";
import { DeploymentDetails, formatRoleEmoji } from "../utils/deployments.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";
import { buildEmbed } from "./embed.js";

export function buildDeploymentEmbed(details: DeploymentDetails, color: ColorResolvable, started: boolean) {
    const googleCalendarLink = getGoogleCalendarLink(details.title, details.description, details.startTime.toMillis(), details.endTime.toMillis());

    return new EmbedBuilder()
        .setTitle(`Operation: ${details.title}${started ? ' - Started' : ''}`)
        .addFields([
            {
                name: "Deployment Details:",
                value: `📅 ${formatDiscordTime(details.startTime, DiscordTimestampFormat.SHORT_DATE)} - [Calendar](${googleCalendarLink})\n
🕒 ${formatDiscordTime(details.startTime, DiscordTimestampFormat.SHORT_TIME)} - ${formatDiscordTime(details.endTime, DiscordTimestampFormat.SHORT_TIME)}\n
❗ ${details.difficulty}`
            },
            {
                name: "Description:",
                value: details.description
            },
            {
                name: "Signups:",
                value: details.signups.map(signup => {
                    return `${formatRoleEmoji(signup.role)} <@${signup.guildMember.user.id}>`;
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
