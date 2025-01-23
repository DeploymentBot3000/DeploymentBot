import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import { buildButton } from "../buttons/button.js";
import Command from "../classes/Command.js";
import buildQueuePanelEmbed from "../embeds/queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { replyWithError, replyWithSuccess } from "../utils/interaction_replies.js";
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
            await replyWithError(interaction, "You don't have permission to use this command.");
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

            await replyWithSuccess(interaction, 'Queue panel sent');

            success('Queue panel created', 'QueuePanel');
        } catch (e) {
            error(`Failed to create queue panel: ${e}`, "QueuePanel");
            await replyWithError(interaction, `Failed to create queue panel: ${e}`);
            throw e;
        }
    }
})
