import { EmbedBuilder } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";
import checkBlacklist from "../utils/interaction/checkBlacklist.js";

export default new SelectMenu({
    id: "signup",
    cooldown: 5,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [],
    func: async function({ interaction }) {

        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const updateEmbed = async () => {
            const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);
            return await interaction.update({ embeds: [embed] });
        };

        const newRole = interaction.values[0];
        const alreadySignedUp = await Signups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });
        const alreadySignedUpBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

        if(alreadySignedUp) { // if already signed up logic
            if(newRole == "backup") { // switching to backup
                if (deployment.user == interaction.user.id) { // error out if host tries to signup as a backup
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("You cannot signup as a backup to your own deployment!");
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });
                if (backupsCount >= 4) { // errors out if backup slots are full
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Backup slots are full!");
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await alreadySignedUp.remove();
                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else if(alreadySignedUp?.role == newRole) { // checks if new role is the same as the old role
                if (deployment.user == interaction.user.id) { // errors out if host tries to leave own deployment
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("You cannot abandon your own deployment!");
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await alreadySignedUp.remove();
            } else { // if not above cases switch role
                await Signups.update({
                    userId: interaction.user.id,
                    deploymentId: deployment.id
                }, {
                    role: interaction.values[0]
                });
            }
        } else if(alreadySignedUpBackup) { // if already a backup logic
            if(newRole == "backup") await alreadySignedUpBackup.remove(); // removes player if they new role is same as old
            else { // tris to move backup diver to primary
                const signupsCount = await Signups.count({where: {deploymentId: deployment.id}});

                if (signupsCount >= 4) {
                    const errorEmbed = buildEmbed({preset: "error"})
                        .setDescription("Sign up slots are full!");
                    return await interaction.reply({embeds: [errorEmbed], ephemeral: true});
                }

                await alreadySignedUpBackup.remove();
                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: interaction.values[0]
                });
            }
        } else { // default signup logic
            if(newRole == "backup") {
                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });

                if (backupsCount >= 4) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Backup slots are full!");
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else {
                const signupsCount = await Signups.count({where: {deploymentId: deployment.id}});

                if (signupsCount >= 4) {
                    const errorEmbed = buildEmbed({preset: "error"})
                        .setDescription("Sign up slots are full!");
                    return await interaction.reply({embeds: [errorEmbed], ephemeral: true});
                }

                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: interaction.values[0]
                });
            }
        }
        return await updateEmbed();
    }
})