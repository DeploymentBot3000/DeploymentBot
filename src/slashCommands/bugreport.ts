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
            .setCustomId(`bugReport`)
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
    }
});