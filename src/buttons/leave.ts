import Button from "../classes/Button.js";
import { client, queueJoinTimes } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildTextBasedChannel } from "discord.js";

export default new Button({
    id: "leave",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        try {
            const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to fetch your guild member data");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

            if (!alreadyQueued) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("You are not in the queue");

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const queueBefore = await Queue.find();
            const beforeCount = queueBefore.length;

            const joinTime = queueJoinTimes.get(interaction.user.id);
            const leaveTime = new Date();

            await Queue.delete({ user: interaction.user.id });
            queueJoinTimes.delete(interaction.user.id);
            await interaction.deferUpdate();

            const queueAfter = await Queue.find();
            const afterCount = queueAfter.length;

            const leaveLogChannel = await client.channels.fetch('1303492344636772392') as GuildTextBasedChannel;
            await leaveLogChannel.send(
                "╔═══════════════════════════ QUEUE LEAVE ═══════════════════════════╗\n" +
                `║ User      :: <@${interaction.user.id}>${' '.repeat(50 - interaction.user.id.length)}║\n` +
                `║ Join Time :: <t:${Math.floor(joinTime?.getTime() / 1000) || 0}:F>${' '.repeat(30)}║\n` +
                `║ Leave Time:: <t:${Math.floor(leaveTime.getTime() / 1000)}:F>${' '.repeat(30)}║\n` +
                `║ Queue     :: ${beforeCount} → ${afterCount}${' '.repeat(51 - beforeCount.toString().length - afterCount.toString().length)}║\n` +
                `║ DB Remove :: ✅${' '.repeat(55)}║\n` +
                "╚═══════════════════════════════════════════════════════════════════╝"
            );

            await updateQueueMessages(true, client.nextGame.getTime(), false);

        } catch (error) {
            console.error('Error in leave button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
})