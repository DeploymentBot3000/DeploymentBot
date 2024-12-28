import { client } from "../custom_client.js";
import { buildHotDropStartedEmbed, buildQueueEventEmbed, QueueDeploymentEmbedOptions, QueueEventEmbedOptions } from "../embeds/queue.js";
import { sendEmbedToLogChannel } from "./log_channel.js";
import { error } from "./logger.js";

export async function logQueueAction(options: QueueEventEmbedOptions) {
    await sendEmbedToLogChannel(buildQueueEventEmbed(options), client).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}

export async function logHotDropStarted(options: QueueDeploymentEmbedOptions) {
    await sendEmbedToLogChannel(buildHotDropStartedEmbed(options), client).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}
