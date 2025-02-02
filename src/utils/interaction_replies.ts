import { AnySelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { debug, error } from "./logger.js";

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

export async function deferReply(interaction: _SupportedInteractions) {
    // We have seen deferal failures due to what seems like network delays or
    // slow vm, causing us to miss the 3 second window to defer the interaction.
    // These are benighn and the user can retry the action since we don't do
    // anything important before trying to defer an interaction.
    // The discord UI will show interaction failed.
    // Suppress the error so it doesn't spam our error logs.
    // Note that we can't even reply to the user at this point.
    try {
        await interaction.deferReply({ ephemeral: true });
        return true;
    } catch (e: any) {
        if ((e as Error).message.includes('Unknown interaction')) {
            error(e);
            await sendErrorToLogChannel(new Error(`Failed to defer reply: ${interaction.id}`), interaction.client);
            return false;
        }
        throw e;
    }
}

export async function deferUpdate(interaction: ButtonInteraction) {
    try {
        await interaction.deferUpdate();
        return true;
    } catch (e: any) {
        if ((e as Error).message.includes('Unknown interaction')) {
            error(e);
            await sendErrorToLogChannel(new Error(`Failed to defer update: ${interaction.id}`), interaction.client);
            return false;
        }
        throw e;
    }
}

export async function showModal(interaction: ButtonInteraction | StringSelectMenuInteraction, modal: ModalBuilder) {
    try {
        await interaction.showModal(modal);
    } catch (e: any) {
        if ((e as Error).message.includes('Unknown interaction')) {
            error(e);
            await sendErrorToLogChannel(new Error(`Failed to show modal: ${interaction.id}`), interaction.client);
            return;
        }
        // We are also seeing some of these error in the edit deployment flow.
        // They might go away with the recent rewrite.
        // Special casing them in case they don't, so they don't print the entire
        // interaction object and provide more recognizable error.
        if ((e as Error).message.includes('Interaction has already been acknowledged')) {
            error(e);
            await sendErrorToLogChannel(new Error(`Interaction has already been acknowledged in showModal: ${interaction.id}`), interaction.client);
            return;
        }
        throw e;
    }
}

function _truncateMessage(message: string) {
    if (message.length > 100) {
        return message.substring(0, 97) + "...";
    } else {
        return message;
    }
}
