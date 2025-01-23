import { AnySelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import { debug } from "./logger.js";

type _SupportedInteractions = ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction | ChatInputCommandInteraction;

export async function replyWithError(interaction: _SupportedInteractions, message: string) {
    debug(`replyWithError: ${_truncateMessage(message)} to interaction: ${interaction.id}`);
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function replyWithSuccess(interaction: _SupportedInteractions, message: string) {
    debug(`replyWithSuccess: ${_truncateMessage(message)} to interaction: ${interaction.id}`);
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithError(interaction: _SupportedInteractions, message: string) {
    debug(`editReplyWithError: ${_truncateMessage(message)} to interaction: ${interaction.id}`);
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithSuccess(interaction: _SupportedInteractions, message: string) {
    debug(`editReplyWithSuccess: ${_truncateMessage(message)} to interaction: ${interaction.id}`);
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

function _truncateMessage(message: string) {
    if (message.length > 100) {
        return message.substring(0, 97) + "...";
    } else {
        return message;
    }
}
