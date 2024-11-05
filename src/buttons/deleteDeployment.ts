import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";

export default new Button({
    id: "deleteDeployment",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user !== interaction.user.id) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You do not have permission to delete this deployment");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await deployment.remove();

        const successEmbed = buildEmbed({ preset: "success" })
        .setDescription("Deployment deleted successfully");
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
        await interaction.message.delete();
    }
})