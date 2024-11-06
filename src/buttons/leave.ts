import Button from "../classes/Button.js";
import { client, queueJoinTimes } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildTextBasedChannel } from "discord.js";
import { logQueueAction } from "../utils/queueLogger.js";

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

            await logQueueAction({
                type: 'leave',
                userId: interaction.user.id,
                joinTime: joinTime,
                leaveTime: leaveTime,
                queueBefore: beforeCount,
                queueAfter: afterCount,
                dbStatus: true
            });

            await updateQueueMessages(true, client.nextGame.getTime(), false);

        } catch (error) {
            console.error('Error in leave button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
})