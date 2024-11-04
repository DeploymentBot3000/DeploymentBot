import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildMember } from "discord.js";

export default new Button({
    id: "host",
    cooldown: 0,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    func: async function({ interaction }) {
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (!(interaction.member as GuildMember).roles.cache.has(config.hostRole)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You don't have permission to be a host");
            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (alreadyQueued) {
            await Queue.update(
                { user: interaction.user.id },
                { host: true }
            );
        } else {
            await Queue.create({ user: interaction.user.id, host: true });
        }

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})