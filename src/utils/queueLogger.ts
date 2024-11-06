import { EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import { client } from "../index.js";

export async function logQueueAction(options: {
    type: 'join' | 'leave' | 'host',
    userId: string,
    joinTime?: Date,
    leaveTime?: Date,
    queueBefore?: number,
    queueAfter?: number,
    dbStatus?: boolean
}) {
    const logChannel = await client.channels.fetch('1303492344636772392') as GuildTextBasedChannel;
    
    const embed = new EmbedBuilder()
        .setTitle(`Queue ${options.type.charAt(0).toUpperCase() + options.type.slice(1)}`)
        .addFields({ name: 'User', value: `<@${options.userId}>` })
        .setTimestamp();

    switch (options.type) {
        case 'join':
            embed.setColor('#00FF00')
                .addFields(
                    { name: 'Type', value: 'Regular' },
                    { name: 'Join Time', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>` }
                );
            break;
        case 'host':
            embed.setColor('#FFFF00')
                .addFields(
                    { name: 'Type', value: 'Host' },
                    { name: 'Join Time', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>` }
                );
            break;
        case 'leave':
            embed.setColor('#FF0000');
            if (options.joinTime) {
                embed.addFields({ name: 'Join Time', value: `<t:${Math.floor(options.joinTime.getTime() / 1000)}:F>` });
            }
            if (options.leaveTime) {
                embed.addFields({ name: 'Leave Time', value: `<t:${Math.floor(options.leaveTime.getTime() / 1000)}:F>` });
            }
            if (options.queueBefore !== undefined && options.queueAfter !== undefined) {
                embed.addFields({ name: 'Queue Change', value: `${options.queueBefore} → ${options.queueAfter}` });
            }
            if (options.dbStatus !== undefined) {
                embed.addFields({ name: 'DB Remove', value: options.dbStatus ? '✅' : '❌' });
            }
            break;
    }

    await logChannel.send({ embeds: [embed] });
} 