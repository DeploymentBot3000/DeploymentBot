import { EmbedBuilder } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";
import checkBlacklist from "../utils/checkBlacklist.js";

export default new SelectMenu({
    id: "signup",
    cooldown: 5,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        if (await checkBlacklist(interaction.user.id, interaction.guild)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are blacklisted from participating in deployments");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const updateEmbed = async () => {
            const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);
            return await interaction.update({ embeds: [embed] });
        };

        const alreadySignedUp = await Signups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });
        const alreadySignedUpBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

        if (interaction.values[0] === "Leave Deployment") {
            if (deployment.user === interaction.user.id) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("You cannot leave your own deployment!");

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const existingSignup = await Signups.findOne({ 
                where: { 
                    deploymentId: deployment.id, 
                    userId: interaction.user.id 
                } 
            });
            const existingBackup = await Backups.findOne({ 
                where: { 
                    deploymentId: deployment.id, 
                    userId: interaction.user.id 
                } 
            });

            if (!existingSignup && !existingBackup) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("You are not signed up for this deployment!");

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            if (existingSignup) await existingSignup.remove();
            if (existingBackup) await existingBackup.remove();

            return await updateEmbed();
        }

        if (alreadySignedUp) {
            const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });

            if (alreadySignedUp.role == interaction.values[0]) {
                if (deployment.user == interaction.user.id) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("You cannot abandon your own deployment!");

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await alreadySignedUp.remove();
                return await updateEmbed();
            } else if (interaction.values[0] == "backup") {
                if (backupsCount >= 4) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Backup slots are full");

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await alreadySignedUp.remove();

                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });

                return await updateEmbed();
            } else {
                await alreadySignedUp.remove();

                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: interaction.values[0]
                });

                return await updateEmbed();
            }
        }

        if (alreadySignedUpBackup) {
            await alreadySignedUpBackup.remove();
        }

        if (interaction.values[0] == "backup") {
            const alreadyBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

            if (alreadyBackup) {
                await alreadyBackup.remove();

                return await updateEmbed();
            } else {
                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });

                if (backupsCount >= 4) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Backup slots are full");

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            }
        } else {
            const signupsCount = await Signups.count({ where: { deploymentId: deployment.id } });

            if (signupsCount >= 4) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Sign up slots are full");

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await Signups.insert({
                deploymentId: deployment.id,
                userId: interaction.user.id,
                role: interaction.values[0]
            });
        }

        return await updateEmbed();
    }
})