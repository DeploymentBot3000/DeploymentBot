import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import {ColorResolvable, EmbedBuilder, Guild} from "discord.js";
import getGoogleCalendarLink from "./getGoogleCalendarLink.js";


export async function buildDeploymentEmbed(
    deployment: InstanceType<typeof Deployment>, 
    guild: Guild | null | ColorResolvable, 
    color: ColorResolvable = "Green", 
    started: boolean = false
) {
    if (typeof guild === 'string' || typeof guild === 'number') {
        color = guild;
        guild = null;
    }

    console.log('Building deployment embed with color:', color);
    const signups = await Signups.find({ where: { deploymentId: deployment.id } });
    const backups = await Backups.find({ where: { deploymentId: deployment.id } });

    const googleCalendarLink = getGoogleCalendarLink(deployment.title, deployment.description, deployment.startTime, deployment.endTime);

    return new EmbedBuilder()
        .setTitle(started ? `<:hellpod:1302084726219210752> ${deployment.title} - Started <:hellpod:1302084726219210752>` : deployment.title)
        .addFields([
            {
                name: "Deployment Details:",
                value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d> - [Calendar](${googleCalendarLink})\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.endTime / 1000))}:t>\n🪖 ${deployment.difficulty}`
            },
            {
                name: "Description:",
                value: deployment.description
            },
            {
                name: "Signups:",
                value: await Promise.all(signups.map(async signup => {
                    const role = config.roles.find(role => role.name === signup.role);
                    let memberName = `Unknown Member (${signup.userId})`;
                    
                    if (guild && guild instanceof Guild) {
                        const member = await guild.members.fetch(signup.userId).catch(() => null);
                        if (member) memberName = member.displayName;
                    }
                    
                    return `${role?.emoji || ''} ${memberName}`;
                })).then(lines => lines.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Backups:",
                value: backups.length ? 
                    await Promise.all(backups.map(async backup => {
                        if (!guild || !(guild instanceof Guild)) return `Unknown Member (${backup.userId})`;
                        const member = await guild.members.fetch(backup.userId).catch(() => null);
                        return member ? member.displayName : `Unknown Member (${backup.userId})`;
                    })).then(lines => lines.join("\n"))
                    : "` - `",
                inline: true
            }
        ])
        .setColor(color)
        .setFooter({text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4`})
        .setTimestamp(Number(deployment.startTime));
}