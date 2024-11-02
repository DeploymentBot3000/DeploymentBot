import Slashcommand from "../classes/Slashcommand.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { client } from "../index.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

export default new Slashcommand({
    name: "queue-panel",
    description: "Send the queue panel",
    cooldown: 0,
    permissions: ["ManageRoles"],
    requiredRoles: [],
    options: [],
    func: async function({ interaction }) {
        if (!interaction.memberPermissions.has("ManageRoles")) {
            return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }

        const msg = await updateQueueMessages(true, client.nextGame.getTime(), false);

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Queue panel sent");

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        const currentMsgArray = await QueueStatusMsg.find({ where: { id: 1 }});
        const currentMsg = currentMsgArray[0] || null;
        if(currentMsg) {
            currentMsg.channel = interaction.channelId;
            currentMsg.message = msg.id;
        } else await QueueStatusMsg.insert({ channel: interaction.channelId, message: msg.id });
    }
})
