import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";

const HOST_ROLE_ID = "1296482820067295284";
export default new Button({
    id: "host",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const member = interaction.member;
            if (!member || !member.roles || !("cache" in member.roles)) {
                await interaction.followUp({ content: "You cannot join the queue at this time.", ephemeral: true });
                return;
            }
            if (!member.roles.cache.has(HOST_ROLE_ID)) {
                await interaction.followUp({ content: "You do not have the required role to host.", ephemeral: true });
                return;
            }
            const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });
            if (alreadyQueued) {
                await interaction.followUp({ content: "You are already in the queue.", ephemeral: true });
                return;
            }
            await Queue.insert({ user: interaction.user.id, host: true });
            const queue = await Queue.find();
            const embed = buildEmbed({ name: "queuePanel" })
                .addFields([
                    {
                        name: "Hosts:",
                        value: queue.filter(q => q.host).map(host => `<@${host.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Participants:",
                        value: queue.filter(q => !q.host).map(player => `<@${player.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Next game:",
                        value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                    }
                ]);
            await interaction.message.edit({ embeds: [embed] });
            await interaction.followUp({ content: "You have been added to the queue as a host.", ephemeral: true });
        } catch (error) {
            console.error("Error handling host button interaction:", error);
            await interaction.followUp({ content: "There was an error processing your request. Please try again later.", ephemeral: true });
        }
    }
});
