import { GuildTextBasedChannel } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { buildEmbed } from "../utils/configBuilders.js";

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

        const currentQueue = await Queue.find();
        const currentHosts = currentQueue.filter(q => q.host);
        const currentPlayers = currentQueue.filter(q => !q.host);

        const queueMessages = await QueueStatusMsg.find();

        for (const queueMessage of queueMessages) {
            const channel = await client.channels.fetch(queueMessage.channel).catch(() => null) as GuildTextBasedChannel;
            const message = await channel.messages.fetch(queueMessage.message).catch(() => null);

            const embed = buildEmbed({ name: "queuePanel" })
                .addFields([
                    {
                        name: "Hosts:",
                        value: currentHosts.map(host => `<@${host.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Participants:",
                        value: currentPlayers.map(player => `<@${player.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Next game:",
                        value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                    }
                ]);

            await message.edit({ content: null, embeds: [embed] });
        }
    }
})