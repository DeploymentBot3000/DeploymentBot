import colors from "colors";
import { error, log } from "../utils/logger.js";
import { AnySelectMenuInteraction } from "discord.js";
import { buildErrorEmbed } from "../utils/embedBuilders/configBuilders.js";
import checkBlacklist from "../utils/interaction/checkBlacklist.js";
import hasRequiredRoles from "../utils/interaction/hasRequiredRoles.js";
import hasRequiredPermissions from "../utils/interaction/hasRequiredPermissions.js";
import SelectMenu from "../classes/SelectMenu.js";
import signup from "../selectMenus/deployment_role_select.js";
import { userIsOnCooldownWithReply } from "../utils/interaction/checkCooldown.js";

const _kSelectMenus: Map<string, SelectMenu> = new Map();

_kSelectMenus.set(signup.id, signup);

function getSelectMenuById(id: string) {
    return _kSelectMenus.get(id);
}

export default {
    callback: async function (interaction: AnySelectMenuInteraction) {
        const selectMenu = getSelectMenuById(interaction.customId) || getSelectMenuById(interaction.customId.split("-")[0]);
        if (!selectMenu) return;

        if (await checkBlacklist(interaction, selectMenu.blacklistedRoles)) { return; }
        if (!await hasRequiredRoles(interaction, selectMenu.requiredRoles)) { return; }
        if (!await hasRequiredPermissions(interaction, selectMenu.permissions)) { return; }
        if (await userIsOnCooldownWithReply(interaction, selectMenu.id, selectMenu.cooldown)) { return; }

        try {
            log(`[Select Menu Clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
            selectMenu.callback({ interaction });
        } catch (e) {
            error(`[Select Menu Error] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
            error(e);

            const embed = buildErrorEmbed()
                .setDescription(":x: **An error occurred while executing this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}
