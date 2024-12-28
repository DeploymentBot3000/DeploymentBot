import { Colors, ModalSubmitInteraction } from "discord.js";
import getStartTime from "../utils/getStartTime.js";
import { buildDeploymentEmbedFromDb } from "../embeds/deployment.js";
import {success} from "../utils/logger.js";
import Deployment from "../tables/Deployment.js";
import * as emoji from 'node-emoji'
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction/replies.js";
import { DateTime, Duration } from "luxon";

export default {
    id: "editDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const deployment = await Deployment.findOne({ where: { id: Number(interaction.customId.split("-")[1]) } });
        if (!deployment) {
            await editReplyWithError(interaction, 'Failed to find deployment');
            return;
        }

        const getFieldValue = (customId: string): string => {
            try {
                return interaction.fields.getTextInputValue(customId).trim();
            } catch {
                return "";
            }
        }

        const startTimeInput = async () => {
            if (!getFieldValue("startTime")) {
                return null;
            }
            const startTime = await getStartTime(interaction.fields.getTextInputValue("startTime"));
            if (startTime instanceof Error) {
                await editReplyWithError(interaction, startTime.message);
                return null;
            }
            return startTime.toMillis();
        }

        const title = getFieldValue("title");
        if (title) { deployment.title = title; }
        const difficulty = getFieldValue("difficulty");
        if (difficulty) { deployment.difficulty = difficulty; }
        const description = getFieldValue("description");
        if (description) { deployment.description = description; }

        if (hasEmoji(title) || hasEmoji(difficulty) || hasEmoji(description)) {
            await editReplyWithError(interaction, 'Emojis are not allowed in deployment fields');
            return;
        }

        const startTime = await startTimeInput();
        if (startTime) {
            deployment.startTime = startTime;
            deployment.endTime = DateTime.fromMillis(startTime).plus(Duration.fromDurationLike({ hours: 2 })).toMillis();
        }
        await deployment.save();

        const embed = await buildDeploymentEmbedFromDb(deployment, Colors.Green, /*started=*/false);
        const channel = interaction.guild.channels.cache.get(deployment.channel);
        if (!channel.isTextBased()) {
            throw new Error(`Invalid channel type: ${channel.id}`);
        }
        await channel.messages.cache.get(deployment.message).edit({ embeds: [embed] });

        await editReplyWithSuccess(interaction, 'Deployment edited successfully');
        success(`Deployment ${deployment.title} edited successfully by ${interaction.user.tag}`, "EditDeployment");
    }
};

function hasEmoji(input: string): boolean {
    return input != emoji.strip(emoji.emojify(input));
}
