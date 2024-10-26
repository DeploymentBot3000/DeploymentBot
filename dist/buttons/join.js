import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });
        if (alreadyQueued) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        await Queue.insert({ user: interaction.user.id, host: false });
        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("You have been added to the queue as a participant");
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
});
