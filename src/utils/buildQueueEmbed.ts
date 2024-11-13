import { buildEmbed } from "./configBuilders.js";
import config from "../config.js";
import { EmbedBuilder, GuildTextBasedChannel} from "discord.js";
import Queue from "../tables/Queue.js";
import {client} from "../index.js";
import HackedEmbedBuilder from "../classes/HackedEmbedBuilder.js";

export default async function buildQueueEmbed(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false, channel: GuildTextBasedChannel): Promise<HackedEmbedBuilder> {
    const currentQueue = await Queue.find();
    const currentHosts = currentQueue.filter(q => q.host);
    const currentPlayers = currentQueue.filter(q => !q.host);
    console.log(`Current queue: Hosts: ${currentHosts.length}, Players: ${currentPlayers.length}`);

    let content = null;
    if (notEnoughPlayers) {
        content = `❌**┃Not enough players.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    } else if (deploymentCreated) {
        content = `✅**┃Successfully created a deployment.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    }

    const embed = new HackedEmbedBuilder()
        .setTitle(`🔥┃${ client.battalionStrikeMode ? 'Battalion Strike Queue' : 'Hot Drop Queue' }`)
        .addFields(
            {
                name: "",
                value: "Hot drop deployments are urgent deployments, where random divers from the Queue Panel get selected at the listed interval of time below and sent to their hellpods!",
                inline: false
            },
            {
                name: "",
                value: content,
                inline: false
            },
            {
                name: "",
                value: "🚀**┃**Click **Host** to be added as a host",
                inline: false
            },
            {
                name: "",
                value: "📝**┃**Click **Join** to be added to the queue",
                inline: false
            },
            {
                name: "",
                value: "🚫**┃**Click **Leave** to leave the queue",
                inline: false
            },
            {
                name: "",
                value: "🛑**┃**Leave the queue if you are no longer available!",
                inline: false
            },
            {
                name: "",
                value: "🔊**┃**Once deployed, you have **15 MINUTES** to join the correct voice channel!",
                inline: false
            },
            {
                name: "",
                value: "⚠️**┃**Failing to attend an assigned Hot Drop will result in **3 Sanction points**.",
                inline: false
            },
            {
                name: "",
                value: "🐛**┃**If you exprience a bug please use ``/bugreport``.",
                inline: false
            },
            {
                name: "Hosts:",
                value: await Promise.all(currentHosts.map(async host => {
                    const member = await channel.guild.members.fetch(host.user).catch(() => null);
                    return member ? member.displayName : 'Unknown User';
                })).then(hosts => hosts.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Participants:",
                value: await Promise.all(currentPlayers.map(async player => {
                    const member = await channel.guild.members.fetch(player.user).catch(() => null);
                    return member ? member.displayName : 'Unknown User';
                })).then(players => players.join("\n")) || "` - `",
                inline: true
            },
            {
                name: "Next game:",
                value: `📅**┃**<t:${Math.round(nextDeploymentTime / 1000)}:d>\n🕒**┃**<t:${Math.round(nextDeploymentTime / 1000)}:t>`,
            }
        );
    return embed;
}