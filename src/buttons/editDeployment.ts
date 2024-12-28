import {
    ActionRowBuilder,
    ButtonInteraction,
    ComponentType,
    DiscordjsErrorCodes,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import config from "../config.js";
import { action } from "../utils/logger.js";
import { DateTime, Duration } from "luxon";
import { editReplyWithError } from "../utils/interaction/replies.js";

export default new Button({
    id: "editDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
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

        const modal = new ModalBuilder().setTitle("Edit Deployment").setCustomId(`editDeployment-${deployment.id}`).addComponents(rows);
        await selectMenuInteraction.showModal(modal);
    }
})

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
