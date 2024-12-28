import { APIEmbedField, EmbedBuilder, GuildMember, GuildTextBasedChannel, VoiceChannel } from "discord.js";
import { DateTime } from "luxon";
import Queue from "../tables/Queue.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";

export type QueueEventEmbedOptions = {
    type: 'join' | 'leave' | 'host',
    userId: string,
    joinTime?: Date,
    leaveTime?: Date,
    queueBefore?: number,
    queueAfter?: number,
};

export function buildQueueEventEmbed(options: QueueEventEmbedOptions): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`Queue ${options.type.charAt(0).toUpperCase() + options.type.slice(1)}`)
        .addFields({ name: ' ', value: `User: <@${options.userId}>` })
        .setTimestamp();

    switch (options.type) {
        case 'join':
            embed.setColor('#00FF00')
                .setTitle('✅┃Queue Join')
                .addFields(
                    { name: `🪖┃Type: Diver`, value: ' ' },
                    { name: `⏰┃Join Time: ${formatDiscordTime(DateTime.now())}`, value: ' ' }
                );
            break;
        case 'host':
            embed.setColor('#FFFF00')
                .setTitle('👑┃Queue Host')
                .addFields(
                    { name: `🪖┃Type: Host`, value: ' ' },
                    { name: `⏰┃Join Time: ${formatDiscordTime(DateTime.now())}`, value: ' ' }
                );
            break;
        case 'leave':
            embed.setColor('#FF0000')
                .setTitle('❌┃Queue Leave');
            if (options.joinTime) {
                const queueDuration = options.leaveTime
                    ? Math.floor((options.leaveTime.getTime() - options.joinTime.getTime()) / 1000)
                    : Math.floor((new Date().getTime() - options.joinTime.getTime()) / 1000);

                const formatDuration = (seconds: number): string => {
                    const hours = Math.floor(seconds / 3600);
                    const minutes = Math.floor((seconds % 3600) / 60);
                    const remainingSeconds = seconds % 60;

                    const parts = [];
                    if (hours > 0) parts.push(`${hours}h`);
                    if (minutes > 0) parts.push(`${minutes}m`);
                    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

                    return parts.join(' ');
                };

                embed.addFields(
                    { name: `⏰┃Join Time: ${formatDiscordTime(DateTime.fromJSDate(options.joinTime))}`, value: ' ' },
                    { name: `⏱️┃Time in Queue: ${formatDuration(queueDuration)}`, value: ' ' }
                );
            }
            if (options.leaveTime) {
                embed.addFields({ name: `⏰┃Leave Time: ${formatDiscordTime(DateTime.fromJSDate(options.leaveTime))}`, value: ' ' });
            }
            if (options.queueBefore !== undefined && options.queueAfter !== undefined) {
                embed.addFields({ name: `🦀┃Queue Change: ${options.queueBefore} → ${options.queueAfter}`, value: ' ' });
            }
            break;
    }
    return embed;
}

export type QueueDeploymentEmbedOptions = {
    hostDisplayName: string,
    playerMembers: any[],
    vc: VoiceChannel,
};

export function buildHotDropStartedEmbed(options: QueueDeploymentEmbedOptions) {
    return new EmbedBuilder({
        color: 0x00FF00,
        title: 'Queue Deployment',
        fields: [
            {
                name: '👑 Host',
                value: options.hostDisplayName,
                inline: false
            },
            {
                name: '👥 Players',
                value: options.playerMembers
                    .filter(member => member !== null)
                    .map(member => `• ${member.nickname || member.user.username}`)
                    .join('\n') || 'No players found',
                inline: false
            },
            {
                name: '🎙️ Voice Channel',
                value: `<#${options.vc.id}>`,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: `Channel ID: ${options.vc.id}`
        }
    });
}

export default async function buildQueuePanelEmbed(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false, channel: GuildTextBasedChannel): Promise<EmbedBuilder> {
    const currentQueue = await Queue.find();
    const fields: APIEmbedField[] = await getFields(channel, currentQueue);

    let content = null;
    if (notEnoughPlayers) {
        content = `❌**┃Not enough players.** Next deployment starting ${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.RELATIVE_TIME)}`;
    } else if (deploymentCreated) {
        content = `✅**┃Successfully created a deployment.** Next deployment starting ${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.RELATIVE_TIME)}`;
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
                value: `📅**┃**${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.SHORT_DATE)}\n
🕒**┃**${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.SHORT_TIME)}`,
            }
        );

    return embed;
}

export async function getFields(channel: GuildTextBasedChannel, currentQueue: Queue[]): Promise<APIEmbedField[]> {
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

            if (currentField.length + text.length <= 1000) {
                currentField += text;
            } else {
                if (rows[row] == undefined) rows.push(['', '']);
                rows[row][index] = currentField;
                currentField = text;
                row++;
            }
        });
        if (rows[row] == undefined) rows.push(['', '']);
        if (currentField) rows[row][index] = currentField;
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
        if (!fields[index]) return;
        fields.push({
            name: ' ',
            value: ' ',
        });
    })
    return fields;
}
