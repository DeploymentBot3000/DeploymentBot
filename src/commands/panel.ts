import { ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } from "discord.js";
import { buildButton } from "../buttons/button.js";
import Command from "../classes/Command.js";
import { buildPanelEmbed } from "../embeds/deployment.js";
import { buildSuccessEmbed } from "../embeds/embed.js";

export default new Command({
    name: "panel",
    description: "Send the deployment panel",
    permissions: {
        requiredPermissions: [PermissionFlagsBits.Administrator]
    },
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