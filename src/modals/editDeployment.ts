import { CommandInteraction } from "discord.js";
import getStartTime from "../utils/getStartTime.js";
import {buildEmbed} from "../utils/configBuilders.js";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";
import {success} from "../utils/logger.js";
import Deployment from "../tables/Deployment.js"; // Import CommandInteraction type

export default {
    id: "editDeployment",
    function: async function ({ interaction }) {
        const deployment = await Deployment.findOne({ where: { id: interaction.customId.split("-")[1] } });
        if(!deployment) return;

        const getFieldValue = (customId: string): string | null => {
            try { return interaction.fields.getTextInputValue(customId)}
            catch { return null }
        }

        const startTimeInput = async () => {
            if(getFieldValue("startTime")) return null;
            const startTime = interaction.fields.getTextInputValue("startTime");
            let startDate:Date = null;

            try { startDate = await getStartTime(startTime, interaction); }
            catch (e) { return; }

            return startDate.getTime();
        }

        const details = {
            title: getFieldValue("title"),
            difficulty: getFieldValue("difficulty"),
            description: getFieldValue("description"),
            startTime: await startTimeInput(),
            endTime: this.startTime ? this.startTime + 7200000 : null
        }

        for(const key in details)
            if(details[key]) console.log(details[key])

        await deployment.save();

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Deployment edited successfully");

        await interaction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => null);

        const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

        await interaction.message.edit({ embeds: [embed] }).catch(() => null);

        success(`Deployment ${deployment.title} edited successfully by ${interaction.user.tag}`, "EditDeployment");
    }
};