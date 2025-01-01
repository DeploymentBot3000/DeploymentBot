import colors from "colors";
import { AnySelectMenuInteraction } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import signup from "../selectMenus/deployment_role_select.js";
import { userIsOnCooldownWithReply } from "../utils/cooldowns.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { sendErrorToLogChannel } from "../utils/log_channel.js";
import { error, log } from "../utils/logger.js";
import { checkPermissions } from "../utils/permissions.js";

const _kSelectMenus: Map<string, SelectMenu> = new Map();

_kSelectMenus.set(signup.id, signup);

function getSelectMenuById(id: string) {
    return _kSelectMenus.get(id);
}

export default {
    callback: async function (interaction: AnySelectMenuInteraction<'cached'>) {
        const selectMenu = getSelectMenuById(interaction.customId) || getSelectMenuById(interaction.customId.split("-")[0]);
        if (!selectMenu) return;

        const e = await checkPermissions(interaction.member, selectMenu.permissions);
        if (e) {
            await replyWithError(interaction, e.message);
            return;
        }

        if (await userIsOnCooldownWithReply(interaction, selectMenu.id, selectMenu.cooldown)) { return; }

        try {
            log(`[Select Menu Clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
            await selectMenu.callback({ interaction });
        } catch (e) {
            error(`[Select Menu Error] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
            await sendErrorToLogChannel(e, interaction.client);
        }
    },
}
