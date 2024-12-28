import {ActionRowBuilder, ButtonBuilder} from "discord.js";
import Command from "../classes/Command.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { buildButton } from "../buttons/button.js";
import { buildPanelEmbed } from "../embeds/deployment.js";

export default new Command({
    name: "panel",
    description: "Send the deployment panel",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    callback: async function ({ interaction }) {
        const embed = buildPanelEmbed();
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("newDeployment")
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const successEmbed = buildSuccessEmbed()
            .setDescription("Panel sent successfully");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
})