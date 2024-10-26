import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";

export default new Button({
    id: "leave",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (!alreadyQueued) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are not in the queue");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await Queue.delete({ user: interaction.user.id });

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("You have been removed from the queue");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        const queue = await Queue.find();

        const embed = buildEmbed({ name: "queuePanel" })
            .addFields([
                {
                    name: "Hosts:",
                    value: queue.filter(q => q.host).map(host => `<@${host.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Participants:",
                    value: queue.filter(q => !q.host).map(player => `<@${player.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Next game:",
                    value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                }
            ]);

        await interaction.message.edit({ embeds: [embed] });
    }
})