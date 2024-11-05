import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildMember } from "discord.js";
import { log, action, success, warn, debug } from "../utils/logger.js";

export default new Button({
    id: "host",
    cooldown: 5,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued && !alreadyQueued.host) {
            await Queue.update(
                { user: interaction.user.id },
                { host: true }
            );
            await updateQueueMessages(true, client.nextGame.getTime(), false);
            return;
        }

        if (alreadyQueued?.host) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already queued as host");
            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

        await Queue.create({
            user: interaction.user.id,
            host: true
        }).save();

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})