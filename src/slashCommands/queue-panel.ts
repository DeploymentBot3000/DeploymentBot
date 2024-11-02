import Slashcommand from "../classes/Slashcommand.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { client } from "../index.js";
import buildQueueEmbed from "../utils/buildQueueEmbed.js";
import {ActionRowBuilder, ButtonBuilder, GuildTextBasedChannel} from "discord.js";

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

        const { embed, content } = await buildQueueEmbed(true, client.nextGame.getTime(), false, interaction.channel);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("host"),
            buildButton("join"),
            buildButton("leave")
        );

        const msg = await interaction.channel.send({ content, embeds: [embed], components: [row] });

        const currentMsgArray = await QueueStatusMsg.find({ where: { id: 1 }});
        const currentMsg = currentMsgArray[0] || null;
        if(currentMsg) {
            currentMsg.channel = interaction.channelId;
            currentMsg.message = msg.channelId;
            await currentMsg.save();
        } else await QueueStatusMsg.insert({ channel: interaction.channelId, message: msg.channelId });

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Queue panel sent");
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
})
