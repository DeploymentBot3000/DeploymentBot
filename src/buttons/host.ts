import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildTextBasedChannel } from "discord.js";
import { logQueueAction } from "../utils/queueLogger.js";

export default new Button({
    id: "host",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    func: async function({ interaction }) {
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued && alreadyQueued?.host) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (alreadyQueued && !alreadyQueued.host) await Queue.update(alreadyQueued.id, { host: true })
        else await Queue.insert({ user: interaction.user.id, host: true });

        await logQueueAction({
            type: 'host',
            userId: interaction.user.id
        });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})