import { APIEmbedField, EmbedBuilder, GuildMember, VoiceChannel } from "discord.js";
import { DateTime } from "luxon";
import { MAX_FIELD_VALUE_LENGTH } from "../discord_constants.js";
import { groupPlayers } from "../utils/startQueuedGame.js";
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

export function buildHotDropStartedEmbed(host: GuildMember, players: GuildMember[], vc: VoiceChannel) {
    return new EmbedBuilder({
        color: 0x00FF00,
        title: 'Queue Deployment',
        fields: [
            {
                name: 'Host',
                value: `${host.displayName} ||<@${host.id}>||`,
                inline: true
            },
            {
                name: 'Players',
                value: players.map(member => `${member.displayName} ||<@${member.id}>||`).join('\n') || '` - `',
                inline: true
            },
            {
                name: 'Voice Channel',
                value: `${vc.name} ||<#${vc.id}>||`,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
    });
}

export default function buildQueuePanelEmbed(nextDeploymentTime: number, hosts: string[], players: string[], strikeModeEnabled: boolean): EmbedBuilder {
    const groups = groupPlayers(hosts, players, strikeModeEnabled);
    let content = `❌ Not enough players ┃ Next deployment starting ${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.RELATIVE_TIME)}`;
    if (groups.length) {
        content = `✅ ┃ Next ${groups.length} deployments starting ${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.RELATIVE_TIME)}`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🔥┃${strikeModeEnabled ? 'Strike Queue' : 'Hot Drop Queue'}`)
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
                value: "⚠️**┃**Failing to attend an assigned Hot Drop will result in a **strike**.",
            },
            ..._buildHostsAndPlayersEmbedFields(hosts, players),
            {
                name: "Next game:",
                value: `📅**┃**${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.SHORT_DATE)}\n
🕒**┃**${formatDiscordTime(DateTime.fromMillis(nextDeploymentTime), DiscordTimestampFormat.SHORT_TIME)}`,
            }
        );

    return embed;
}

function _buildHostsAndPlayersEmbedFields(hosts: string[], players: string[]): APIEmbedField[] {
    const currentHostsNamesStr = hosts.join('\n');
    const currentPlayersNamesStr = players.join('\n');

    // Limit list to length 20, otherwise the list gets really long and hard to look at.
    // Especially when in strike mode.
    if (hosts.length <= 20 && currentHostsNamesStr.length <= MAX_FIELD_VALUE_LENGTH && players.length <= 20 && currentPlayersNamesStr.length <= MAX_FIELD_VALUE_LENGTH) {
        return [
            {
                name: `**Hosts:**`,
                value: currentHostsNamesStr || '` - `',
                inline: true,
            }, {
                name: `**Participants:**`,
                value: currentPlayersNamesStr || '` - `',
                inline: true,
            }
        ];
    } else {
        return [
            {
                name: '**Hosts:**',
                value: `Total: ${hosts.length}`,
                inline: true,
            }, {
                name: '**Participants:**',
                value: `Total: ${players.length}`,
                inline: true,
            }
        ];
    }
}
