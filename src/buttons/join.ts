import Button from "../classes/Button.js";
import { client, queueJoinTimes } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import checkBlacklist from "../utils/checkBlacklist.js";
import config from "../config.js";
import { GuildTextBasedChannel } from "discord.js";

export default new Button({
    id: "join",
    cooldown: config.buttonCooldown,
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
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        queueJoinTimes.set(interaction.user.id, new Date());

        const joinLogChannel = await client.channels.fetch('1303492344636772392') as GuildTextBasedChannel;
        await joinLogChannel.send(`[${new Date().toISOString()}] <@${interaction.user.id}> joined the queue`);

        await Queue.insert({ user: interaction.user.id, host: false });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})