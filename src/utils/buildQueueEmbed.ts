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
                    if (!config.useNicknames) return `<@${host.user}>`;
                    const member = await channel.guild.members.fetch(host.user).catch(() => null);
                    return member ? `${member.nickname || member.user.username}` : `<@${host.user}>`;
                })).then(hosts => hosts.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Participants:",
                value: await Promise.all(currentPlayers.map(async player => {
                    if (!config.useNicknames) return `<@${player.user}>`;
                    const member = await channel.guild.members.fetch(player.user).catch(() => null);
                    return member ? `${member.nickname || member.user.username}` : `<@${player.user}>`;
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
        //console.log(`Adding "Not enough players" message to queue message: ${message.id}`);
    } else if (deploymentCreated) {
        content = `**✅ Successfully created a deployment.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
        //console.log(`Adding "Successfully created a deployment" message to queue message: ${message.id}`);
    } else {
        //console.log(`Removing status message from queue message: ${message.id}`);
    }
    return { embed, content };
}