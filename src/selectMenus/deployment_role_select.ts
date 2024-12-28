import SelectMenu from "../classes/SelectMenu.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { buildErrorEmbed } from "../utils/embedBuilders/configBuilders.js";
import { buildDeploymentEmbedFromDb } from "../utils/embedBuilders/signupEmbedBuilder.js";
import config from "../config.js";
import { Duration } from "luxon";
import { Colors } from "discord.js";

export default new SelectMenu({
    id: "signup",
    cooldown: Duration.fromDurationLike({ seconds: config.selectMenuCooldownSeconds }),
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }): Promise<void> {

        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildErrorEmbed()
                .setDescription("Deployment not found!");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const updateEmbed = async () => {
            const embed = await buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);
            await interaction.update({ embeds: [embed] });
            return;
        };

        const newRole = interaction.values[0];
        const alreadySignedUp = await Signups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });
        const alreadySignedUpBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

        if(alreadySignedUp) { // if already signed up logic
            if(newRole == "backup") { // switching to backup
                if (deployment.user == interaction.user.id) { // error out if host tries to signup as a backup
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("You cannot signup as a backup to your own deployment!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
                }

                const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });
                if (backupsCount >= 4) { // errors out if backup slots are full
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("Backup slots are full!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
                }

                await alreadySignedUp.remove();
                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else if(alreadySignedUp?.role == newRole) { // checks if new role is the same as the old role
                if (deployment.user == interaction.user.id) { // errors out if host tries to leave own deployment
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("You cannot abandon your own deployment!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
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
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("Sign up slots are full!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
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
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("Backup slots are full!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
                }

                await Backups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id
                });
            } else {
                const signupsCount = await Signups.count({where: {deploymentId: deployment.id}});

                if (signupsCount >= 4) {
                    const errorEmbed = buildErrorEmbed()
                        .setDescription("Sign up slots are full!");
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
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