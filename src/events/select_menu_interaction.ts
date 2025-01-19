import { AnySelectMenuInteraction } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import signup from "../selectMenus/deployment_role_select.js";
import { checkCooldown } from "../utils/cooldowns.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { sendErrorToLogChannel } from "../utils/log_channel.js";
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

        let e = await checkPermissions(interaction.member, selectMenu.permissions);
        if (e) {
            await replyWithError(interaction, e.message);
            return;
        }

        e = checkCooldown(interaction.user.id, selectMenu.id, selectMenu.cooldown);
        if (e) {
            // Force update to reset the select menu.
            await interaction.message.edit({});
            await replyWithError(interaction, e.message);
            return;
        }

        try {
            await selectMenu.callback({ interaction });
        } catch (e) {
            await sendErrorToLogChannel(e, interaction.client);
        }
    },
}
