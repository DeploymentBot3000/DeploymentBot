import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import {ColorResolvable, EmbedBuilder} from "discord.js";


export async function buildDeploymentEmbed(deployment: InstanceType<typeof Deployment>, color: ColorResolvable = "Green", started: boolean = false) {
    console.log('Building deployment embed with color:', color);
    const signups = await Signups.find({ where: { deploymentId: deployment.id } });
    const backups = await Backups.find({ where: { deploymentId: deployment.id } });

    const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(deployment.title)}&dates=${deployment.startTime}/${deployment.startTime + 7200000}&details=${encodeURIComponent(deployment.description)}&location=${encodeURIComponent("101st Deployments Channel")}&sf=true&output=xml`;

    return new EmbedBuilder()
            .setTitle(started ? `<:hellpod:1302084726219210752> ${deployment.title} - Started <:hellpod:1302084726219210752>` : deployment.title)
            .addFields([
                {
                    name: "Event Info:",
                    value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d> - [Calendar](${googleCalendarLink})\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.startTime + 7200000) / 1000)}:t>\n🪖 ${deployment.difficulty}`
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
                    value: backups.length ?
                        backups.map(backup => `<@${backup.userId}>`).join("\n")
                        : "` - `",
                    inline: true
                }
            ])
            .setColor(color as ColorResolvable)
            .setFooter({text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4`})
            .setTimestamp(Number(deployment.startTime));
    }