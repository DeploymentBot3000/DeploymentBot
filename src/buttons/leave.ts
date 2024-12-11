import Button from "../classes/Button.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import {logQueueAction} from "../utils/queueLogger.js";
import config from "../config.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Button({
    id: "leave",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function ({ interaction }) {
        try {
            const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to fetch your guild member data");
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

            if (!alreadyQueued) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("You are not in the queue");

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const queueBefore = await Queue.find();
            const beforeCount = queueBefore.length;

            const joinTime = alreadyQueued?.joinTime;
            const leaveTime = new Date();

            if (!joinTime) {
                console.error(`No join time found for user ${interaction.user.id}`);
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Could not find your queue join time");
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            const queueDuration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);
            const formatDuration = (seconds: number): string => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const remainingSeconds = seconds % 60;
                
                const parts = [];
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
                
                return parts.join(' ');
            };

            await Queue.delete({ user: interaction.user.id });
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

            try {
                if (alreadyQueued.receiptMessageId) {
                    const channel = await interaction.user.createDM();
                    const message = await channel.messages.fetch(alreadyQueued.receiptMessageId);
                    
                    await message.edit({
                        embeds: [
                            message.embeds[0],
                            buildEmbed({ preset: "error" })
                                .setColor('#FF0000')
                                .setTitle("You've Disengaged from the Hot Drop")
                                .setDescription(
                                    `User: <@${interaction.user.id}>\n` +
                                    `⏰┃Leave Time: <t:${Math.floor(leaveTime.getTime() / 1000)}:F>\n` +
                                    `⏱️┃Time in Queue: ${formatDuration(queueDuration)}\n` +
                                    `🧨┃DB Remove: ✅`
                                )
                        ]
                    });
                }
            } catch (error) {
                console.error("Failed to edit receipt message:", error);
            }

            await HotDropQueue.getHotDropQueue().updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);

        } catch (error) {
            console.error('Error in leave button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
})