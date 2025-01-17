import { AnySelectMenuInteraction, Colors, StringSelectMenuInteraction } from "discord.js";
import { Duration } from "luxon";
import SelectMenu from "../classes/SelectMenu.js";
import { config } from "../config.js";
import { deprecated_buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { DeploymentRole, parseRole } from "../utils/deployments.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { editReplyWithError } from "../utils/interaction_replies.js";
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
    await interaction.deferReply({ ephemeral: true });

    try {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });
        if (!deployment) {
            await interaction.message.edit({});
            await editReplyWithError(interaction, "Deployment not found!");
            return;
        }

        const newRole = parseRole(interaction.values[0]);
        const alreadySignedUp = await Signups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });
        const alreadySignedUpBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

        if (alreadySignedUp) { // if already signed up logic
            if (newRole == DeploymentRole.BACKUP) { // switching to backup
                if (deployment.user == interaction.user.id) { // error out if host tries to signup as a backup
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "You cannot signup as a backup to your own deployment!");
                    return;
                }

                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });
                if (backupsCount >= 4) { // errors out if backup slots are full
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "Backup slots are full!");
                    return;
                }

                await alreadySignedUp.remove();
                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else if (alreadySignedUp?.role == newRole) { // checks if new role is the same as the old role
                if (deployment.user == interaction.user.id) { // errors out if host tries to leave own deployment
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "You cannot abandon your own deployment!");
                    return;
                }

                await alreadySignedUp.remove();
            } else { // if not above cases switch role
                await Signups.update({
                    userId: interaction.user.id,
                    deploymentId: deployment.id
                }, {
                    role: newRole
                });
            }
        } else if (alreadySignedUpBackup) { // if already a backup logic
            if (newRole == DeploymentRole.BACKUP) await alreadySignedUpBackup.remove(); // removes player if they new role is same as old
            else { // tris to move backup diver to primary
                const signupsCount = await Signups.count({ where: { deploymentId: deployment.id } });

                if (signupsCount >= 4) {
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "Sign up slots are full!");
                    return;
                }

                await alreadySignedUpBackup.remove();
                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: newRole
                });
            }
        } else { // default signup logic
            if (newRole == DeploymentRole.BACKUP) {
                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });

                if (backupsCount >= 4) {
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "Backup slots are full!");
                    return;
                }

                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else {
                const signupsCount = await Signups.count({ where: { deploymentId: deployment.id } });

                if (signupsCount >= 4) {
                    await interaction.message.edit({});
                    await editReplyWithError(interaction, "Sign up slots are full!");
                    return;
                }

                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: newRole
                });
            }
        }
        const embed = await deprecated_buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);
        await interaction.message.edit({ embeds: [embed] });
        await interaction.deleteReply();
        success(`User: ${formatMemberForLog(interaction.member)} joined Deployment: ${deployment.title}  as ${newRole}; Message: ${deployment.message}; ID: ${deployment.id}`);
    } catch (e: any) {
        console.log(e);
        // Force an update to reset the selected item.
        await interaction.message.edit({});
        await editReplyWithError(interaction, 'Interaction failed');
        throw e;
    }
}
