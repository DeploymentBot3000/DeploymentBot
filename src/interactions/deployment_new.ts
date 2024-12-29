import {
    ActionRowBuilder,
    ButtonInteraction,
    ComponentType,
    DiscordjsErrorCodes,
    GuildTextBasedChannel,
    ModalBuilder,
    ModalSubmitInteraction,
    Snowflake,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { Duration } from "luxon";
import * as emoji from 'node-emoji';
import Button from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import config from "../config.js";
import LatestInput from "../tables/LatestInput.js";
import { DeploymentDetails, DeploymentManager } from "../utils/deployments.js";
import getStartTime from "../utils/getStartTime.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction/replies.js";
import { action, success } from "../utils/logger.js";

export const DeploymentNewButton = new Button({
    id: "newDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }: { interaction: ButtonInteraction }) {
        await onNewDeploymentButtonPress(interaction);
    }
});

export const DeploymentNewModal = new Modal({
    id: "newDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }) {
        await onNewDeploymentModalSubmit(interaction);
    }
});

async function onNewDeploymentButtonPress(interaction: ButtonInteraction) {
    const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });
    const modal = buildNewDeploymentModal(latestInput?.title, latestInput?.difficulty, latestInput?.description);
    await interaction.showModal(modal);
}

async function onNewDeploymentModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    action(`User ${interaction.user.tag} creating new deployment`, "NewDeployment");
    await interaction.deferReply({ ephemeral: true });

    const details = await _parseDeploymentInput(interaction);
    if (details instanceof Error) {
        await editReplyWithError(interaction, details.message);
        return;
    }

    const channel = await _getSignupChannel(interaction);
    if (channel instanceof Error) {
        await editReplyWithError(interaction, channel.message);
        return;
    }

    try {
        await DeploymentManager.get().create(interaction.user.id, channel, details);
    } catch (e: any) {
        await editReplyWithError(interaction, 'An error occurred while creating the deployment');
        throw e;
    }

    await editReplyWithSuccess(interaction, 'Deployment created successfully');
    success(`New deployment "${details.title}" Guild: ${interaction.guild.name}(${interaction.guild.id}); User: ${interaction.member.nickname}(${interaction.member.displayName}/${interaction.user.username}/${interaction.user.id});`, "NewDeployment");
}

function buildNewDeploymentModal(title: string, difficulty: string, description: string) {
    return new ModalBuilder().setTitle("New Deployment").setCustomId("newDeployment").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("title").setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setValue(title).setMaxLength(50)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("difficulty").setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setValue(difficulty).setMaxLength(15)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(description)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH:MM UTC(+/-)X").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50)
        )
    );
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

    let selectMenuResponse: StringSelectMenuInteraction;
    try {
        selectMenuResponse = await interaction.channel.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: Duration.fromDurationLike({ minutes: 1 }).toMillis(),
            filter: i => i.user.id === interaction.user.id && i.customId === "channel",
        });
    } catch (e: any) {
        if (e.code == DiscordjsErrorCodes.InteractionCollectorError && e.message.includes('time')) {
            return new Error("Channel selection timed out");
        }
        throw e;
    }

    const channelId = selectMenuResponse.values[0].split("-")[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        throw new Error(`Can't find channel with id: ${selectMenuResponse.values[0]}`);
    }
    if (!channel.isTextBased()) {
        throw new Error("Selected channel is not a text channel");
    }
    return channel;
}

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
