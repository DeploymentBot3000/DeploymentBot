import Slashcommand from "../classes/Slashcommand.js";
import {buildButton, buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { client } from "../custom_client.js";
import buildQueueEmbed from "../utils/embedBuilders/buildQueueEmbed.js";
import {ActionRowBuilder, ButtonBuilder,} from "discord.js";
import {action, error, log, success} from "../utils/logger.js";

export default new Slashcommand({
    name: "queue-panel",
    description: "Send the queue panel",
    cooldown: 0,
    permissions: ["ManageRoles"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    func: async function({ interaction }) {
        action(`${interaction.user.tag} creating queue panel`, "QueuePanel");

        if (!interaction.memberPermissions.has("ManageRoles")) {
            log(`${interaction.user.tag} attempted to create queue panel without permissions`, "QueuePanel");
            interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
            return;
        }

        try {
            const embed = await buildQueueEmbed(true, client.nextGame.getTime(), false, interaction.channel);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                buildButton("host"),
                buildButton("join"),
                buildButton("leave")
            );

            const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

            const currentMsgArray = await QueueStatusMsg.find();
            const currentMsg = currentMsgArray[0] || null;
            if(currentMsg) {
                currentMsg.channel = interaction.channelId;
                currentMsg.message = msg.id;
                await currentMsg.save();
            } else await QueueStatusMsg.insert({ channel: interaction.channelId, message: msg.id });

            success(`Queue panel created by ${interaction.user.tag}`, "QueuePanel");

            const successEmbed = buildEmbed({ preset: "success" })
                .setDescription("Queue panel sent");
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (e) {
            error(`Failed to create queue panel: ${e}`, "QueuePanel");
            const successEmbed = buildEmbed({ preset: "error" })
                .setDescription(`Failed to create queue panel: ${e}`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            throw e;
        }
    }
})
