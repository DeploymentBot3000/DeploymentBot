import {
    ActionRowBuilder,
    AnySelectMenuInteraction,
    ButtonInteraction,
    Colors,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    User
} from "discord.js";
import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import SelectMenu from "../classes/SelectMenu.js";
import { config } from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { buildInfoEmbed } from "../embeds/embed.js";
import { buildEditDeploymentModal, DeploymentFields, getDeploymentModalValues } from "../modals/deployments.js";
import Deployment from "../tables/Deployment.js";
import { checkCanEditDeployment, DeploymentDetails, DeploymentManager, formatDeployment } from "../utils/deployments.js";
import { sendDmToUser } from "../utils/dm.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { deferReply, editReplyWithError, editReplyWithSuccess, replyWithError, showModal } from "../utils/interaction_replies.js";
import { debug, success } from "../utils/logger.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";

// We cannot delete the ephemeral select menu that lets the user select the fields
// to edit with interaction message delete or any other direct way.
// The only way to delete ephemeral messages is with `interaction.deleteReply()`
// so we store in this map the original button interaction that created the select menu.
// When the use selects the fields to edit, we recover the button interaction
// from this cache and delete the button interaction reply (the select menu message).
// Note that we also have a timeout on the message and it is ephemeral, so it
// will eventually be deleted even if we don't explicitly delete it. It is just
// cleaner from the user's prespective to delete it as soon as it is no longer required.
// The map key is deployment id.
const _kEditButtonInteractionCache = new Map<number, ButtonInteraction>();

export const DeploymentEditButton = new Button({
    id: "editDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        if (!await deferReply(interaction)) { return; }
        await onDeploymentEditButtonPress(interaction);
    }
});

export const DeploymentEditModal = new Modal({
    id: "editDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }): Promise<void> {
        if (!await deferReply(interaction)) { return; }
        await onDeploymentEditModalSubmit(interaction);
    }
});

async function onDeploymentEditButtonPress(interaction: ButtonInteraction<'cached'>) {
    const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });
    if (!deployment) {
        await editReplyWithError(interaction, 'Deployment not found');
        return;
    }

    // This is a perliminary check to avoid showing a modal to someone that doesn't have edit permissions.
    // The permissions will be verified again in the transaction that performs the change.
    const error = checkCanEditDeployment(deployment, interaction.member.id);
    if (error instanceof Error) {
        await editReplyWithError(interaction, error.message);
        return;
    }

    const selectMenu = _buildSelectFieldsToEditActionRow(deployment.id);
    debug(`Presenting edit deployment select menu to interaction: ${interaction.id}`);
    await interaction.editReply({ content: "Select an option to edit", components: [selectMenu], embeds: [] });
    _kEditButtonInteractionCache.set(deployment.id, interaction);
    setTimeout(() => interaction.deleteReply().catch(() => { }), 60000).unref();
}

export const DeploymentEditSelectMenu = new SelectMenu({
    id: "editDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.selectMenuCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: AnySelectMenuInteraction<'cached'> }): Promise<void> {
        if (!interaction.isStringSelectMenu()) {
            console.log(interaction);
            throw new Error('Wrong interaction type');
        }
        await onEditDeploymentSelectMenuInteraction(interaction);
    }
});

async function onEditDeploymentSelectMenuInteraction(interaction: StringSelectMenuInteraction<'cached'>) {
    debug(`Editing fields: ${interaction.values.join(', ')}; InteractionID: ${interaction.id}`);

    const deployment = await Deployment.findOne({ where: { id: Number(interaction.customId.split('-')[1]) } });
    if (!deployment) {
        await replyWithError(interaction, 'Deployment not found');
        return;
    }
    _kEditButtonInteractionCache.get(deployment.id)?.deleteReply().catch(() => { });
    _kEditButtonInteractionCache.delete(deployment.id);

    const title = interaction.values.includes(DeploymentFields.TITLE) ? deployment.title : null;
    const difficulty = interaction.values.includes(DeploymentFields.DIFFICULTY) ? deployment.difficulty : null;
    const description = interaction.values.includes(DeploymentFields.DESCRIPTION) ? deployment.description : null;
    // We do not store the original string the user used or the user time zone and displaying the time in UTC time isn't very helpful.
    // Always show an empty field for start time.
    const startTime = interaction.values.includes(DeploymentFields.START_TIME) ? '' : null;
    const modal = buildEditDeploymentModal(deployment.id, title, difficulty, description, startTime);
    await showModal(interaction, modal);
}

function _buildSelectFieldsToEditActionRow(deploymentId: number) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setCustomId(`editDeployment-${deploymentId}`).setPlaceholder("Select an option").setMaxValues(4).addOptions(
            { label: "Title", value: DeploymentFields.TITLE, emoji: config.editEmoji },
            { label: "Difficulty", value: DeploymentFields.DIFFICULTY, emoji: config.editEmoji },
            { label: "Description", value: DeploymentFields.DESCRIPTION, emoji: config.editEmoji },
            { label: "Start Time", value: DeploymentFields.START_TIME, emoji: config.editEmoji }
        )
    );
}

async function onDeploymentEditModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    try {
        const details = getDeploymentModalValues(interaction.fields);
        if (details instanceof Error) {
            await editReplyWithError(interaction, details.message);
            return;
        }
        const deploymentId = Number(interaction.customId.split("-")[1]);

        const response = await DeploymentManager.get().update(interaction.member.id, deploymentId, details);
        if (response instanceof Error) {
            await editReplyWithError(interaction, response.message);
            return;
        }
        const { newDetails, oldDetails } = response;

        const embed = buildDeploymentEmbed(newDetails, Colors.Green, /*started=*/false);
        await newDetails.message.edit({ embeds: [embed] });

        if (newDetails.startTime.diff(oldDetails.startTime, 'minutes').minutes > 0) {
            await _notifyStartTimeChange(oldDetails.signups.map(s => s.guildMember.user).concat(oldDetails.backups.map(b => b.guildMember.user)), oldDetails, newDetails);
        }

        await editReplyWithSuccess(interaction, 'Deployment edited successfully');
        success(`User: ${formatMemberForLog(interaction.member)} edited Deployment: ${formatDeployment(oldDetails)} to Deployment: ${formatDeployment(newDetails)}`, 'Deployment');
    } catch (e: any) {
        await editReplyWithError(interaction, 'Failed to edit deployment');
        throw e;
    }
}

async function _notifyStartTimeChange(users: User[], oldDetails: DeploymentDetails, newDetails: DeploymentDetails) {
    const embed = _buildStartTimeChangeNoticeEmbed(oldDetails, newDetails);
    await Promise.all(users.map(async user => {
        await sendDmToUser(user, { embeds: [embed] });
    }));
}

function _buildStartTimeChangeNoticeEmbed(oldDetails: DeploymentDetails, newDetails: DeploymentDetails) {
    const signupLink = `https://discord.com/channels/${newDetails.channel.guild.id}/${newDetails.channel.id}/${newDetails.message.id}`;
    return buildInfoEmbed()
        .setColor(Colors.Orange)
        .setTitle("Deployment Start Time changed!")
        .setDescription(`A deployment you are signed up for has changed it's start time.
Deployment Name: ${newDetails.title}
Previous Start Time: ${formatDiscordTime(oldDetails.startTime)}
New Start Time: ${formatDiscordTime(newDetails.startTime)} which is in: ${formatDiscordTime(newDetails.startTime, DiscordTimestampFormat.RELATIVE_TIME)}
Signup: ${signupLink}
`);
}
