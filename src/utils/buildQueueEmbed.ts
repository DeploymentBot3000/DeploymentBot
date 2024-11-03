import { buildEmbed } from "./configBuilders.js";
import config from "../config.js";
import { EmbedBuilder, GuildTextBasedChannel} from "discord.js";
import Queue from "../tables/Queue.js";

export default async function buildQueueEmbed(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false, channel: GuildTextBasedChannel): Promise<{
    embed: EmbedBuilder;
    content: string
}> {
    const currentQueue = await Queue.find();
    const currentHosts = currentQueue.filter(q => q.host);
    const currentPlayers = currentQueue.filter(q => !q.host);
    console.log(`Current queue: Hosts: ${currentHosts.length}, Players: ${currentPlayers.length}`);

    const embed = buildEmbed({name: "queuePanel"})
        .addFields([
            {
                name: "Hosts:",
                value: await Promise.all(currentHosts.map(async host => {
                    const member = await channel.guild.members.fetch(host.user).catch(() => null);
                    return member ? `<@${host.user}> (${member.user.username})` : `<@${host.user}>`;
                })).then(hosts => hosts.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Participants:",
                value: await Promise.all(currentPlayers.map(async player => {
                    const member = await channel.guild.members.fetch(player.user).catch(() => null);
                    return member ? `<@${player.user}> (${member.user.username})` : `<@${player.user}>`;
                })).then(players => players.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Next game:",
                value: `📅 <t:${Math.round(nextDeploymentTime / 1000)}:d>\n🕒 <t:${Math.round(nextDeploymentTime / 1000)}:t>`,
            }
        ]);

    let content = null;
    if (notEnoughPlayers) {
        content = `**❌ Not enough players.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    } else if (deploymentCreated) {
        content = `**✅ Successfully created a deployment.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    }
    return { embed, content };
}