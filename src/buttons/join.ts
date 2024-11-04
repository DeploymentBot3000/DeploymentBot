import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are already in the queue");

            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        await Queue.insert({ user: interaction.user.id, host: false });

        await updateQueueMessages(true, client.nextGame.getTime(), false);

        // const queue = await Queue.find();
        //
        // const embed = buildEmbed({ name: "queuePanel" })
        //     .addFields([
        //         {
        //             name: "Hosts:",
        //             value: await Promise.all(queue.filter(q => q.host).map(async host => {
        //                 const member = await interaction.guild?.members.fetch(host.user).catch(() => null);
        //                 return member ? member.displayName : 'Unknown User';
        //             })).then(hosts => hosts.join("\n")) || "` - `",
        //             inline: true
        //         },
        //         {
        //             name: "Participants:",
        //             value: await Promise.all(queue.filter(q => !q.host).map(async player => {
        //                 const member = await interaction.guild?.members.fetch(player.user).catch(() => null);
        //                 return member ? member.displayName : 'Unknown User';
        //             })).then(players => players.join("\n")) || "` - `",
        //             inline: true
        //         },
        //         {
        //             name: "Next game:",
        //             value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
        //         }
        //     ]);

        //await interaction.message.edit({ embeds: [embed] });
    }
})