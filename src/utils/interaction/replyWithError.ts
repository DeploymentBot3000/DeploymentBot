import { ModalSubmitInteraction } from "discord.js";
import { buildErrorEmbed } from "../embedBuilders/configBuilders.js";

export async function replyWithError(interaction: ModalSubmitInteraction, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithError(interaction: ModalSubmitInteraction, message: string) {
    const embed = buildErrorEmbed().setTitle('Error').setDescription(message);
    interaction.editReply({ content: '', embeds: [embed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}
