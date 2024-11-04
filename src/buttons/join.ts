import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        await Queue.insert({ user: interaction.user.id, host: false });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})