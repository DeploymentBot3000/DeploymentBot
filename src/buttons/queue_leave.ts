import Button from "../classes/Button.js";
import { buildErrorEmbed } from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { Duration } from "luxon";

export default new Button({
    id: "leave",
    cooldown: Duration.fromDurationLike({ seconds: 0 }),
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        await interaction.deferUpdate();

        const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
            const errorEmbed = buildErrorEmbed()
                .setDescription("Failed to fetch your guild member data");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }


        const error = await HotDropQueue.getHotDropQueue().leave(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildErrorEmbed().setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You left the Hot Drop Queue'
        });
    }
})