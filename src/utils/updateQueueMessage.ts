import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import {client} from "../index.js";
import {GuildTextBasedChannel} from "discord.js";
import buildQueueEmbed from "./buildQueueEmbed.js";

export default async function updateQueueMessages(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false) {
    console.log("Starting updateQueueMessages function");

    const queueMessages = await QueueStatusMsg.find();
    const queueMessage = queueMessages[0];
    const channel = await client.channels.fetch(queueMessage.channel).catch(() => null) as GuildTextBasedChannel;
    const message = await channel.messages.fetch(queueMessage.message).catch(() => null);

    if(!message) return null;

    console.log(`Next deployment time: ${new Date(nextDeploymentTime).toISOString()} (${nextDeploymentTime})`);

    let { embed, content } = await buildQueueEmbed(notEnoughPlayers, nextDeploymentTime, deploymentCreated, channel);

    await message.edit({ content, embeds: [embed] });
    console.log(`Queue message updated: ${message.id}`);
    return message;
}