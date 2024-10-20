import colors from "colors";
import { error, log } from "../../utils/logger.js";
import { client } from "../../index.js";
import { buildEmbed } from "../../utils/configBuilders.js";
export default {
    name: "interactionCreate",
    once: false,
    function: async function (interaction) {
        if (!interaction.isModalSubmit())
            return;
        const modal = client.modals.get(interaction.customId) || client.modals.get(interaction.customId.split("-")[0]);
        if (!modal)
            return;
        try {
            log(`[Modal Submitted] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
        }
        catch (e) {
            error(`[Modal Error] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
            error(e);
            const embed = buildEmbed({ preset: "error" })
                .setDescription(":x: **An error occurred while running this command!**");
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        modal.function({ interaction });
    },
};
