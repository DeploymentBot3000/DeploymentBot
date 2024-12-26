import {GuildTextBasedChannel} from "discord.js";
import getStartTime from "../utils/getStartTime.js";
import {buildDeploymentEmbed} from "../utils/embedBuilders/signupEmbedBuilder.js";
import {success} from "../utils/logger.js";
import Deployment from "../tables/Deployment.js";
import { client } from "../custom_client.js"; // Import CommandInteraction type
import * as emoji from 'node-emoji'
import { buildErrorEmbed, buildSuccessEmbed } from "../utils/embedBuilders/configBuilders.js";

export default {
    id: "editDeployment",
    callback: async function ({ interaction }) {
        const deployment = await Deployment.findOne({ where: { id: interaction.customId.split("-")[1] } });
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
            const startTime = interaction.fields.getTextInputValue("startTime");
            let startDate:Date = null;

            try { startDate = await getStartTime(startTime, interaction); }
            catch (e) {
                return null;
            }

            return startDate.getTime();
        }

        try {
            const startTime = await startTimeInput();
            const details = {
                title: emoji.strip(getFieldValue("title")).trim(),
                difficulty: emoji.strip(getFieldValue("difficulty")).trim(),
                description: emoji.strip(getFieldValue("description")).trim(),
                startTime,
                endTime: startTime ? startTime + 7200000 : null
            }

            for(const key in details)
                if(details[key]) deployment[key] = details[key];
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

        await interaction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => null);

        const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

        const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
        const message = await channel.messages.fetch(deployment.message).catch(() => null);
        await message.edit({ embeds: [embed] }).catch(() => null);

        success(`Deployment ${deployment.title} edited successfully by ${interaction.user.tag}`, "EditDeployment");
    }
};