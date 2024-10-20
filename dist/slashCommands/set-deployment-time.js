import { ApplicationCommandOptionType } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import ms from "ms";
import { client, setDeploymentTime } from "../index.js";
import { buildEmbed } from "../utils/configBuilders.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
export default new Slashcommand({
    name: "set-deployment-time",
    description: "Set the deployment time",
    permissions: ["Administrator"],
    requiredRoles: [],
    cooldown: 0,
    options: [
        {
            name: "time",
            description: "The time of the deployment",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    func: async function ({ interaction }) {
        const time = ms(interaction.options.getString("time"));
        if (!time) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setTitle("Invalid time")
                .setDescription("Please provide a valid time");
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        setDeploymentTime(time.toString());
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${time}`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        client.nextGame = new Date(Date.now() + time);
        const currentQueue = await Queue.find();
        const currentHosts = currentQueue.filter(q => q.host);
        const currentPlayers = currentQueue.filter(q => !q.host);
        const queueMessages = await QueueStatusMsg.find();
        for (const queueMessage of queueMessages) {
            const channel = await client.channels.fetch(queueMessage.channel).catch(() => null);
            const message = await channel.messages.fetch(queueMessage.message).catch(() => null);
            const embed = buildEmbed({ name: "queuePanel" })
                .addFields([
                {
                    name: "Hosts:",
                    value: currentHosts.map(host => `<@${host.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Participants:",
                    value: currentPlayers.map(player => `<@${player.user}>`).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Next game:",
                    value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                }
            ]);
            await message.edit({ content: null, embeds: [embed] });
        }
    }
});
