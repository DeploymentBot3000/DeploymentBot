import Slashcommand from "../classes/Slashcommand.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { client } from "../index.js";
import buildQueueEmbed from "../utils/buildQueueEmbed.js";
import {ActionRowBuilder, ButtonBuilder, } from "discord.js";
import { log, action, success, error } from "../utils/logger.js";

export default new Slashcommand({
    name: "queue-panel",
    description: "Send the queue panel",
    cooldown: 0,
    permissions: ["ManageRoles"],
    requiredRoles: [],
    options: [],
    func: async function({ interaction }) {
        action(`${interaction.user.tag} creating queue panel`, "QueuePanel");

        if (!interaction.memberPermissions.has("ManageRoles")) {
            log(`${interaction.user.tag} attempted to create queue panel without permissions`, "QueuePanel");
            return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }

        try {
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
                currentMsg.message = msg.id;
                await currentMsg.save();
            } else await QueueStatusMsg.insert({ channel: interaction.channelId, message: msg.id });

            success(`Queue panel created by ${interaction.user.tag}`, "QueuePanel");
        } catch (e) {
            error(`Failed to create queue panel: ${e}`, "QueuePanel");
            throw e;
        }
    }
})
