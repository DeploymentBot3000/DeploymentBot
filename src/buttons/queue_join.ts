import Button from "../classes/Button.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Button({
    id: "join",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        await interaction.deferUpdate();

        const error = await HotDropQueue.getHotDropQueue().join(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildEmbed({ preset: "error" }).setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You joined the Hot Drop Queue'
        });
    }
})