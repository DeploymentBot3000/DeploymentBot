import Command from "../classes/Command.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import { buildButton } from "../buttons/button.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import buildQueuePanelEmbed from "../embeds/queue.js";
import {ActionRowBuilder, ButtonBuilder,} from "discord.js";
import {action, error, log, success} from "../utils/logger.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Command({
    name: "queue-panel",
    description: "Send the queue panel",
    permissions: ["ManageRoles"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    callback: async function ({ interaction }) {
        action(`${interaction.user.tag} creating queue panel`, "QueuePanel");

        if (!interaction.memberPermissions.has("ManageRoles")) {
            log(`${interaction.user.tag} attempted to create queue panel without permissions`, "QueuePanel");
            interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
            return;
        }

        try {
            const embed = await buildQueuePanelEmbed(true, HotDropQueue.getHotDropQueue().nextGame.toMillis(), false, interaction.channel);

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

            const successEmbed = buildSuccessEmbed()
                .setDescription("Queue panel sent");
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (e) {
            error(`Failed to create queue panel: ${e}`, "QueuePanel");
            const successEmbed = buildErrorEmbed()
                .setDescription(`Failed to create queue panel: ${e}`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            throw e;
        }
    }
})
