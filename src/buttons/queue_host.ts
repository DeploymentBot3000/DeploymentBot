import Button from "../classes/Button.js";
import { buildErrorEmbed } from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { Duration } from "luxon";

export default new Button({
    id: "host",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        await interaction.deferUpdate();

        const error = await HotDropQueue.getHotDropQueue().joinAsHost(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildErrorEmbed().setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You joined the Hot Drop Queue as a host'
        });
    }
})
