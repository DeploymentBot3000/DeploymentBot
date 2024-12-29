import {
    ActionRowBuilder,
    ButtonInteraction,
    Colors,
    ComponentType,
    DiscordjsErrorCodes,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from "discord.js";
import { DateTime, Duration } from "luxon";
import * as emoji from 'node-emoji';
import Button from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import config from "../config.js";
import { buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import { buildEditDeploymentModal, DeploymentFields } from "../modals/deployments.js";
import Deployment from "../tables/Deployment.js";
import { DeploymentManager } from "../utils/deployments.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction/replies.js";
import { action } from "../utils/logger.js";
import { parseStartTime } from "../utils/time.js";

export const DeploymentEditButton = new Button({
    id: "editDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        await onDeploymentEditButtonPress(interaction);
    }
});

export const DeploymentEditModal = new Modal({
    id: "editDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }): Promise<void> {
        await onDeploymentEditModalSubmit(interaction);
    }
});

async function onDeploymentEditButtonPress(interaction: ButtonInteraction) {
    action(`User ${interaction.user.tag} attempting to edit deployment`, "EditDeployment");
    await interaction.deferReply({ ephemeral: true });

    const deployment = await _checkCanEditDeployment(interaction);
    if (deployment instanceof Error) {
        await editReplyWithError(interaction, deployment.message);
        return;
    }

    const selectMenuInteraction = await _selectFieldsToEdit(interaction);
    if (selectMenuInteraction instanceof Error) {
        await editReplyWithError(interaction, selectMenuInteraction.message);
        return;
    }
    // Now that we finished all the validation and about to show a modal, delete the select option reply.
    await interaction.deleteReply();

    const title = selectMenuInteraction.values.includes(DeploymentFields.TITLE) ? deployment.title : null;
    const difficulty = selectMenuInteraction.values.includes(DeploymentFields.DIFFICULTY) ? deployment.difficulty : null;
    const description = selectMenuInteraction.values.includes(DeploymentFields.DESCRIPTION) ? deployment.description : null;
    // We do not store the original string the user used or the user time zone and displaying the time in UTC time isn't very helpful.
    // Always show an empty field for start time.
    const startTime = selectMenuInteraction.values.includes(DeploymentFields.START_TIME) ? '' : null;
    const modal = buildEditDeploymentModal(deployment.id, title, difficulty, description, startTime);
    await selectMenuInteraction.showModal(modal);
}

async function _checkCanEditDeployment(interaction: ButtonInteraction): Promise<Deployment | Error> {
    const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });
    if (!deployment) {
        return new Error("Deployment not found");
    }
    if (deployment.user !== interaction.user.id) {
        return new Error("You do not have permission to edit this deployment");
    }
    if (deployment.noticeSent) {
        return new Error("You can't edit a deployment after the notice has been sent!");
    }

    const now = DateTime.now();
    const deploymentStartTime = DateTime.fromMillis(Number(deployment.startTime));
    if (now >= deploymentStartTime) {
        return new Error("You can't edit a deployment that has already started!");
    }

    const timeUntilStart = deploymentStartTime.diff(now, 'minutes');
    const editLeadTime = Duration.fromObject({ 'minutes': config.deployment_edit_lead_time_minutes });
    if (timeUntilStart < editLeadTime) {
        return new Error(`You can't edit a deployment within ${editLeadTime.toHuman()} of its start time!\nThis deployment starts in ${timeUntilStart.toHuman()}.`);
    }
    return deployment;
}

async function _selectFieldsToEdit(interaction: ButtonInteraction): Promise<StringSelectMenuInteraction | Error> {
    const selectmenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setCustomId("editDeployment").setPlaceholder("Select an option").setMaxValues(4).addOptions(
            { label: "Title", value: DeploymentFields.TITLE, emoji: config.editEmoji },
            { label: "Difficulty", value: DeploymentFields.DIFFICULTY, emoji: config.editEmoji },
            { label: "Description", value: DeploymentFields.DESCRIPTION, emoji: config.editEmoji },
            { label: "Start Time", value: DeploymentFields.START_TIME, emoji: config.editEmoji }
        )
    );
    await interaction.editReply({ content: "Select an option to edit", components: [selectmenu], embeds: [] });

    let selectMenuResponse: StringSelectMenuInteraction;
    try {
        selectMenuResponse = await interaction.channel.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: Duration.fromDurationLike({ minutes: 1 }).toMillis(),
            filter: i => i.user.id === interaction.user.id && i.customId === "editDeployment",
        });
    } catch (e: any) {
        if (e.code == DiscordjsErrorCodes.InteractionCollectorError && e.message.includes('time')) {
            return new Error("Selection timed out");
        }
        throw e;
    }
    if (!selectMenuResponse.values || !Array.isArray(selectMenuResponse.values)) {
        return new Error("Invalid selection");
    }
    return selectMenuResponse;
}

async function onDeploymentEditModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    await interaction.deferReply({ ephemeral: true });

    const title = _getFieldValue(interaction, "title");
    const difficulty = _getFieldValue(interaction, "difficulty");
    const description = _getFieldValue(interaction, "description");
    if (hasEmoji(title) || hasEmoji(difficulty) || hasEmoji(description)) {
        await editReplyWithError(interaction, 'Emojis are not allowed in deployment fields');
        return;
    }
    const startTime = _getStartTime(interaction);
    if (startTime instanceof Error) {
        await editReplyWithError(interaction, startTime.message);
        return;
    }
    const deploymentId = Number(interaction.customId.split("-")[1]);

    try {
        const deployment = await DeploymentManager.get().update(deploymentId, {
            title: title,
            difficulty: difficulty,
            description: description,
            startTime: startTime ? startTime : null,
            endTime: startTime ? startTime.plus(Duration.fromDurationLike({ hours: 2 })) : null,
        });
        const channel = interaction.guild.channels.cache.get(deployment.channel);
        if (!channel.isTextBased()) {
            throw new Error(`Invalid channel type: ${channel.id}`);
        }
        const embed = await buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);
        await channel.messages.cache.get(deployment.message).edit({ embeds: [embed] });
    } catch (e: any) {
        await editReplyWithError(interaction, 'Failed to update deployment');
        throw e;
    }
    await editReplyWithSuccess(interaction, 'Deployment edited successfully');
}

function _getFieldValue(interaction: ModalSubmitInteraction, customId: string) {
    try {
        return interaction.fields.getTextInputValue(customId).trim();
    } catch {
        return "";
    }
}

function _getStartTime(interaction: ModalSubmitInteraction) {
    const startTime = _getFieldValue(interaction, "startTime");
    if (!startTime) {
        return null;
    }
    return parseStartTime(startTime);
}

function hasEmoji(input: string): boolean {
    return input != emoji.strip(emoji.emojify(input));
}
