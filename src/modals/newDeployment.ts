import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    GuildTextBasedChannel,
    ModalSubmitInteraction,
    Snowflake,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from "discord.js";
import { DateTime, Duration } from "luxon";
import * as emoji from 'node-emoji';
import Modal from "../classes/Modal.js";
import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import LatestInput from "../tables/LatestInput.js";
import Signups from "../tables/Signups.js";
import { buildButton, buildErrorEmbed, buildSuccessEmbed } from "../utils/embedBuilders/configBuilders.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import getStartTime from "../utils/getStartTime.js";
import { action, debug, error, success } from "../utils/logger.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";
import { editReplyWithError, replyWithError } from "../utils/interaction/replyWithError.js";

async function storeLatestInput(userId: Snowflake, title: string, difficulty: string, description: string) {
    const latestInput = await LatestInput.findOne({ where: { userId: userId } });

    if (latestInput) {
        latestInput.title = title;
        latestInput.difficulty = difficulty;
        latestInput.description = description;
        await latestInput.save();
    } else {
        await LatestInput.insert({
            userId: userId,
            title: title,
            difficulty: difficulty,
            description: description
        });
    }
}

async function reportFailedInteractionToUser(interaction: ModalSubmitInteraction, e: Error) {
    const errorEmbed = buildErrorEmbed()
        .setDescription(`The following error occurred while processing your request: ${e.toString()}`);
    
    await interaction.followUp({
        embeds: [errorEmbed],
        ephemeral: true
    });
}

type DeploymentDetails = { title: string, difficulty: string, description: string, startTime: DateTime, endTime: DateTime };

export default new Modal({
    id: "newDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction }) {
        action(`User ${interaction.user.tag} creating new deployment`, "NewDeployment");
        
        const details = await _parseDeploymentInput(interaction);
        if (details instanceof Error) {
            await replyWithError(interaction, "Parsing Error!", details.message);
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const channel = await _getSignupChannel(interaction);
            if (channel instanceof Error) {
                await editReplyWithError(interaction, /*title=*/null, channel.message);
                return;
            }

            const msg = await _sendDeploymentSignupMessage(interaction, channel, details);

            let deployment: Deployment = null;
            try {
                deployment = await Deployment.create({
                    channel: channel.id,
                    message: msg.id,
                    user: interaction.user.id,
                    title: details.title,
                    difficulty: details.difficulty,
                    description: details.description,
                    startTime: details.startTime.toMillis(),
                    endTime: details.endTime.toMillis(),
                    started: false,
                    deleted: false,
                    edited: false,
                    noticeSent: false
                }).save();

                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: "Offense"
                });
            } catch (e) {
                debug('Failed to save deployment to database');
                debug('Deleting deployment sign up message');
                await msg.delete().catch((e: any) => { error(`Failed to delete ${details.title} signup embed`); console.log(e); });
                debug('Deleting success message');
                await interaction.deleteReply().catch(() => { });
                if (deployment != null) {
                    debug('Deleting saved deployment from database');
                    await Deployment.remove(deployment).catch(e => { error(`Failed to delete ${deployment.title} from db`); console.log(e); });
                }
                throw e;
            }

            await interaction.editReply({
                // your response content
            });

            success(`New deployment "${details.title}" created by ${interaction.user.tag}`, "NewDeployment");
        } catch (e) {
            error(`Failed to handle interaction in channel: ${interaction.channel.name} for user: ${interaction.user.tag} (${interaction.user.id})`); console.log(e);
            await reportFailedInteractionToUser(interaction, e).catch(e => { error(`Failed to respond to user with error for deployment ${details.title}`); console.log(e); });
        }
    }
})

function _buildDeploymentEmbed(title: string, startDate: DateTime, googleCalendarLink: string, endTime: DateTime, difficulty: string, description: string, interaction: ModalSubmitInteraction) {
    const role = config.roles.find(role => role.name === "Offense");

    return new EmbedBuilder()
        .setTitle(title)
        .addFields([
            {
                name: "Deployment Details:",
                value: `📅 ${formatDiscordTime(startDate, DiscordTimestampFormat.SHORT_DATE)} - [Calendar](${googleCalendarLink})\n
🕒 ${formatDiscordTime(startDate, DiscordTimestampFormat.SHORT_TIME)} - ${formatDiscordTime(endTime, DiscordTimestampFormat.SHORT_TIME)}:\n
🪖 ${difficulty}`
            },
            {
                name: "Description:",
                value: description
            },
            {
                name: "Signups:",
                value: `${role.emoji} ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.member.user.username}`,
                inline: true
            },
            {
                name: "Backups:",
                value: "` - `",
                inline: true
            }
        ])
        .setColor("Green")
        .setFooter({ text: `Sign ups: 1/4 ~ Backups: 0/4` })
        .setTimestamp(startDate.toMillis());
}

