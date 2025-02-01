import { AnySelectMenuInteraction } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import { DeploymentEditSelectMenu } from "../interactions/deployment_edit.js";
import { DeploymentSignupSelectMenu } from "../interactions/deployment_signup.js";
import { checkCooldown } from "../utils/cooldowns.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { sendErrorToLogChannel } from "../utils/log_channel.js";
import { checkPermissions } from "../utils/permissions.js";

const _kSelectMenus: Map<string, SelectMenu> = new Map();

_kSelectMenus.set(DeploymentSignupSelectMenu.id, DeploymentSignupSelectMenu);
_kSelectMenus.set(DeploymentEditSelectMenu.id, DeploymentEditSelectMenu);

function getSelectMenuById(id: string) {
    return _kSelectMenus.get(id);
}

export default {
    callback: async function (interaction: AnySelectMenuInteraction<'cached'>) {
        const selectMenu = getSelectMenuById(interaction.customId) || getSelectMenuById(interaction.customId.split("-")[0]);
        if (!selectMenu) {
            throw new Error(`Select Menu: ${interaction.customId} not found!`);
        }

        let e = await checkPermissions(interaction.member, selectMenu.permissions);
        if (e) {
            await replyWithError(interaction, e.message);
            return;
        }

        e = checkCooldown(interaction.user.id, `selectMenu-${selectMenu.id}`, selectMenu.cooldown);
        if (e) {
            // Force update to reset the select menu if possible.
            // This does not work for ephemeral messages.
            await interaction.message.edit({}).catch(() => { });
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
