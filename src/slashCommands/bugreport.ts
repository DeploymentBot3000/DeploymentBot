import { ActionRowBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, TextChannel } from 'discord.js';
import Slashcommand from "../classes/Slashcommand.js";
import Config from "../config.js";
import { buildEmbed } from "../utils/configBuilders.js";

export default new Slashcommand({
    name: "bugreport",
    description: "Submit a bug report",
    cooldown: 60, // 1 minute cooldown to prevent spam
    permissions: [],
    requiredRoles: [{ role: Config.verifiedRoleId, required: true }],
    options: [],
    func: async function({ interaction }) {
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

            if (modalSubmission) {
                const bugTitle = modalSubmission.fields.getTextInputValue('bugTitle');
                const bugDescription = modalSubmission.fields.getTextInputValue('bugDescription');
                const reproSteps = modalSubmission.fields.getTextInputValue('reproSteps');

                // Get the bug report channel
                const channel = await interaction.client.channels.fetch(Config.bugReportChannelId) as TextChannel;

                if (!channel) {
                    await modalSubmission.reply({
                        embeds: [buildEmbed({
                            preset: "error",
                            placeholders: {
                                description: "Failed to submit bug report. Channel not found."
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

                await channel.send({ embeds: [bugReportEmbed] });

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
            }
        } catch (error) {
            console.error('Error handling bug report modal:', error);
            await interaction.followUp({
                embeds: [buildEmbed({
                    preset: "error",
                    placeholders: {
                        description: "Failed to submit bug report. Please try again later."
                    }
                })],
                ephemeral: true
            });
        }
    }
}); 