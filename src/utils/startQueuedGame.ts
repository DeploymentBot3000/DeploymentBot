import { ChannelType, GuildTextBasedChannel, User } from "discord.js";
import { client, getDeploymentTime } from "../index.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { buildEmbed } from "./configBuilders.js";
import config from "../config.js";
import VoiceChannel from "../tables/VoiceChannel.js";

export const startQueuedGame = async () => {
    const queue = await Queue.find();
    const hosts = queue.filter(q => q.host);
    const players = queue.filter(q => !q.host);

    if (hosts.length < 1 || players.length < 3) {
        const queueMessages = await QueueStatusMsg.find();

        client.nextGame = new Date(Date.now() + getDeploymentTime());

        for (const queueMessage of queueMessages) {
            const channel = await client.channels.fetch(queueMessage.channel).catch(() => null) as GuildTextBasedChannel;
            const message = await channel.messages.fetch(queueMessage.message).catch(() => null);

            const embed = buildEmbed({ name: "queuePanel" })
                .addFields([
                    {
                        name: "Hosts:",
                        value: hosts.map(host => `<@${host.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Participants:",
                        value: players.map(player => `<@${player.user}>`).join("\n") || "` - `",
                        inline: true
                    },
                    {
                        name: "Next game:",
                        value: `📅 <t:${Math.round(client.nextGame.getTime() / 1000)}:d>\n🕒 <t:${Math.round(client.nextGame.getTime() / 1000)}:t>`,
                    }
                ]);

            await message.edit({ content: `:x: **Not enough players to start, trying again <t:${Math.round(client.nextGame.getTime() / 1000)}:t>**`, embeds: [embed] });
        }
    } else {
        const hostPlayerGroups = hosts.map(host => {
            const assignedPlayers = players.splice(0, 3);
            return {
                host: host,
                players: assignedPlayers.map(player => player.user)
            };
        });

        for (const group of hostPlayerGroups) {
            const host = group.host;
            const selectedPlayers = group.players.map(player => {
                return players.find(p => p.user === player);
            });

            if (!host || selectedPlayers.length < 3) {
                continue;
            }

            const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null) as GuildTextBasedChannel;

            const signupsFormatted = selectedPlayers.map(player => {
                return `<@${player.user}>`;
            }).join("\n") || "` - `";

            const hostUser: User = await client.users.fetch(host.user).catch(() => null);

            await Promise.all(selectedPlayers.map(async player => {
                return await client.users.fetch(player.user).catch(() => null);
            }));

            const vc = await departureChannel.guild.channels.create({
                name: `Operation: ${hostUser.displayName}`,
                type: ChannelType.GuildVoice,
                parent: config.vcCategory,
                permissionOverwrites: [
                    {
                        id: departureChannel.guild.roles.everyone.id,
                        deny: ["ViewChannel"]
                    },
                    {
                        id: host.user,
                        allow: ["ViewChannel"]
                    },
                    ...selectedPlayers.map(player => {
                        return {
                            id: player.user,
                            allow: ["ViewChannel"]
                        }
                    }) as any
                ]
            });

            await VoiceChannel.insert({ channel: vc.id, expires: Date.now() + 3600000, guild: vc.guild.id });

            await departureChannel.send({ content: `# ATTENTION HELLDIVERS\n\n\nOperation: **${hostUser.displayName}**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in 15 minutes.\n**Communication Channel:** <#${vc.id}>.\n\nDeployment Lead:\n<@${host.user}>\n\nHelldivers assigned:\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready 15 minutes before deployment time. If you are to be late make sure you inform the deployment host.` }).catch(() => null);

            // remove the players from the queue
            for (const player of selectedPlayers) {
                await Queue.delete({ user: player.user });
            }

            // remove the host from the queue
            await Queue.delete({ user: host.user });

            // edit the queue message

            const queueMessages = await QueueStatusMsg.find();

            client.nextGame = new Date(Date.now() + getDeploymentTime());

            const currentQueue = await Queue.find();
            const currentHosts = currentQueue.filter(q => q.host);
            const currentPlayers = currentQueue.filter(q => !q.host);

            for (const queueMessage of queueMessages) {
                const channel = await client.channels.fetch(queueMessage.channel).catch(() => null) as GuildTextBasedChannel;
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

        // pick a random host, and 3 random players
        const host = hosts[Math.floor(Math.random() * hosts.length)];
        const selectedPlayers = players.sort(() => 0.5 - Math.random()).slice(0, 3);
    }
};