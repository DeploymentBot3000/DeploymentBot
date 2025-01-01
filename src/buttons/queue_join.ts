import { Duration } from "luxon";
import config from "../config.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import Button from "./button.js";

export default new Button({
    id: "join",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        await interaction.deferUpdate();

        const error = await HotDropQueue.getHotDropQueue().join(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildErrorEmbed().setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You joined the Hot Drop Queue'
        });
    }
})