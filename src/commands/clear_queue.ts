import Command from "../classes/Command.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { replyWithSuccess } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";

export default new Command({
    name: "clear-queue",
    description: "Clear the queue",
    permissions: {
        requiredPermissions: ["Administrator"]
    },
    options: [],
    callback: async function ({ interaction }) {
        await HotDropQueue.getHotDropQueue().clear();

        await replyWithSuccess(interaction, 'The queue has been cleared');
        success('Queue cleared', 'QueuePanel');
    }
})
