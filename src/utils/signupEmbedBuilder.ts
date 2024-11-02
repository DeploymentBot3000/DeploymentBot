    import config from "../config.js";
    import Deployment from "../tables/Deployment.js";
    import Signups from "../tables/Signups.js";
    import Backups from "../tables/Backups.js";
    import { EmbedBuilder, ColorResolvable, Colors } from "discord.js";


    export async function buildDeploymentEmbed(deployment: InstanceType<typeof Deployment>, color: ColorResolvable = "#00FF00") {
        console.log('Building deployment embed with color:', color);
        const signups = await Signups.find({ where: { deploymentId: deployment.id } });
        const backups = await Backups.find({ where: { deploymentId: deployment.id } });

        const embed = new EmbedBuilder()
            .setTitle(deployment.title)
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
            //(actualColor as ColorResolvable)
            .setColor(0xFF0000)
            .setFooter({ text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4` })
            .setTimestamp(Number(deployment.startTime));
        return embed;
    }