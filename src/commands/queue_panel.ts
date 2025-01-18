import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import { buildButton } from "../buttons/button.js";
import Command from "../classes/Command.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import buildQueuePanelEmbed from "../embeds/queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { error, success, warn } from "../utils/logger.js";

export default new Command({
    name: "queue-panel",
    description: "Send the queue panel",
    permissions: {
        requiredPermissions: ["ManageRoles"]
    },
    options: [],
    callback: async function ({ interaction }) {
        if (!interaction.memberPermissions.has("ManageRoles")) {
            warn(`${interaction.user.tag} attempted to create queue panel without permissions`, "QueuePanel");
            interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
            return;
        }

        try {
            const embed = buildQueuePanelEmbed(HotDropQueue.getHotDropQueue().nextGame.toMillis(), /*hosts=*/[], /*players=*/[], /*strikeModeEnabled=*/false);

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

            const successEmbed = buildSuccessEmbed()
                .setDescription("Queue panel sent");
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            success('Queue panel created', 'QueuePanel');
        } catch (e) {
            error(`Failed to create queue panel: ${e}`, "QueuePanel");
            const successEmbed = buildErrorEmbed()
                .setDescription(`Failed to create queue panel: ${e}`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            throw e;
        }
    }
})
