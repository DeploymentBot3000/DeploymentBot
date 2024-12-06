import { EmbedBuilder, VoiceChannel } from "discord.js";
import HackedEmbedBuilder from "../classes/HackedEmbedBuilder.js";

export type QueueEventEmbedOptions = {
    type: 'join' | 'leave' | 'host',
    userId: string,
    joinTime?: Date,
    leaveTime?: Date,
    queueBefore?: number,
    queueAfter?: number,
    dbStatus?: boolean
};

export function buildQueueEventEmbed(options: QueueEventEmbedOptions): EmbedBuilder {
    const embed = new HackedEmbedBuilder()
        .setTitle(`Queue ${options.type.charAt(0).toUpperCase() + options.type.slice(1)}`)
        .addFields({ value: `<:Susdiver:1303685727627903006>┃User: <@${options.userId}>` })
        .setTimestamp();

    switch (options.type) {
        case 'join':
            embed.setColor('#00FF00')
                .setTitle('✅┃Queue Join')
                .addFields(
                    { name: `🪖┃Type: Diver` },
                    { name: `⏰┃Join Time: <t:${Math.floor(new Date().getTime() / 1000)}:F>` }
                );
            break;
        case 'host':
            embed.setColor('#FFFF00')
                .setTitle('👑┃Queue Host')
                .addFields(
                    { name: `🪖┃Type: Host` },
                    { name: `⏰┃Join Time: <t:${Math.floor(new Date().getTime() / 1000)}:F>` }
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
                    { name: `⏰┃Join Time: <t:${Math.floor(options.joinTime.getTime() / 1000)}:F>` },
                    { name: `⏱️┃Time in Queue: ${formatDuration(queueDuration)}` }
                );
            }
            if (options.leaveTime) {
                embed.addFields({ name: `⏰┃Leave Time: <t:${Math.floor(options.leaveTime.getTime() / 1000)}:F>` });
            }
            if (options.queueBefore !== undefined && options.queueAfter !== undefined) {
                embed.addFields({ name: `<a:Crabrave:1306204480932675606>┃Queue Change: ${options.queueBefore} → ${options.queueAfter}` });
            }
            if (options.dbStatus !== undefined) {
                embed.addFields({ name: `💣┃DB Remove: ${options.dbStatus ? '✅' : '❌'}` });
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