function hasEmoji(input: string): boolean {
    return input != emoji.strip(emoji.emojify(input));
}

async function _parseDeploymentInput(interaction: ModalSubmitInteraction): Promise<DeploymentDetails | Error> {
    const title = interaction.fields.getTextInputValue("title");
    const difficulty = interaction.fields.getTextInputValue("difficulty");
    const description = interaction.fields.getTextInputValue("description");

    if (hasEmoji(title) || hasEmoji(difficulty) || hasEmoji(description)) {
        return new Error("Emojis are not allowed in deployment fields");
    }
    const startTime = await getStartTime(interaction.fields.getTextInputValue("startTime"));
    if (startTime instanceof Error) {
        await storeLatestInput(interaction.user.id, title, difficulty, description);
        return startTime;
    }
    const endTime = startTime.plus(Duration.fromDurationLike({ hours: 2 }));
    return { title, difficulty, description, startTime, endTime };
}

/**
 * Handles the interaction for selecting a channel from a dropdown menu.
 * 
 * @param interaction - The interaction object from the modal submission.
 * @returns A promise that resolves to the selected text-based channel where the deployment signup should be posted or an error if the selection fails.
 * 
 * @throws Will throw an error if the selected channel is not found or is not a text-based channel.
 * 
 * @remarks
 * This function presents the user with a dropdown menu to select a channel. It waits for the user to make a selection,
 * and then validates the selected channel. If the selection times out or the selected channel is invalid, it returns an error.
 * 
 * The function also removes any previous input from the user and updates the interaction with a success message upon successful selection.
 */
async function _getSignupChannel(interaction: ModalSubmitInteraction): Promise<GuildTextBasedChannel | Error> {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setPlaceholder("Select a channel").setCustomId("channel").addOptions(
            config.channels.map(channel => ({
                label: channel.name,
                value: `${channel.channel}-${Math.random() * 1000}`,
                emoji: channel.emoji
            })))
    );

    await interaction.editReply({
        content: `Helldivers, it's time to pick your battlefield. Select your region below to ensure you're dropped into the right chaos with the least lag (because lag's the real enemy here). Select the appropriate region to join your battalion's ranks!\n\n<@${interaction.user.id}>`,
        components: [row]
    });

    const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });
    if (latestInput) {
        await latestInput.remove();
    }

    const selectMenuResponse = await interaction.channel.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id && i.customId === "channel",
        time: Duration.fromDurationLike({ minutes: 1 }).toMillis()
    }).catch(() => null as null) as StringSelectMenuInteraction;
    if (!selectMenuResponse) {
        interaction.editReply({ content: "Channel selection timed out", components: [] });
        return new Error("Channel selection timed out");
    }

    const successEmbed = buildSuccessEmbed()
        .setDescription("Deployment created successfully");
    await selectMenuResponse.update({ embeds: [successEmbed], components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => { }), 45000);

    const channelId = selectMenuResponse.values[0].split("-")[0];
    const channel = interaction.client.channels.cache.get(channelId);
    if (!channel) {
        throw new Error(`Can't find channel with id: ${selectMenuResponse.values[0]}`);
    }
    if (!channel.isTextBased()) {
        throw new Error("Selected channel is not a text channel");
    }
    return channel as GuildTextBasedChannel;
}

async function _sendDeploymentSignupMessage(interaction: ModalSubmitInteraction, channel: GuildTextBasedChannel, details: DeploymentDetails) {
    const googleCalendarLink = getGoogleCalendarLink(details.title, details.description, details.startTime.toMillis(), details.endTime.toMillis());

    const embed = _buildDeploymentEmbed(details.title, details.startTime, googleCalendarLink, details.endTime, details.difficulty, details.description, interaction);

    const rows = [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setPlaceholder("Select a role to sign up...").setCustomId("signup").addOptions(
                ...config.roles.map(role => ({
                    label: role.name,
                    value: role.name,
                    emoji: role.emoji || undefined
                })),
                {
                    label: "Backup",
                    value: "backup",
                    emoji: config.backupEmoji
                }
            )),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("editDeployment"),
            buildButton("deleteDeployment"),
            new ButtonBuilder()
                .setCustomId("leaveDeployment")
                .setLabel("Leave")
                .setStyle(ButtonStyle.Danger)
        )
    ];

    return await channel.send({ content: `<@${interaction.user.id}> is looking for people to group up! ⬇️`, embeds: [embed], components: rows });
}


