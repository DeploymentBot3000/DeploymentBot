import { GuildTextBasedChannel, ModalSubmitInteraction } from "discord.js";
import getStartTime from "../utils/getStartTime.js";
import {buildDeploymentEmbed} from "../utils/embedBuilders/signupEmbedBuilder.js";
import {success} from "../utils/logger.js";
import Deployment from "../tables/Deployment.js";
import * as emoji from 'node-emoji'
import { buildErrorEmbed, buildSuccessEmbed } from "../utils/embedBuilders/configBuilders.js";
import { replyWithError } from "../utils/interaction/replyWithError.js";

export default {
    id: "editDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }): Promise<void> {
        const deployment = await Deployment.findOne({ where: { id: Number(interaction.customId.split("-")[1]) } });
        if (!deployment) {
            return;
        }

        const getFieldValue = (customId: string): string => {
            try {
                return interaction.fields.getTextInputValue(customId);
            }
            catch {
                return "";
            }
        }

        const startTimeInput = async () => {
            if (!getFieldValue("startTime")) {
                return null;
            }
            const startTime = await getStartTime(interaction.fields.getTextInputValue("startTime"));
            if (startTime instanceof Error) {
                await replyWithError(interaction, startTime.message);
                return null;
            }
            return startTime.toMillis();
        }

        try {
            const startTime = await startTimeInput();

            const title = emoji.strip(getFieldValue("title")).trim();
            if (title) { deployment.title = title; }
            const difficulty = emoji.strip(getFieldValue("difficulty")).trim();
            if (difficulty) { deployment.difficulty = difficulty; }
            const description = emoji.strip(getFieldValue("description")).trim();
            if (description) { deployment.description = description; }
            if (startTime) { deployment.startTime = startTime; }
            const endTime = startTime ? startTime + 7200000 : null;
            if (endTime) { deployment.endTime = endTime; }
        } catch (e) {
            const errorEmbed = buildErrorEmbed()
                .setTitle("Parsing Error!")
                .setDescription("Please do not use emojis in any deployment fields!\n");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await deployment.save();

        const successEmbed = buildSuccessEmbed()
            .setDescription("Deployment edited successfully");

        await interaction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => { });

        const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

        const channel = await interaction.client.channels.fetch(deployment.channel).catch(() => null as null) as GuildTextBasedChannel;
        const message = await channel?.messages.fetch(deployment.message).catch(() => null as null);
        if (message) {
            await message.edit({ embeds: [embed] }).catch(() => { });
        }

        success(`Deployment ${deployment.title} edited successfully by ${interaction.user.tag}`, "EditDeployment");
    }
};
