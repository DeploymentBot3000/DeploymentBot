import { AnySelectMenuInteraction, StringSelectMenuInteraction } from "discord.js";
import { Duration } from "luxon";
import SelectMenu from "../classes/SelectMenu.js";
import { config } from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { DeploymentManager, formatDeployment, parseRole } from "../utils/deployments.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { deferReply, editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";

export const DeploymentSignupSelectMenu = new SelectMenu({
    id: "signup",
    cooldown: Duration.fromDurationLike({ seconds: config.selectMenuCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: AnySelectMenuInteraction<'cached'> }): Promise<void> {
        if (!interaction.isStringSelectMenu()) {
            console.log(interaction);
            throw new Error('Wrong interaction type');
        }
        if (!await deferReply(interaction)) { return; }
        await onSignupSelectMenuInteraction(interaction);
    }
});

async function onSignupSelectMenuInteraction(interaction: StringSelectMenuInteraction<'cached'>) {
    const role = parseRole(interaction.values[0]);

    const newDetails = await DeploymentManager.get().signup(interaction.member.id, interaction.message.id, role);
    if (newDetails instanceof Error) {
        await interaction.message.edit({});
        await editReplyWithError(interaction, newDetails.message);
        return;
    }
    const embed = buildDeploymentEmbed(newDetails);
    await interaction.message.edit({ embeds: [embed] });
    await editReplyWithSuccess(interaction, `You have signed up to deployment: ${newDetails.title} as: ${role}`);
    success(`User: ${formatMemberForLog(interaction.member)} joined Deployment: ${formatDeployment(newDetails)}`, 'Deployment');
}
