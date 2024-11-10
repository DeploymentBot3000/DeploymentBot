import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";

export default new Slashcommand({
    name: "panel",
    description: "Send the deployment panel",
    cooldown: 0,
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    func: async function({ interaction }) {
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