import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import {ColorResolvable, EmbedBuilder} from "discord.js";


export async function buildDeploymentEmbed(deployment: InstanceType<typeof Deployment>, interaction: any, color: ColorResolvable = "Green", started: boolean = false) {
        console.log('Building deployment embed with color:', color);
        const signups = await Signups.find({ where: { deploymentId: deployment.id } });
        const backups = await Backups.find({ where: { deploymentId: deployment.id } });

    return new EmbedBuilder()
            .setTitle(started ? `<:hellpod:1302084726219210752> ${deployment.title} - Started <:hellpod:1302084726219210752>` : deployment.title)
            .addFields([
                {
                    name: "Event Info:",
                    value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d>\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.endTime) / 1000)}:t>`
                },
                {
                    name: "Description:",
                    value: deployment.description
                },
                {
                    name: "Signups:",
                    value: signups.map(signup => {
                        const role = config.roles.find(role => role.name === signup.role);
                        const member = interaction.guild.members.cache.get(signup.userId);
                        return `${role.emoji} ${member ? member.displayName : `Unknown Member (${signup.userId})`}`;
                    }).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Backups:",
                    value: backups.length ?
                        backups.map(backup => {
                            const member = interaction.guild.members.cache.get(backup.userId);
                            return member ? member.displayName : `Unknown Member (${backup.userId})`;
                        }).join("\n")
                        : "` - `",
                    inline: true
                }
            ])
            .setColor(color as ColorResolvable)
            .setFooter({text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4`})
            .setTimestamp(Number(deployment.startTime));
    }