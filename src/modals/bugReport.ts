import {CommandInteraction, ModalSubmitInteraction, TextChannel} from "discord.js";
import Config from "../config.js";
import {buildEmbed} from "../utils/configBuilders.js";
import {error, success, warn} from "../utils/logger.js"; // Import CommandInteraction type

export default {
    id: "bugReport",
    function: async function ({ interaction }) {
        try {
            // const filter = (i: ModalSubmitInteraction) =>
            //     i.customId === `bugReportModal_${interaction.user.id}` &&
            //     i.user.id === interaction.user.id;
            //
            // const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
            //
            // if (modalSubmission.user.id !== interaction.user.id) return;

            const modalSubmission = interaction;

            const bugTitle = modalSubmission.fields.getTextInputValue('bugTitle');
            const bugDescription = modalSubmission.fields.getTextInputValue('bugDescription');
            const reproSteps = modalSubmission.fields.getTextInputValue('reproSteps');

            // Get the bug report channel
            if (!Config.bugReportChannelId) {
                await modalSubmission.reply({
                    embeds: [buildEmbed({
                        preset: "error",
                        placeholders: {
                            description: "Bug report channel ID is not configured properly."
                        }
                    })],
                    ephemeral: true
                });
                return;
            }

            const channel = modalSubmission.client.channels.cache.get(Config.bugReportChannelId) as TextChannel;

            if (!channel) {
                await modalSubmission.reply({
                    embeds: [buildEmbed({
                        preset: "error",
                        placeholders: {
                            description: "Failed to submit bug report. Channel not found or bot lacks access."
                        }
                    })],
                    ephemeral: true
                });
                return;
            }

            const bugReportEmbed = buildEmbed({
                preset: "info",
                name: "Bug Report"
            })
                .setTitle(`🐛 Bug Report: ${bugTitle}`)
                .setDescription(`**Reported by:** <@${modalSubmission.user.id}>\n**User ID:** ${modalSubmission.user.id}`)
                .addFields(
                    { name: '📝 Description', value: bugDescription },
                    { name: '🔄 Steps to Reproduce', value: reproSteps }
                )
                .setTimestamp();

            await channel.send({
                content: '<@486987675384020995> <@320766564116725761>',
                embeds: [bugReportEmbed]
            });

            await modalSubmission.reply({
                embeds: [buildEmbed({
                    preset: "success",
                    placeholders: {
                        description: "Bug report submitted successfully! Thank you for your feedback."
                    }
                })],
                ephemeral: true
            });

            success(`Bug report "${bugTitle}" submitted by ${modalSubmission.user.tag}`, "BugReport");
        } catch (err) {
            if (err.code === 'InteractionCollectorError') {
                warn(`${interaction.user.tag} bug report modal timed out`, "BugReport");
                return;
            }

            error(`Bug report submission failed: ${err}`, "BugReport");
        }
    }
};
