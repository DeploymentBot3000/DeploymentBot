import {
    ActionRowBuilder,
    ButtonInteraction,
    ComponentType,
    DiscordjsErrorCodes,
    ModalSubmitInteraction,
    Snowflake,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextChannel
} from "discord.js";
import { Duration } from "luxon";
import Button from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import config from "../config.js";
import { buildNewDeploymentModal, getDeploymentModalValues, getDeploymentModalValuesRaw } from "../modals/deployments.js";
import LatestInput from "../tables/LatestInput.js";
import { DeploymentManager, DeploymentRole } from "../utils/deployments.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { action } from "../utils/logger.js";
import { formatDiscordTime } from "../utils/time.js";

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
    const modal = buildNewDeploymentModal(latestInput?.title, latestInput?.difficulty, latestInput?.description, latestInput?.startTime);
    await interaction.showModal(modal);
}

async function onNewDeploymentModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    action(`User ${interaction.user.tag} creating new deployment`, "NewDeployment");
    await interaction.deferReply({ ephemeral: true });
    try {
        let deployment = getDeploymentModalValues(interaction.fields);
        if (deployment instanceof Error) {
            const detailsRaw = getDeploymentModalValuesRaw(interaction.fields);
            await storeLatestInput(interaction.user.id, detailsRaw.title, detailsRaw.difficulty, detailsRaw.description, detailsRaw.startTime);
            await editReplyWithError(interaction, deployment.message);
            return;
        }
        deployment.host = {
            guildMember: interaction.member,
            role: DeploymentRole.OFFENSE,
        };

        {
            const channel = await _getSignupChannel(interaction);
            if (channel instanceof Error) {
                await editReplyWithError(interaction, channel.message);
                return;
            }
            deployment.channel = channel;
        }

        try {
            deployment = await DeploymentManager.get().create(deployment);
        } catch (e: any) {
            await editReplyWithError(interaction, 'An error occurred while creating the deployment');
            throw e;
        }

        const link = `https://discord.com/channels/${interaction.guild.id}/${deployment.channel.id}/${deployment.message.id}`;
        await interaction.user.send({ content: `You create a new deployment: ${deployment.title}.\nScheduled for: ${formatDiscordTime(deployment.startTime)} (${deployment.startTime.toISO()}).\n${link}` });

        await editReplyWithSuccess(interaction, 'Deployment created successfully');
    } catch (e: any) {
        await editReplyWithError(interaction, 'Failed to create deployment');
        throw e;
    }
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
async function _getSignupChannel(interaction: ModalSubmitInteraction): Promise<TextChannel | Error> {
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
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
        throw new Error(`Can't find channel with id: ${selectMenuResponse.values[0]}`);
    }
    if (!(channel instanceof TextChannel)) {
        throw new Error("Selected channel is not a text channel");
    }
    return channel;
}

async function storeLatestInput(userId: Snowflake, title: string, difficulty: string, description: string, startTime: string) {
    const latestInput = await LatestInput.findOne({ where: { userId: userId } });

    if (latestInput) {
        latestInput.title = title;
        latestInput.difficulty = difficulty;
        latestInput.description = description;
        latestInput.startTime = startTime;
        await latestInput.save();
    } else {
        await LatestInput.insert({
            userId: userId,
            title: title,
            difficulty: difficulty,
            description: description,
            startTime: startTime,
        });
    }
}
