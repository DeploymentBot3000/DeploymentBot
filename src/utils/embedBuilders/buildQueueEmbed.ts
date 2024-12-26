import { APIEmbedField, EmbedBuilder, GuildMember, GuildTextBasedChannel } from "discord.js";
import Queue from "../../tables/Queue.js";
import { HotDropQueue } from "../hot_drop_queue.js";

async function getFields(channel: GuildTextBasedChannel, currentQueue: Queue[]): Promise<APIEmbedField[]> {
    const currentHosts = currentQueue.filter(q => q.isHost);
    const currentPlayers = currentQueue.filter(q => !q.isHost);

    if (HotDropQueue.getHotDropQueue().strikeModeEnabled)
        return [
            {
                name: '**Hosts:**',
                value: `Total: ${currentHosts.length}`,
                inline: true
            },
            {
                name: '**Participants:**',
                value: `Total: ${currentPlayers.length}`,
                inline: true
            }
        ];

    const currentHostsNames = await Promise.all(currentHosts.map(async host => {
        const member = await channel.guild.members.fetch(host.user).catch(() => null as GuildMember);
        return member ? member.displayName : 'Unknown User';
    }));

    const currentPlayersNames = await Promise.all(currentPlayers.map(async player => {
        const member = await channel.guild.members.fetch(player.user).catch(() => null as GuildMember);
        return member ? member.displayName : 'Unknown User';
    }));

    let rows: string[][] = [["` - `", "` - `"]];
    [currentHostsNames, currentPlayersNames].forEach((type, index) => {
        let currentField = '';
        let row = 0;
        
        type.forEach((user) => {
            const text = `${user}\n`;

            if(currentField.length + text.length <= 1000) {
                currentField += text;
            } else {
                if(rows[row] == undefined) rows.push(['', '']);
                rows[row][index] = currentField;
                currentField = text;
                row++;
            }
        });
        if(rows[row] == undefined) rows.push(['', '']);
        if(currentField) rows[row][index] = currentField;
    });

    const fields: APIEmbedField[] = [];
    rows.forEach((row, index) => {
        fields.push({
            name: row[0] ? `**Hosts:**` : ' ',
            value: row[0] || ' ',
            inline: true
        });
        fields.push({
            name: row[1] ? '**Participants:**' : ' ',
            value: row[1] || ' ',
            inline: true
        });
        if(!fields[index]) return;
        fields.push({
            name: ' ',
            value: ' ',
        });
    })
    return fields;
}

export default async function buildQueueEmbed(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false, channel: GuildTextBasedChannel): Promise<EmbedBuilder> {
    const currentQueue = await Queue.find();
    const fields: APIEmbedField[] = await getFields(channel, currentQueue);

    let content = null;
    if (notEnoughPlayers) {
        content = `❌**┃Not enough players.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    } else if (deploymentCreated) {
        content = `✅**┃Successfully created a deployment.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🔥┃${HotDropQueue.getHotDropQueue().strikeModeEnabled ? 'Strike Queue' : 'Hot Drop Queue'}`)
        .addFields(
            {
                name: ' ',
                value: "Hot drop deployments are urgent deployments, where random divers from the Queue Panel get selected at the listed interval of time below and sent to their hellpods!",
            },
            {
                name: ' ',
                value: content,
            },
            {
                name: ' ',
                value: "🚀**┃**Click **Host** to be added as a host",
            },
            {
                name: ' ',
                value: "📝**┃**Click **Join** to be added to the queue",
            },
            {
                name: ' ',
                value: "🚫**┃**Click **Leave** to leave the queue",
            },
            {
                name: ' ',
                value: "🛑**┃**Leave the queue if you are no longer available!",
            },
            {
                name: ' ',
                value: "🔊**┃**Once deployed, you have **15 MINUTES** to join the correct voice channel!",
            },
            {
                name: ' ',
                value: "⚠️**┃**Failing to attend an assigned Hot Drop will result in **3 Sanction points**.",
            },
            ...fields,
            {
                name: "Next game:",
                value: `📅**┃**<t:${Math.round(nextDeploymentTime / 1000)}:d>\n🕒**┃**<t:${Math.round(nextDeploymentTime / 1000)}:t>`,
            }
        );

    return embed;
}
