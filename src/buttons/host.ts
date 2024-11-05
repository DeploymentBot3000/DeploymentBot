import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildTextBasedChannel } from "discord.js";

export default new Button({
    id: "host",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    func: async function({ interaction }) {
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const joinLogChannel = await client.channels.fetch('1303492344636772392') as GuildTextBasedChannel;
        await joinLogChannel.send(
            "╔═══════════════════════════ QUEUE JOIN ═══════════════════════════╗\n" +
            `║ User    :: <@${interaction.user.id}>${' '.repeat(42 - interaction.user.id.length)}║\n` +
            `║ Type    :: Host${' '.repeat(45)}║\n` +
            `║ Time    :: <t:${Math.floor(Date.now() / 1000)}:F>${' '.repeat(20)}║\n` +
            "╚════════════════════════════════════════════════════════════════════╝"
        );

        await Queue.insert({ user: interaction.user.id, host: true });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})