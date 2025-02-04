import { ColorResolvable, Colors, EmbedBuilder } from "discord.js";
import { config } from "../config.js";
import { DeploymentDetails, formatRoleEmoji } from "../utils/deployments.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";
import { buildEmbed } from "./embed.js";

export function buildDeploymentEmbed(details: DeploymentDetails) {
    let color: ColorResolvable = Colors.Green;
    if (details.started) {
        color = Colors.Red;
    } else if (details.noticeSent) {
        color = Colors.Yellow;
    }

    const googleCalendarLink = getGoogleCalendarLink(details.title, details.description, details.startTime.toMillis(), details.endTime.toMillis());

    return new EmbedBuilder()
        .setTitle(`Operation: ${details.title}${details.started ? ' - Started' : ''}`)
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
                value: details.signups.map(s => `${formatRoleEmoji(s.role)} ${s.guildMember.displayName}`).join("\n") || "` - `",
                inline: true
            },
            {
                name: "Backups:",
                value: details.backups.map(b => `${config.backupEmoji} ${b.guildMember.displayName}`).join("\n") || "` - `",
                inline: true
            },
            {
                name: ' ',
                value: ' ',
            },
            {
                name: ' ',
                value: `||${details.signups.map(s => `<@${s.guildMember.id}>`).join("\n")} ||`,
                inline: true
            },
            {
                name: ' ',
                value: `||${details.backups.map(b => `<@${b.guildMember.id}>`).join("\n")} ||`,
                inline: true
            },
        ])
        .setColor(color)
        .setFooter({ text: `Sign ups: ${details.signups.length}/4 ~ Backups: ${details.backups.length}/4` })
        .setTimestamp(details.startTime.toMillis());
}

export function buildPanelEmbed() {
    return buildEmbed(config.embeds.panel);
}
