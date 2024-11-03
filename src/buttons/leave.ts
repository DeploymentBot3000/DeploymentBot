import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";

export default new Button({
    id: "leave",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        try {
            const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to fetch your guild member data");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

            if (!alreadyQueued) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("You are not in the queue");

                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await Queue.delete({ user: interaction.user.id });

            const successEmbed = buildEmbed({ preset: "success" })
                .setDescription("You have been removed from the queue");

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const queue = await Queue.find().catch(() => []);
            if (!queue) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to fetch queue data");
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const embed = buildEmbed({ name: "queuePanel" })
                .addFields([
                    {
                        name: "Hosts:",
                        value: await Promise.all(queue.filter(q => q.host).map(async host => {
                            const member = await interaction.guild?.members.fetch(host.user).catch(() => null);
                            return member ? member.displayName : 'Unknown User';
                        })).then(hosts => hosts.join("\n")) || "` - `",
                        inline: true
                    },
                    {
                        name: "Participants:",
                        value: await Promise.all(queue.filter(q => !q.host).map(async player => {
                            const member = await interaction.guild?.members.fetch(player.user).catch(() => null);
                            return member ? member.displayName : 'Unknown User';
                        })).then(players => players.join("\n")) || "` - `",
                        inline: true
                    },
                    {
                        name: "Next game:",
                        value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                    }
                ]);

            await interaction.message.edit({ embeds: [embed] }).catch(async () => {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Failed to update the queue panel");
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            });
        } catch (error) {
            console.error('Error in leave button:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("An unexpected error occurred");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
})