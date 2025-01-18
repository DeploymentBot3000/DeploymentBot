import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, Colors, GuildMember, User } from "discord.js";
import { Like } from "typeorm";
import Command from "../classes/Command.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { buildInfoEmbed } from "../embeds/embed.js";
import Deployment from "../tables/Deployment.js";
import { DeploymentManager } from "../utils/deployments.js";
import { sendDmToUser } from "../utils/dm.js";
import { formatMemberForLog, formatUserForLog } from "../utils/interaction_format.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { action, success } from "../utils/logger.js";

export default new Command({
    name: "remove",
    description: "Remove a user from a deployment",
    permissions: {
        requiredPermissions: ["SendMessages"],
    },
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
    callback: async function ({ interaction }: { interaction: ChatInputCommandInteraction<'cached'> }) {
        const targetUser = interaction.options.getUser("user");
        const deploymentTitle = interaction.options.getString("deployment");
        const reason = interaction.options.getString("reason") || "No reason provided";
        action(`${formatMemberForLog(interaction.member)} attempting to remove ${formatUserForLog(targetUser)} from deployment: ${deploymentTitle}`, "Remove");

        await interaction.deferReply({ ephemeral: true });
        try {
            const error = await _removePlayerFromDeployment(interaction.member, targetUser, deploymentTitle, reason);
            if (error instanceof Error) {
                await editReplyWithError(interaction, error.message);
                return;
            }
        } catch (e: any) {
            await editReplyWithError(interaction, 'An error occured while removing the player');
            throw e;
        }
        await editReplyWithSuccess(interaction, 'Succesfuly removed player');
        success(`${formatMemberForLog(interaction.member)} removed ${formatUserForLog(targetUser)} from deployment: ${deploymentTitle}`, "Remove");
    }
});

async function _removePlayerFromDeployment(member: GuildMember, targetUser: User, deploymentTitle: string, reason: string): Promise<Error> {
    const newDetails = await DeploymentManager.get().remove(member, targetUser, deploymentTitle);
    if (newDetails instanceof Error) {
        return newDetails;
    }

    const embed = buildDeploymentEmbed(newDetails, Colors.Green, /*started=*/false);
    await newDetails.message.edit({ embeds: [embed] });

    // Send DM to removed user
    await sendDmToUser(targetUser, {
        embeds: [buildInfoEmbed()
            .setTitle("Deployment Removal")
            .setDescription(`You have been removed from deployment: **${deploymentTitle}**\n**By:** <@${member.id}>\n**Reason:** ${reason}`)
        ]
    });
    return null;
}
