import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { handleCooldown } from "../utils/cooldownManager.js";
import { GuildMember } from "discord.js";

export default new Button({
    id: "host",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        const cooldownResult = handleCooldown(interaction.user.id, "host");
        if (cooldownResult.onCooldown) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(`Please wait ${cooldownResult.remainingTime.toFixed(1)} seconds before using this again.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

        const member = interaction.member as GuildMember;
        if (!member.roles.cache.has(config.hostRole)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You need the Host role to queue as host");
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

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