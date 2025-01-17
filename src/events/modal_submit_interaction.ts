import { ModalSubmitInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { DeploymentEditModal } from "../interactions/deployment_edit.js";
import { DeploymentNewModal } from "../interactions/deployment_new.js";
import { error } from "../utils/logger.js";

const _kModals: Map<string, Modal> = new Map();

_kModals.set(DeploymentEditModal.id, DeploymentEditModal);
_kModals.set(DeploymentNewModal.id, DeploymentNewModal);

function getModalById(id: string) {
    return _kModals.get(id);
}

export default {
    callback: async function (interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) {
            throw new Error('Interaction is not in a cached guild');
        }
        const modal = getModalById(interaction.customId) || getModalById(interaction.customId.split("-")[0]);
        if (!modal) return;

        try {
            await modal.callback({ interaction });
        } catch (e) {
            error(e);

            const embed = buildErrorEmbed()
                .setDescription(":x: **An error occurred while running this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
    },
}
