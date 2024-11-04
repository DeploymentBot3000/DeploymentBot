import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import checkBlacklist from "../utils/checkBlacklist.js";
import { handleCooldown } from "../utils/cooldownManager.js";

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        const cooldownResult = handleCooldown(interaction.user.id, "join");
        if (cooldownResult.onCooldown) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(`Please wait ${cooldownResult.remainingTime.toFixed(1)} seconds before using this again.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 45000));
        }

        if (await checkBlacklist(interaction.user.id, interaction.guild)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are blacklisted from joining queues");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued?.host === false) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (alreadyQueued?.host === true) {
            await Queue.update({ user: interaction.user.id }, { host: false });
        } else {
            await Queue.create({ user: interaction.user.id, host: false });
        }

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})