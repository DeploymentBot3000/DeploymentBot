import { ChannelType, GuildTextBasedChannel, User, GuildMember, PermissionFlagsBits, TextChannel } from "discord.js";
import { fileURLToPath } from 'url';
import { client, getDeploymentTime } from "../index.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { buildEmbed } from "./configBuilders.js";
import config from "../config.js";
import VoiceChannel from "../tables/VoiceChannel.js";
import fs from 'fs/promises';
import path from 'path';
import updateQueueMessages from "./updateQueueMessage.js";

// Add this function to generate a random 4-digit number
function generateRandomCode() {
    return Math.floor(1000 + Math.random() * 9000);
}

export const startQueuedGame = async (deploymentTime: number) => {
    console.log(`Starting queued game. Deployment time: ${new Date(deploymentTime).toISOString()}`);

    const queue = await Queue.find();
    console.log(`Total queue entries: ${queue.length}`);

    const hosts = queue.filter(q => q.host);
    const players = queue.filter(q => !q.host);
    console.log(`Hosts: ${hosts.length}, Players: ${players.length}`);

    const now = Date.now();

    // Read the deployment interval from the file
    const deploymentIntervalMs = await getDeploymentTime();
    console.log(`Deployment interval read from file: ${deploymentIntervalMs} ms`);

    // Calculate the next deployment time
    client.nextGame = new Date(now + deploymentIntervalMs);
    const nextDeploymentTime = client.nextGame.getTime();

    // Fetch the logging channel
    const loggingChannel = await client.channels.fetch(config.loggingChannel).catch(() => null) as TextChannel;

    if (hosts.length < 1 || players.length < 3) {
        console.log(`Not enough players or hosts. Hosts: ${hosts.length}, Players: ${players.length}`);
        // Update queue messages with "Not enough players" message
        await updateQueueMessages(true, nextDeploymentTime);
    } else {
        console.log(`Sufficient players and hosts. Creating groups.`);
        const hostPlayerGroups = hosts.map(host => {
            const assignedPlayers = players.splice(0, 3);
            console.log(`Created group. Host: ${host.user}, Players: ${assignedPlayers.map(p => p.user).join(', ')}`);
            return {
                host: host,
                players: assignedPlayers
            };
        });

        let deploymentCreated = false;

        for (const group of hostPlayerGroups) {
            const host = group.host;
            const selectedPlayers = group.players;

            console.log(`Processing group. Host: ${host?.user}, Players: ${selectedPlayers.map(p => p.user).join(', ')}`);

            if (!host || selectedPlayers.length < 3) {
                console.log(`Skipping group due to insufficient players. Host: ${host?.user}, Players: ${selectedPlayers.length}`);
                continue;
            }

            const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null) as GuildTextBasedChannel;
            console.log(`Departure channel fetched: ${departureChannel?.id}`);

            const signupsFormatted = selectedPlayers.map(player => {
                return `<@${player.user}>`;
            }).join("\n") || "` - `";

            // Fetch the GuildMember object for the host
            const hostMember: GuildMember = await departureChannel.guild.members.fetch(host.user).catch(() => null);
            console.log(`Host member fetched: ${hostMember?.id}`);

            // Use the nickname if available, otherwise fall back to the username
            const hostDisplayName = hostMember?.nickname || hostMember?.user.username || 'Unknown Host';

            // Generate the random code for the voice channel name
            const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

            await Promise.all(selectedPlayers.map(async player => {
                return await client.users.fetch(player.user).catch(() => null);
            }));
            console.log(`All player users fetched`);

            const vc = await departureChannel.guild.channels.create({
                name: `🔊| HOTDROP ${randomCode} ${hostDisplayName}`,
                type: ChannelType.GuildVoice,
                parent: config.vcCategory,
                permissionOverwrites: [
                    {
                        id: departureChannel.guild.roles.everyone.id,
                        deny: ["ViewChannel"]
                    },
                    {
                        id: config.verifiedRoleId,
                        allow: ["ViewChannel"],
                        deny: ["Connect"]
                    },
                    {
                        id: host.user,
                        allow: ["ViewChannel", "Connect", "Speak", "Stream", "MoveMembers", "CreateInstantInvite"]
                    },
                    ...selectedPlayers.map(player => {
                        return {
                            id: player.user,
                            allow: ["ViewChannel", "Connect", "Speak", "Stream",]
                        }
                    }) as any
                ]
            });
            console.log(`Voice channel created: ${vc.id}`);

            await VoiceChannel.insert({ channel: vc.id, expires: Date.now() + 3600000, guild: vc.guild.id }); // 3600000
            console.log(`Voice channel inserted into database`);

            await departureChannel.send({ content: `-------------------------------------------\n\n# <:Helldivers:1226464844534779984> ATTENTION HELLDIVERS <:Helldivers:1226464844534779984>\n\n\n**HOTDROP:** **${randomCode} (${hostDisplayName})**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Deployment Lead:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------` }).catch(() => null);
            console.log(`Deployment message sent`);

            // remove the players from the queue
            for (const player of selectedPlayers) {
                await Queue.delete({ user: player.user });
                console.log(`Player removed from queue: ${player.user}`);
            }

            // remove the host from the queue
            await Queue.delete({ user: host.user });
            console.log(`Host removed from queue: ${host.user}`);

            // Mark that a deployment was created
            deploymentCreated = true;

            // edit the queue message
            await updateQueueMessages(false, nextDeploymentTime, deploymentCreated);
            console.log(`Queue messages updated`); // LOL

            // Log to the logging channel
            if (loggingChannel) {
                try {
                    // Fetch all player members to get their nicknames
                    const playerMembers = await Promise.all(
                        selectedPlayers.map(p => departureChannel.guild.members.fetch(p.user).catch(() => null))
                    );

                    const deploymentEmbed = {
                        color: 0x00FF00,
                        title: '<:Helldivers:1226464844534779984> Queue Deployment <:Helldivers:1226464844534779984>',
                        fields: [
                            {
                                name: '👑 Host',
                                value: hostDisplayName,
                                inline: false
                            },
                            {
                                name: '👥 Players',
                                value: playerMembers
                                    .filter(member => member !== null)
                                    .map(member => `• ${member.nickname || member.user.username}`)
                                    .join('\n') || 'No players found',
                                inline: false
                            },
                            {
                                name: '🎙️ Voice Channel',
                                value: `<#${vc.id}>`,
                                inline: false
                            }
                        ],
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `Channel ID: ${vc.id}`
                        }
                    };

                    await loggingChannel.send({ embeds: [deploymentEmbed] })
                        .catch(error => console.error('Failed to send deployment log:', error));
                } catch (error) {
                    console.error('Error creating deployment log:', error);
                }
            }
        }
    }
};

