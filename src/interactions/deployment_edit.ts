import {
    ActionRowBuilder,
    ButtonInteraction,
    Colors,
    ComponentType,
    DiscordjsErrorCodes,
    ModalBuilder,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { DateTime, Duration } from "luxon";
import * as emoji from 'node-emoji';
import Button from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import config from "../config.js";
import { buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import Deployment from "../tables/Deployment.js";
import { DeploymentManager } from "../utils/deployments.js";
import getStartTime from "../utils/getStartTime.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction/replies.js";
import { action } from "../utils/logger.js";

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

    const modal = _buildEditDeploymentModal(selectMenuInteraction, deployment);
    await selectMenuInteraction.showModal(modal);
}

function _buildEditDeploymentModal(selectMenuInteraction: StringSelectMenuInteraction, deployment: Deployment) {
    const rows: ActionRowBuilder<TextInputBuilder>[] = [];
    for (const choice of selectMenuInteraction.values) {
        switch (choice) {
            case "title":
                rows.push(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId("title").setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50).setValue(deployment.title)
                    ) as ActionRowBuilder<TextInputBuilder>
                );
                break;
            case "difficulty":
                rows.push(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId("difficulty").setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(15).setValue(deployment.difficulty)
                    ) as ActionRowBuilder<TextInputBuilder>
                );
                break;
            case "description":
                rows.push(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(deployment.description)
                    ) as ActionRowBuilder<TextInputBuilder>
                );
                break;
            case "startTime":
                const date = new Date(Number(deployment.startTime));
                rows.push(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH UTC+2").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50).setValue(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()} UTC+0`)
                    ) as ActionRowBuilder<TextInputBuilder>
                );
                break;
        }
    }

    return new ModalBuilder().setTitle("Edit Deployment").setCustomId(`editDeployment-${deployment.id}`).addComponents(rows);
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
            { label: "Title", value: "title", emoji: config.editEmoji },
            { label: "Difficulty", value: "difficulty", emoji: config.editEmoji },
            { label: "Description", value: "description", emoji: config.editEmoji },
            { label: "Start Time", value: "startTime", emoji: config.editEmoji }
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

    const startTimeInput = async () => {
        if (!_getFieldValue(interaction, "startTime")) {
            return null;
        }
        const startTime = await getStartTime(interaction.fields.getTextInputValue("startTime"));
        if (startTime instanceof Error) {
            await editReplyWithError(interaction, startTime.message);
            return null;
        }
        return startTime.toMillis();
    }

    const title = _getFieldValue(interaction, "title");
    const difficulty = _getFieldValue(interaction, "difficulty");
    const description = _getFieldValue(interaction, "description");
    if (hasEmoji(title) || hasEmoji(difficulty) || hasEmoji(description)) {
        await editReplyWithError(interaction, 'Emojis are not allowed in deployment fields');
        return;
    }
    const startTime = await startTimeInput();
    const deploymentId = Number(interaction.customId.split("-")[1]);

    try {
        const deployment = await DeploymentManager.get().update(deploymentId, {
            title: title,
            difficulty: difficulty,
            description: description,
            startTime: startTime ? DateTime.fromMillis(startTime) : null,
            endTime: startTime ? DateTime.fromMillis(startTime).plus(Duration.fromDurationLike({ hours: 2 })) : null,
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

function hasEmoji(input: string): boolean {
    return input != emoji.strip(emoji.emojify(input));
}
