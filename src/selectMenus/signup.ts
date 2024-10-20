import { EmbedBuilder } from "discord.js";
import SelectMenu from "../classes/SelectMenu.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";

export default new SelectMenu({
    id: "signup",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const updateEmbed = async () => {
            const signups = await Signups.find({ where: { deploymentId: deployment.id } });
            const backups = await Backups.find({ where: { deploymentId: deployment.id } });

            const embed = new EmbedBuilder()
                .setTitle(deployment.title)
                .addFields([
                    {
                        name: "Event Info:",
                        value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d>\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.endTime) / 1000)}:t>`
                    },
                    {
                        name: "Description:",
                        value: deployment.description
                    },
                    {
                        name: "Signups:",
                        value: signups.map(signup => {
                            const role = config.roles.find(role => role.name === signup.role);
                            return `${role.emoji} <@${signup.userId}>`;
                        }).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Backups:",
                        value: backups.length ?
                            backups.map(backup => `<@${backup.userId}>`).join("\n")
                            : "` - `",
                        inline: true
                    }
                ])
                .setColor("Green")
                .setFooter({ text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4` })
                .setTimestamp(Number(deployment.startTime));

            return await interaction.update({ embeds: [embed] });
        };

        const alreadySignedUp = await Signups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });
        const alreadySignedUpBackup = await Backups.findOne({ where: { deploymentId: deployment.id, userId: interaction.user.id } });

        if (alreadySignedUp) {
            const backupsCount = await Backups.count({ where: { deploymentId: deployment.id } });

            if (alreadySignedUp.role == interaction.values[0]) {
                if (deployment.user == interaction.user.id) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("You cannot abandon for your own deployment!");

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