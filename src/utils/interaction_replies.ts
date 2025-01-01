import { AnySelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";

type _SupportedInteractions = ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction | ChatInputCommandInteraction;

export async function replyWithError(interaction: _SupportedInteractions, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function replyWithSuccess(interaction: _SupportedInteractions, message: string) {
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithError(interaction: _SupportedInteractions, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithSuccess(interaction: _SupportedInteractions, message: string) {
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}
