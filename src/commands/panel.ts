import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import { buildButton } from "../buttons/button.js";
import Command from "../classes/Command.js";
import { buildPanelEmbed } from "../embeds/deployment.js";
import { replyWithSuccess } from "../utils/interaction_replies.js";

export default new Command({
    name: "panel",
    description: "Send the deployment panel",
    permissions: {
        requiredPermissions: ["Administrator"]
    },
    options: [],
    callback: async function ({ interaction }) {
        const embed = buildPanelEmbed();
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("newDeployment")
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        await replyWithSuccess(interaction, 'Panel sent successfully');
    }
})