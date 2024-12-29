import { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../../embeds/embed.js";

export async function replyWithError(interaction: ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function replyWithSuccess(interaction: ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction, message: string) {
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithError(interaction: ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithSuccess(interaction: ModalSubmitInteraction | ButtonInteraction | AnySelectMenuInteraction, message: string) {
    const embed = buildSuccessEmbed().setTitle('Success').setDescription(message);
    await interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}
