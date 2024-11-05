import { ActionRowBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, TextChannel } from 'discord.js';
import Slashcommand from "../classes/Slashcommand.js";
import Config from "../config.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { log, action, success, error, debug, warn } from "../utils/logger.js";

export default new Slashcommand({
    name: "bugreport",
    description: "Submit a bug report",
    cooldown: 60, // 1 minute cooldown to prevent spam
    permissions: [],
    requiredRoles: [{ role: Config.verifiedRoleId, required: true }],
    options: [],
    func: async function({ interaction }) {
        action(`${interaction.user.tag} initiated bug report`, "BugReport");

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('bugReportModal')
            .setTitle('Bug Report Form');

        // Add components to modal
        const titleInput = new TextInputBuilder()
            .setCustomId('bugTitle')
            .setLabel('Bug Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Brief description of the bug')
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('bugDescription')
            .setLabel('Bug Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Please provide detailed information about the bug')
            .setRequired(true)
            .setMaxLength(1000);

        const stepsInput = new TextInputBuilder()
            .setCustomId('reproSteps')
            .setLabel('Steps to Reproduce')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('List the steps to reproduce this bug')
            .setRequired(true)
            .setMaxLength(1000);

        // Add inputs to action rows
        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);
        const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(stepsInput);

        // Add action rows to modal
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        // Show the modal
        await interaction.showModal(modal);

        // Wait for modal submission
        try {
            const filter = (i: ModalSubmitInteraction) => i.customId === 'bugReportModal';
            const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 }); // 5 minute timeout

            // Add a check to ensure the modal submission is from the same user
            if (modalSubmission.user.id !== interaction.user.id) {
                return;
            }

            const bugTitle = modalSubmission.fields.getTextInputValue('bugTitle');
            debug(`Bug report title: ${bugTitle}`, "BugReport");

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

            // Use channelId to fetch from any guild the bot is in
            const channel = await interaction.client.channels.cache.get(Config.bugReportChannelId) as TextChannel;
            // Alternative method if the channel isn't cached:
            // const channel = await interaction.client.channels.fetch(Config.bugReportChannelId) as TextChannel;

            if (!channel) {
                await modalSubmission.reply({
                    embeds: [buildEmbed({
                        preset: "error",
                        placeholders: {
                            description: "Failed to submit bug report. Channel not found or bot lacks access. Make sure the bot is in the server where the bug report channel is located."
                        }
                    })],
                    ephemeral: true
                });
                return;
            }

            // Create and send the bug report embed
            const bugReportEmbed = buildEmbed({
                preset: "info",
                name: "Bug Report"
            })
                .setTitle(`🐛 Bug Report: ${bugTitle}`)
                .setDescription(`**Reported by:** <@${interaction.user.id}>\n**User ID:** ${interaction.user.id}`)
                .addFields(
                    { name: '📝 Description', value: bugDescription },
                    { name: '🔄 Steps to Reproduce', value: reproSteps }
                )
                .setTimestamp();

            // Added specific user pings to the message content
            await channel.send({
                content: '<@486987675384020995> <@320766564116725761>',
                embeds: [bugReportEmbed]
            });

            // Confirm submission to user
            await modalSubmission.reply({
                embeds: [buildEmbed({
                    preset: "success",
                    placeholders: {
                        description: "Bug report submitted successfully! Thank you for your feedback."
                    }
                })],
                ephemeral: true
            });

            success(`Bug report "${bugTitle}" submitted by ${interaction.user.tag}`, "BugReport");
        } catch (err) {
            // Check if it's a timeout error
            if (err.code === 'InteractionCollectorError') {
                warn(`${interaction.user.tag} bug report modal timed out`, "BugReport");
                return;
            }

            // Handle other errors
            console.error('Error handling bug report modal:', err);
            
            // Try to respond to the interaction using the appropriate method
            try {
                const response = {
                    embeds: [buildEmbed({
                        preset: "error",
                        placeholders: {
                            description: "Failed to submit bug report. Please try again later."
                        }
                    })],
                    ephemeral: true
                };

                if (err.code === 'InteractionAlreadyReplied') {
                    await modalSubmission.editReply(response);
                } else {
                    await interaction.followUp(response);
                }
            } catch (replyErr) {
                // If we can't reply, just log it
                warn(`Could not send error message to user: ${replyErr}`, "BugReport");
            }

            error(`Bug report submission failed: ${err}`, "BugReport");
        }
    }
});