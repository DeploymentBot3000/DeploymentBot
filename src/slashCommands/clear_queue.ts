import Slashcommand from "../classes/Slashcommand.js";
import {client} from "../index.js";
import Queue from "../tables/Queue.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import {action, success} from "../utils/logger.js";

export default new Slashcommand({
    name: "clear-queue",
    description: "Clear the queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [],
    func: async function({ interaction }) {
        action(`${interaction.user.tag} clearing queue`, "QueueClear");
        
        await Queue.clear();
        success(`Queue cleared by ${interaction.user.tag}`, "QueueClear");

        const embed = buildEmbed({ preset: "success" })
            .setTitle("Queue cleared")
            .setDescription("The queue has been cleared");

        await interaction.reply({ embeds: [embed], ephemeral: true });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})