import { GuildTextBasedChannel } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

export default new Slashcommand({
    name: "clear-queue",
    description: "Clear the queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    cooldown: 0,
    options: [],
    func: async function({ interaction }) {
        await Queue.clear();

        const embed = buildEmbed({ preset: "success" })
            .setTitle("Queue cleared")
            .setDescription("The queue has been cleared");

        await interaction.reply({ embeds: [embed], ephemeral: true });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})