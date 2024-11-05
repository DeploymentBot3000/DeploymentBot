import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import { handleCooldown } from "../utils/cooldownManager.js";
import { log, action, success, warn } from "../utils/logger.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import config from "../config.js";

export default new Button({
    id: "leave",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        action(`${interaction.user.tag} attempting to leave queue`, "QueueLeave");

        const cooldownResult = handleCooldown(interaction.user.id, "leave");
        if (cooldownResult.onCooldown) {
            warn(`${interaction.user.tag} attempted to leave queue while on cooldown`, "QueueLeave");
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(`Please wait ${cooldownResult.remainingTime.toFixed(1)} seconds before using this again.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (!alreadyQueued) {
            warn(`${interaction.user.tag} attempted to leave queue but wasn't queued`, "QueueLeave");
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are not in the queue");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await Queue.delete({ user: interaction.user.id });
        await updateQueueMessages(true, client.nextGame.getTime(), false);
        success(`${interaction.user.tag} successfully left queue`, "QueueLeave");
    }
})