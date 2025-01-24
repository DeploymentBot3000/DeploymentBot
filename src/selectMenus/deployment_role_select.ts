import { AnySelectMenuInteraction, Colors, StringSelectMenuInteraction } from "discord.js";
import { Duration } from "luxon";
import SelectMenu from "../classes/SelectMenu.js";
import { config } from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { DeploymentManager, parseRole } from "../utils/deployments.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";

export default new SelectMenu({
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
        await onSignupSelectMenuInteraction(interaction);
    }
});

async function onSignupSelectMenuInteraction(interaction: StringSelectMenuInteraction<'cached'>) {
    const role = parseRole(interaction.values[0]);

    await interaction.deferReply({ ephemeral: true });

    const newDetails = await DeploymentManager.get().signup(interaction.member.id, interaction.message.id, role);
    if (newDetails instanceof Error) {
        await interaction.message.edit({});
        await editReplyWithError(interaction, newDetails.message);
        return;
    }
    const embed = buildDeploymentEmbed(newDetails, Colors.Green, /*started=*/false);
    await interaction.message.edit({ embeds: [embed] });
    await editReplyWithSuccess(interaction, `You have signed up to deployment: ${newDetails.title} as: ${role}`);
    success(`User: ${formatMemberForLog(interaction.member)} joined Deployment: ${newDetails.title}  as ${role}; Message: ${newDetails.message.id}; ID: ${newDetails.id}`);
}
