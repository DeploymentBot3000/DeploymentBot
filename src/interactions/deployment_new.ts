import {
    ButtonInteraction,
    ModalSubmitInteraction,
    Snowflake,
    TextChannel
} from "discord.js";
import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import { config } from "../config.js";
import { buildNewDeploymentModal, getDeploymentModalValues, getDeploymentModalValuesRaw } from "../modals/deployments.js";
import LatestInput from "../tables/LatestInput.js";
import { DeploymentManager, DeploymentRole } from "../utils/deployments.js";
import { sendDmToUser } from "../utils/dm.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";
import { formatDiscordTime } from "../utils/time.js";

export const DeploymentNewButton = new Button({
    id: "newDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        requireRoles: config.hostRoles,
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }: { interaction: ButtonInteraction<'cached'> }) {
        await onNewDeploymentButtonPress(interaction);
    }
});

export const DeploymentNewModal = new Modal({
    id: "newDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }) {
        await onNewDeploymentModalSubmit(interaction);
    }
});

async function onNewDeploymentButtonPress(interaction: ButtonInteraction<'cached'>) {
    const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });
    const modal = buildNewDeploymentModal(latestInput?.title, latestInput?.difficulty, latestInput?.description, latestInput?.startTime);
    await interaction.showModal(modal);
}

async function onNewDeploymentModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
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
            role: DeploymentRole.FIRETEAM,
        };

        {
            const channel = await interaction.guild.channels.fetch(config.discord_server.deployment_channel);
            if (!channel) {
                throw new Error(`Can't find signup channel with id: ${config.discord_server.deployment_channel}`);
            }
            if (!(channel instanceof TextChannel)) {
                throw new Error("Selected channel is not a text channel");
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
        await sendDmToUser(interaction.user, { content: `You create a new deployment: ${deployment.title}.\nScheduled for: ${formatDiscordTime(deployment.startTime)} (${deployment.startTime.toISO()}).\n${link}` });

        await editReplyWithSuccess(interaction, 'Deployment created successfully');
        success(`User: ${formatMemberForLog(interaction.member)} created Deployment: ${deployment.title}; ID: ${deployment.id}; Message: ${deployment.message.id}`);
    } catch (e: any) {
        await editReplyWithError(interaction, 'Failed to create deployment');
        throw e;
    }
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
