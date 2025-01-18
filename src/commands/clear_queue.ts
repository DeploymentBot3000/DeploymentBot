import Command from "../classes/Command.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
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

        const embed = buildSuccessEmbed()
            .setTitle("Queue cleared")
            .setDescription("The queue has been cleared");

        await interaction.reply({ embeds: [embed], ephemeral: true });
        success('Queue cleared', 'QueuePanel');
    }
})
