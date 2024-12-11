import Button from "../classes/Button.js";
import { client } from "../custom_client.js";
import Queue from "../tables/Queue.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import config from "../config.js";
import {logQueueAction} from "../utils/queueLogger.js";

export default new Button({
    id: "join",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function ({ interaction }) {
        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });
        const playersInQueue = await Queue.find({ where: { host: false } });

        if (alreadyQueued && !alreadyQueued.host) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        if (playersInQueue.length >= config.queueMaxes.players && !client.battalionStrikeMode) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("The queue is currently full!");

            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        try {
            const joinTime = new Date();
            client.queueJoinTimes.set(interaction.user.id, joinTime);

            // Send or update receipt message
            let receiptMessage;
            try {
                if (alreadyQueued && alreadyQueued.receiptMessageId) {
                    const existingMessage = await interaction.user.dmChannel?.messages.fetch(alreadyQueued.receiptMessageId);
                    if (existingMessage) {
                        receiptMessage = await existingMessage.edit({
                            embeds: [buildEmbed({ preset: "success" })
                                .setColor('#00FF00')
                                .setTitle("You've Joined the Hot Drop")
                                .setDescription(
                                    `User: <@${interaction.user.id}>\n` +
                                    `⏰┃Join Time: <t:${Math.floor(joinTime.getTime() / 1000)}:F>\n` +
                                    `🧨┃DB Add: ✅`
                                )
                            ]
                        });
                    }
                }
                
                if (!receiptMessage) {
                    receiptMessage = await interaction.user.send({
                        embeds: [buildEmbed({ preset: "success" })
                            .setColor('#00FF00')
                            .setTitle("You've Joined the Hot Drop")
                            .setDescription(
                                `User: <@${interaction.user.id}>\n` +
                                `⏰┃Join Time: <t:${Math.floor(joinTime.getTime() / 1000)}:F>\n` +
                                `🧨┃DB Add: ✅`
                            )
                        ]
                    });
                }
            } catch (error) {
                console.error('Error sending receipt message:', error);
                // Continue without receipt message
                receiptMessage = { id: null };
            }

            await logQueueAction({
                type: 'join',
                userId: interaction.user.id
            });

            if(alreadyQueued && alreadyQueued.host) {
                await Queue.createQueryBuilder()
                    .update()
                    .set({ 
                        host: false,
                        receiptMessageId: receiptMessage.id,
                        joinTime: joinTime
                    })
                    .where("id = :id", { id: alreadyQueued.id })
                    .execute();
            } else {
                await Queue.insert({ 
                    user: interaction.user.id, 
                    host: false,
                    receiptMessageId: receiptMessage.id,
                    joinTime: joinTime
                });
            }

            await updateQueueMessages(true, client.nextGame.getTime(), false);
        } catch (error) {
            console.error('Error in join button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }   
})