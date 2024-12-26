import { EmbedBuilder, VoiceChannel } from "discord.js";
import { formatDiscordTime } from "../utils/time.js";
import { DateTime } from "luxon";

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

export function buildQueueDeploymentEmbed(options: QueueDeploymentEmbedOptions) {
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
