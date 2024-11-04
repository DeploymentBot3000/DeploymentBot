import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { handleCooldown } from "../utils/cooldownManager.js";

export default new Button({
    id: "host",
    cooldown: 0,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    func: async function({ interaction }) {
        const cooldownResult = handleCooldown(interaction.user.id, "host");
        if (cooldownResult.onCooldown) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(`Please wait ${cooldownResult.remainingTime.toFixed(1)} seconds before using this again.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued?.host === true) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the host queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (alreadyQueued?.host === false) {
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