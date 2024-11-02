import { ApplicationCommandOptionType, AutocompleteInteraction, GuildMember } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { Like } from "typeorm";
import config from "../config.js";

export default new Slashcommand({
    name: "remove",
    description: "Remove a user from a deployment",
    permissions: ["SendMessages"],
    requiredRoles: [{ role: "Verified", required: true }],
    cooldown: 0,
    options: [
        {
            name: "user",
            description: "The user to remove",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "deployment",
            description: "The deployment title",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],
    autocomplete: async function({ interaction }: { interaction: AutocompleteInteraction }) {
        const focusedValue = interaction.options.getFocused();
        const deployments = await Deployment.find({
            where: {
                title: Like(`%${focusedValue}%`),
                deleted: false,
                started: false
            },
            take: 25
        });

        await interaction.respond(
            deployments.map(dep => ({
                name: dep.title,
                value: dep.title
            }))
        );
    },
    func: async function({ interaction }) {
        const member = interaction.member as GuildMember;
        const targetUser = interaction.options.getUser("user");
        const deploymentTitle = interaction.options.getString("deployment");

        // Find the deployment
        const deployment = await Deployment.findOne({ 
            where: { 
                title: deploymentTitle,
                deleted: false,
                started: false
            } 
        });

        if (!deployment) {
            return await interaction.reply({ 
                embeds: [buildEmbed({ preset: "error" })
                    .setDescription("Deployment not found or has already started/ended")], 
                ephemeral: true 
            });
        }

        // Check if user is admin or deployment host
        const isAdmin = member.permissions.has("Administrator");
        const isHost = deployment.user === interaction.user.id;

        if (!isAdmin && !isHost) {
            return await interaction.reply({ 
                embeds: [buildEmbed({ preset: "error" })
                    .setDescription("You must be an administrator or the deployment host to remove users")], 
                ephemeral: true 
            });
        }

        // Prevent removing self
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({ 
                embeds: [buildEmbed({ preset: "error" })
                    .setDescription("You cannot remove yourself from the deployment")], 
                ephemeral: true 
            });
        }

        // Find and remove user from signups or backups
        const signup = await Signups.findOne({ 
            where: { 
                deploymentId: deployment.id, 
                userId: targetUser.id 
            } 
        });
        const backup = await Backups.findOne({ 
            where: { 
                deploymentId: deployment.id, 
                userId: targetUser.id 
            } 
        });

        if (!signup && !backup) {
            return await interaction.reply({ 
                embeds: [buildEmbed({ preset: "error" })
                    .setDescription("User is not signed up for this deployment")], 
                ephemeral: true 
            });
        }

        // Remove from database
        if (signup) await signup.remove();
        if (backup) await backup.remove();

        // Send DM to removed user
        try {
            await targetUser.send({
                embeds: [buildEmbed({ preset: "info" })
                    .setTitle("Deployment Removal")
                    .setDescription(`You have been removed from the deployment: **${deployment.title}**\nBy: <@${interaction.user.id}>`)
                ]
            });
        } catch (error) {
            console.error("Failed to send DM to removed user:", error);
        }

        // Update deployment message
        const channel = await interaction.client.channels.fetch(deployment.channel);
        if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(deployment.message);
            const currentEmbed = message.embeds[0];
            const signups = await Signups.find({ where: { deploymentId: deployment.id } });
            const backups = await Backups.find({ where: { deploymentId: deployment.id } });

            const newEmbed = {
                ...currentEmbed.data,
                fields: currentEmbed.data.fields?.map(field => {
                    if (field.name === "Signups:") {
                        return {
                            ...field,
                            value: signups.map(signup => {
                                const role = config.roles.find(r => r.name === signup.role);
                                return `${role.emoji} <@${signup.userId}>`;
                            }).join("\n") || "` - `"
                        };
                    }
                    if (field.name === "Backups:") {
                        return {
                            ...field,
                            value: backups.length ? 
                                backups.map(backup => `<@${backup.userId}>`).join("\n") 
                                : "` - `"
                        };
                    }
                    return field;
                })
            };

            newEmbed.footer = { 
                text: `Sign ups: ${signups.length}/4 ~ Backups: ${backups.length}/4` 
            };

            await message.edit({ embeds: [newEmbed] });
        }

        await interaction.reply({ 
            embeds: [buildEmbed({ preset: "success" })
                .setDescription(`Successfully removed <@${targetUser.id}> from the deployment`)], 
            ephemeral: true 
        });
    }
}); 