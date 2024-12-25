import Button from "../classes/Button.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Button({
    id: "leave",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Failed to fetch your guild member data");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        const error = await HotDropQueue.getHotDropQueue().leave(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildEmbed({ preset: "error" }).setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You left the Hot Drop Queue'
        });
    }
})