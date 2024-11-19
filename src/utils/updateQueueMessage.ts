import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import {client} from "../index.js";
import {GuildTextBasedChannel} from "discord.js";
import buildQueueEmbed from "./embedBuilders/buildQueueEmbed.js";
import {log} from "./logger.js";

export default async function updateQueueMessages(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false) {
    log("Starting updateQueueMessages function", 'Queue System');

    const queueMessages = await QueueStatusMsg.find();
    const queueMessage = queueMessages[0];
    if(!queueMessage) return null;
    const channel = await client.channels.fetch(queueMessage.channel).catch(() => null) as GuildTextBasedChannel;
    const message = await channel.messages.fetch(queueMessage.message).catch(() => null);
    if(!message) return null;

    log(`Next deployment time: ${new Date(nextDeploymentTime).toISOString()} (${nextDeploymentTime})`, 'Queue System');

    let embed = await buildQueueEmbed(notEnoughPlayers, nextDeploymentTime, deploymentCreated, channel);

    await message.edit({ embeds: [embed] });
    log(`Queue message updated: ${message.id}`, 'Queue System');
    return message;
}