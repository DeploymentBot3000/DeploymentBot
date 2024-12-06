import { client } from "../index.js";
import { buildQueueDeploymentEmbed, buildQueueEventEmbed, QueueDeploymentEmbedOptions, QueueEventEmbedOptions } from "../embeds/queueEvent.js";
import { sendEmbedToLogChannel } from "./log_channel.js";
import { error } from "./logger.js";

export async function logQueueAction(options: QueueEventEmbedOptions) {
    await sendEmbedToLogChannel(buildQueueEventEmbed(options), client).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}

export async function logQueueDeployment(options: QueueDeploymentEmbedOptions) {
    await sendEmbedToLogChannel(buildQueueDeploymentEmbed(options), client).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}
