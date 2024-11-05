import { ApplicationCommandOptionType, AutocompleteInteraction, GuildMember } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { Like } from "typeorm";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";
import { log, action, success, warn, error } from "../utils/logger.js";

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
        },
        {
            name: "reason",
            description: "Reason for removing the user",
            type: ApplicationCommandOptionType.String,
            required: false
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

        action(`${interaction.user.tag} attempting to remove ${targetUser.tag} from deployment "${deploymentTitle}"`, "Remove");

        // Find the deployment
        const deployment = await Deployment.findOne({ 
            where: { 
                title: deploymentTitle,
                deleted: false,
                started: false
            } 
        });

        if (!deployment) {
            warn(`Attempted removal from non-existent deployment "${deploymentTitle}"`, "Remove");
            return;
        }

        // Check if user is admin or deployment host
        const isAdmin = member.permissions.has("Administrator");
        const isHost = deployment.user === interaction.user.id;

        if (!isAdmin && !isHost) {
            warn(`${interaction.user.tag} attempted unauthorized removal from deployment`, "Remove");
            return;
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

        const reason = interaction.options.getString("reason") || "No reason provided";

        // Send DM to removed user
        try {
            await targetUser.send({
                embeds: [buildEmbed({ preset: "info" })
                    .setTitle("Deployment Removal")
                    .setDescription(`You have been removed from the deployment: **${deployment.title}**\n**By:** <@${interaction.user.id}>\n**Reason:** ${reason}`)
                ]
            });
        } catch (error) {
            console.error("Failed to send DM to removed user:", error);
        }

        // Update deployment message
        try {
            const channel = await interaction.client.channels.fetch(deployment.channel);
            if (!channel?.isTextBased()) {
                console.error("Channel not found or not text-based:", deployment.channel);
                throw new Error("Channel not found or not text-based");
            }
            const message = await channel.messages.fetch(deployment.message);
            const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

            await message.edit({ embeds: [embed] });
        } catch (error) {
            console.error("Failed to update deployment message:", error);
            await interaction.reply({ 
                embeds: [buildEmbed({ preset: "error" })
                    .setDescription("Successfully removed user but failed to update deployment message")], 
                ephemeral: true 
            });
            return;
        }

        success(`${targetUser.tag} removed from deployment "${deploymentTitle}" by ${interaction.user.tag}`, "Remove");

        await interaction.reply({ 
            embeds: [buildEmbed({ preset: "success" })
                .setDescription(`Successfully removed <@${targetUser.id}> from the deployment\nReason: ${reason}`)], 
            ephemeral: true 
        });
    }
}); 