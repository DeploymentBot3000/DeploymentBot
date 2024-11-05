import { ActionRowBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, TextChannel, Collection } from 'discord.js';
import Slashcommand from "../classes/Slashcommand.js";
import Config from "../config.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { log, action, success, error, debug, warn } from "../utils/logger.js";

declare module 'discord.js' {
    interface Client {
        modalSubmitInteractions: Collection<string, any>;
    }
}

export default new Slashcommand({
    name: "bugreport",
    description: "Submit a bug report",
    cooldown: 60, // 1 minute cooldown to prevent spam
    permissions: [],
    requiredRoles: [{ role: Config.verifiedRoleId, required: true }],
    options: [],
    func: async function({ interaction }) {
        // Clear any existing collectors for this user
        const existingCollector = interaction.client.modalSubmitInteractions?.get(interaction.user.id);
        if (existingCollector) {
            existingCollector.stop();
        }

        action(`${interaction.user.tag} initiated bug report`, "BugReport");

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId(`bugReportModal_${interaction.user.id}`)
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

        try {
            const filter = (i: ModalSubmitInteraction) => 
                i.customId === `bugReportModal_${interaction.user.id}` && 
                i.user.id === interaction.user.id;
                
            const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });

            if (modalSubmission.user.id !== interaction.user.id) return;

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

            const channel = await modalSubmission.client.channels.cache.get(Config.bugReportChannelId) as TextChannel;

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
});