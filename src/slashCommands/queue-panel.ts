import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import Queue from "../tables/Queue.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { client } from "../index.js";

export default new Slashcommand({
    name: "queue-panel",
    description: "Send the queue panel",
    cooldown: 0,
    permissions: ["ManageRoles"],
    requiredRoles: [],
    options: [],
    func: async function({ interaction }) {
        if (!interaction.memberPermissions.has("ManageRoles")) {
            return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
        
        const queue = await Queue.find();
        const hosts = queue.filter(q => q.host);
        const players = queue.filter(q => !q.host);

        const embed = buildEmbed({ name: "queuePanel" })
            .addFields([
                {
                    name: "Hosts:",
                    value: hosts.map(host => `<@${host.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Participants:",
                    value: players.map(player => `<@${player.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Next game:",
                    value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                }
            ]);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("host"),
            buildButton("join"),
            buildButton("leave")
        );
        
        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Queue panel sent");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        await QueueStatusMsg.insert({ channel: interaction.channelId, message: msg.id });
    }
})
