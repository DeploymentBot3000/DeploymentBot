import { ModalSubmitInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import { DeploymentEditModal } from "../interactions/deployment_edit.js";
import { DeploymentNewModal } from "../interactions/deployment_new.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { error } from "../utils/logger.js";

const _kModals: Map<string, Modal> = new Map();

_kModals.set(DeploymentEditModal.id, DeploymentEditModal);
_kModals.set(DeploymentNewModal.id, DeploymentNewModal);

function getModalById(id: string) {
    return _kModals.get(id);
}

export default {
    callback: async function (interaction: ModalSubmitInteraction<'cached'>) {
        if (!interaction.inCachedGuild()) {
            throw new Error('Interaction is not in a cached guild');
        }
        const modal = getModalById(interaction.customId) || getModalById(interaction.customId.split("-")[0]);
        if (!modal) return;

        try {
            await modal.callback({ interaction });
        } catch (e) {
            error(e);
            await replyWithError(interaction, ":x: **An error occurred while running this command!**");
            return;
        }
    },
}
