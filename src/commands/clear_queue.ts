import Command from "../classes/Command.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { action, success } from "../utils/logger.js";

export default new Command({
    name: "clear-queue",
    description: "Clear the queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    callback: async function ({ interaction }) {
        action(`${interaction.user.tag} clearing queue`, "QueueClear");
        
        await Queue.clear();
        success(`Queue cleared by ${interaction.user.tag}`, "QueueClear");

        const embed = buildEmbed({ preset: "success" })
            .setTitle("Queue cleared")
            .setDescription("The queue has been cleared");

        await interaction.reply({ embeds: [embed], ephemeral: true });

        await HotDropQueue.getHotDropQueue().updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);
    }
})