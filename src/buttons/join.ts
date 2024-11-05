import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import checkBlacklist from "../utils/checkBlacklist.js";
import { handleCooldown } from "../utils/cooldownManager.js";
import { log, action, success, warn, debug, error } from "../utils/logger.js";

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        action(`${interaction.user.tag} attempting to join queue`, "QueueJoin");

        // Check cooldown
        const cooldownResult = handleCooldown(interaction.user.id, "join");
        if (cooldownResult.onCooldown) {
            warn(`${interaction.user.tag} attempted to join while on cooldown (${cooldownResult.remainingTime}s remaining)`, "QueueJoin");
            const embed = buildEmbed({ preset: "error" })
                .setDescription(`You are on cooldown! Please wait ${cooldownResult.remainingTime} seconds.`);
            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => null), 5000); // Delete after 5 seconds
            return;
        }

        // Check blacklist
        debug(`Checking blacklist status for ${interaction.user.tag}`, "QueueJoin");
        const isBlacklisted = await checkBlacklist(interaction.user.id, interaction.guild);
        if (isBlacklisted) {
            warn(`Blacklisted user ${interaction.user.tag} attempted to join queue`, "QueueJoin");
            const embed = buildEmbed({ preset: "error" })
                .setDescription("You are blacklisted from joining queues.");
            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => null), 10000); // Delete after 10 seconds
            return;
        }

        // Check if already in queue
        debug(`Checking existing queue status for ${interaction.user.tag}`, "QueueJoin");
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });
        if (alreadyQueued) {
            warn(`${interaction.user.tag} attempted to join queue while already queued`, "QueueJoin");
            const embed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue!");
            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => null), 5000); // Delete after 5 seconds
            return;
        }

        // Attempt to add to queue
        try {
            debug(`Adding ${interaction.user.tag} to queue`, "QueueJoin");
            await Queue.create({ 
                user: interaction.user.id,
                host: false 
            }).save();
            success(`${interaction.user.tag} successfully joined queue`, "QueueJoin");

            // Update queue messages
            debug(`Updating queue messages after successful join`, "QueueJoin");
            await updateQueueMessages(true, client.nextGame.getTime(), false);

            // Send success message
            const embed = buildEmbed({ preset: "success" })
                .setDescription("You have successfully joined the queue!");
            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => null), 5000); // Delete after 5 seconds

        } catch (e) {
            error(`Failed to add ${interaction.user.tag} to queue: ${e}`, "QueueJoin");
            const embed = buildEmbed({ preset: "error" })
                .setDescription("An error occurred while trying to join the queue. Please try again later.");
            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => null), 5000); // Delete after 5 seconds
        }
    }
});