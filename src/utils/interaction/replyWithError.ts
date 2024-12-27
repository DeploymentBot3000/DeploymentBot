import { ModalSubmitInteraction } from "discord.js";
import { buildErrorEmbed } from "../embedBuilders/configBuilders.js";

export async function replyWithError(interaction: ModalSubmitInteraction, title: string, message: string) {
    const embed = buildErrorEmbed();
    if (title != null) {
        embed.setTitle(title);
    }
    embed.setDescription(message);
    interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function editReplyWithError(interaction: ModalSubmitInteraction, title: string, message: string) {
    const embed = buildErrorEmbed();
    if (title != null) {
        embed.setTitle(title);
    }
    embed.setDescription(message);
    interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);
}

export async function followUpWithError(interaction: ModalSubmitInteraction, message: string) {
    const errorEmbed = buildErrorEmbed().setDescription(message);

    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
}
