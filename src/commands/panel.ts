import {ActionRowBuilder, ButtonBuilder} from "discord.js";
import Command from "../classes/Command.js";
import {buildButton, buildEmbed} from "../utils/embedBuilders/configBuilders.js";

export default new Command({
    name: "panel",
    description: "Send the deployment panel",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    callback: async function ({ interaction }) {
        const embed = buildEmbed({ name: "panel" });
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("newDeployment")
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Panel sent successfully");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
})