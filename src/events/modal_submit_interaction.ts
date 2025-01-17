import colors from "colors";
import { ModalSubmitInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { DeploymentEditModal } from "../interactions/deployment_edit.js";
import { DeploymentNewModal } from "../interactions/deployment_new.js";
import { error, log } from "../utils/logger.js";

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
            log(`[Modal Submitted] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
            await modal.callback({ interaction });
        } catch (e) {
            error(`[Modal Error] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`)
            error(e);

            const embed = buildErrorEmbed()
                .setDescription(":x: **An error occurred while running this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
    },
}
