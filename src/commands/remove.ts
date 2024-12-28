import { ApplicationCommandOptionType, AutocompleteInteraction, Colors, GuildMember } from "discord.js";
import Command from "../classes/Command.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import {Like} from "typeorm";
import { buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import {action, success, warn} from "../utils/logger.js";

export default new Command({
    name: "remove",
    description: "Remove a user from a deployment",
    permissions: ["SendMessages"],
    requiredRoles: [{ role: "Verified", required: true }],
    blacklistedRoles: [],
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
    callback: async function ({ interaction }) {
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
            await interaction.reply({ 
                embeds: [buildErrorEmbed()
                    .setDescription("You cannot remove yourself from the deployment")], 
                ephemeral: true 
            });
            return;
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
            await interaction.reply({ 
                embeds: [buildErrorEmbed()
                    .setDescription("User is not signed up for this deployment")], 
                ephemeral: true 
            });
            return;
        }

        // Remove from database
        if (signup) await signup.remove();
        if (backup) await backup.remove();

        const reason = interaction.options.getString("reason") || "No reason provided";

        // Send DM to removed user
        try {
            await targetUser.send({
                embeds: [buildInfoEmbed()
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
            const embed = await buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);

            await message.edit({ embeds: [embed] });
        } catch (error) {
            console.error("Failed to update deployment message:", error);
            await interaction.reply({ 
                embeds: [buildErrorEmbed()
                    .setDescription("Successfully removed user but failed to update deployment message")], 
                ephemeral: true 
            });
            return;
        }

        success(`${targetUser.tag} removed from deployment "${deploymentTitle}" by ${interaction.user.tag}`, "Remove");

        await interaction.reply({ 
            embeds: [buildSuccessEmbed()
                .setDescription(`Successfully removed <@${targetUser.id}> from the deployment\nReason: ${reason}`)], 
            ephemeral: true 
        });
    }
}); 