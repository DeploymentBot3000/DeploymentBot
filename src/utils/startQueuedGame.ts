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
    const timeUntilDeployment = deploymentTime - now;

    // if (timeUntilDeployment > 0) {
    //     console.log(`Waiting ${timeUntilDeployment}ms until deployment`);
    //     await new Promise(resolve => setTimeout(resolve, timeUntilDeployment));
    // }

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
        
        // Log to the logging channel
        if (loggingChannel) {
            await loggingChannel.send(`Not enough players or hosts for queue deployment. Hosts: ${hosts.length}, Players: ${players.length}`);
        }
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

            // edit the queue message
            await updateQueueMessages(false, nextDeploymentTime, deploymentCreated);
            console.log(`Queue messages updated`);

            // Mark that a deployment was created
            deploymentCreated = true;

            // Log to the logging channel
            if (loggingChannel) {
                const logMessage = `Queue deployment started:\nHost: ${hostDisplayName} (<@${host.user}>)\nPlayers: ${selectedPlayers.map(p => `<@${p.user}>`).join(', ')}\nVoice Channel: ${vc.name} (${vc.id})`;
                await loggingChannel.send(logMessage);
            }
        }
    }
};

async function updateQueueMessages(notEnoughPlayers: boolean = false, nextDeploymentTime: number, deploymentCreated: boolean = false) {
    console.log("Starting updateQueueMessages function");

    const queueMessages = await QueueStatusMsg.find();
    console.log(`Updating ${queueMessages.length} queue messages`);

    const currentQueue = await Queue.find();
    const currentHosts = currentQueue.filter(q => q.host);
    const currentPlayers = currentQueue.filter(q => !q.host);
    console.log(`Current queue: Hosts: ${currentHosts.length}, Players: ${currentPlayers.length}`);

    console.log(`Next deployment time: ${new Date(nextDeploymentTime).toISOString()} (${nextDeploymentTime})`);

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
                    value: `📅 <t:${Math.round(nextDeploymentTime / 1000)}:d>\n🕒 <t:${Math.round(nextDeploymentTime / 1000)}:t>`,
                }
            ]);

        let content = null;
        if (notEnoughPlayers) {
            content = `**❌ Not enough players.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
            console.log(`Adding "Not enough players" message to queue message: ${message.id}`);
        } else if (deploymentCreated) {
            content = `**✅ Successfully created a deployment.** Next deployment starting <t:${Math.round(nextDeploymentTime / 1000)}:R>`;
            console.log(`Adding "Successfully created a deployment" message to queue message: ${message.id}`);
        } else {
            console.log(`Removing status message from queue message: ${message.id}`);
        }

        await message.edit({ content, embeds: [embed] });
        console.log(`Queue message updated: ${message.id}`);
    }
}
