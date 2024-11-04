import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import checkBlacklist from "../utils/checkBlacklist.js";

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        if (await checkBlacklist(interaction.user.id, interaction.guild)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are blacklisted from joining queues");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued) {
            await Queue.update(
                { user: interaction.user.id },
                { host: false }
            );
        } else {
            await Queue.create({ user: interaction.user.id, host: false }).save();
        }

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})