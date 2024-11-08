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

        const startTimeInput = async () => {
            const startTime = interaction.fields.getTextInputValue("startTime");
            if(!startTime) return null;
            let startDate:Date = null;

            try { startDate = await getStartTime(startTime, interaction); }
            catch (e) { return; }

            return startDate.getTime();
        }

        const details = {
            title: interaction.fields.getTextInputValue("title"),
            difficulty: interaction.fields.getTextInputValue("difficulty"),
            description: interaction.fields.getTextInputValue("description"),
            startTime: startTimeInput(),
            endTime: this.startTime ? this.startTime.getTime() + 7200000 : null
        }

        console.log(deployment)

        for(const key in details)
            if(details[key]) console.log(details[key])

        // if (selectmenuInteraction.values.includes("startTime")) {
        //     const startTime = modalInteraction.fields.getTextInputValue("startTime");
        //     let startDate:Date = null;
        //
        //     try { startDate = await getStartTime(startTime, modalInteraction); }
        //     catch (e) { return; }
        //
        //     deployment.startTime = startDate.getTime();
        //     deployment.endTime = startDate.getTime() + 7200000;
        // }

        await deployment.save();

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Deployment edited successfully");

        await interaction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => null);

        const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", false);

        await interaction.message.edit({ embeds: [embed] }).catch(() => null);

        success(`Deployment ${deployment.title} edited successfully by ${interaction.user.tag}`, "EditDeployment");
    }
};