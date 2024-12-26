import colors from "colors";
import { ModalSubmitInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import editDeployment from "../modals/editDeployment.js";
import newDeployment from "../modals/newDeployment.js";
import { error, log } from "../utils/logger.js";
import { buildErrorEmbed } from "../utils/embedBuilders/configBuilders.js";

const _kModals: Map<string, Modal> = new Map();

_kModals.set(editDeployment.id, editDeployment);
_kModals.set(newDeployment.id, newDeployment);

function getModalById(id: string) {
    return _kModals.get(id);
}

export default {
    callback: async function (interaction: ModalSubmitInteraction) {
        const modal = getModalById(interaction.customId) || getModalById(interaction.customId.split("-")[0]);
        if (!modal) return;

        try {
            log(`[Modal Submitted] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
        } catch (e) {
            error(`[Modal Error] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`)
            error(e);

            const embed = buildErrorEmbed()
                .setDescription(":x: **An error occurred while running this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        modal.callback({ interaction });
    },
}
