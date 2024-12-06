import Button from "../classes/Button.js";
import {client} from "../index.js";
import Queue from "../tables/Queue.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import {logQueueAction} from "../utils/queueLogger.js";

export default new Button({
    id: "host",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function({ interaction }) {
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });
        const hostsInQueue = await Queue.find({ where: { host: true } });

        if (alreadyQueued && alreadyQueued?.host) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (hostsInQueue.length >= config.queueMaxes.hosts && !client.battalionStrikeMode) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("The hosts queue is currently full!");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const joinTime = new Date();
            client.queueJoinTimes.set(interaction.user.id, joinTime);

            // Send or update receipt message
            let receiptMessage;
            if (alreadyQueued && alreadyQueued.receiptMessageId) {
                const existingMessage = await interaction.user.dmChannel?.messages.fetch(alreadyQueued.receiptMessageId);
                if (existingMessage) {
                    receiptMessage = await existingMessage.edit({
                        embeds: [buildEmbed({ preset: "success" })
                            .setColor('#FFA500')  // Orange color for host
                            .setTitle("You've Joined the Queue as a Host")
                            .setDescription(
                                `User: <@${interaction.user.id}>\n` +
                                `⏰┃Join Time: <t:${Math.floor(joinTime.getTime() / 1000)}:F>\n` +
                                `🧨┃DB Add: ✅`
                            )
                        ]
                    });
                }
            } else {
                receiptMessage = await interaction.user.send({
                    embeds: [buildEmbed({ preset: "success" })
                        .setColor('#FFA500')  // Orange color for host
                        .setTitle("You've Joined the Queue as a Host")
                        .setDescription(
                            `User: <@${interaction.user.id}>\n` +
                            `⏰┃Join Time: <t:${Math.floor(joinTime.getTime() / 1000)}:F>\n` +
                            `🧨┃DB Add: ✅`
                        )
                    ]
                });
            }

            if (alreadyQueued && !alreadyQueued.host) {
                await Queue.update(alreadyQueued.id, { 
                    host: true,
                    receiptMessageId: receiptMessage.id,
                    joinTime: joinTime
                });
            } else {
                await Queue.insert({ 
                    user: interaction.user.id, 
                    host: true,
                    receiptMessageId: receiptMessage.id,
                    joinTime: joinTime
                });
            }

            await logQueueAction({
                type: 'host',
                userId: interaction.user.id
            });

            await updateQueueMessages(true, client.nextGame.getTime(), false);
        } catch (error) {
            console.error('Error in host button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
})