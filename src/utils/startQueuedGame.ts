import {CategoryChannel, ChannelType, GuildMember, GuildTextBasedChannel} from "discord.js";
import {client, getDeploymentTime} from "../index.js";
import Queue from "../tables/Queue.js";
import StrikeCategory from "../tables/StrikeCatagory.js";
import config from "../config.js";
import VoiceChannel from "../tables/VoiceChannel.js";
import updateQueueMessages from "./updateQueueMessage.js";
import {logQueueDeployment} from "./queueLogger.js";
import {buildEmbed} from "./embedBuilders/configBuilders.js";
import Category from "../classes/Category.js";
import {debug, success} from "./logger.js";
import { getMaxPlayers, getMinPlayers } from "./settings.js";

// Add this function to generate a random 4-digit number
function generateRandomCode(){let $=[7734,1337,6969,4200,9001,2319,8008,4040,1234,2001,1984,1221,4004,5e3,1024,2e3,2012,8055,1138,1977,1942,3141,2718,1123,6174,4321,8086,6502,1701],_=$[Math.floor(Math.random()*$.length)],o=function $(){let _=[1,1];for(let o=2;o<15;o++)_.push((_[o-1]+_[o-2])%100);return _}()[Math.floor(15*Math.random())],e=[()=>_+o,()=>Number(String(_).slice(0,2)+String(o).padStart(2,"0")),()=>_^o,()=>Math.abs(_*o%1e4)],n=e[Math.floor(Math.random()*e.length)]();return n<1e3?n+=1e3:n>9999&&(n=Number(String(n).slice(0,4))),n}

async function getParent() {
    if(!client.battalionStrikeMode) return config.vcCategory;
    const existingCategorys = await StrikeCategory.find();
    for (const category of existingCategorys) {
        const categoryChannel = await client.channels.fetch(category.categoryId) as CategoryChannel;
        if (categoryChannel && categoryChannel.children.cache.size < 50) return category.categoryId;
    }
    return (await new Category().init())?.id || config.vcCategory;
}

export const startQueuedGame = async (deploymentTime: number) => {
    const queue = await Queue.find();
    const hosts = queue.filter(q => q.host);
    const players = queue.filter(q => !q.host);
    const now = Date.now();

    // Read the deployment interval from the file
    const deploymentIntervalMs = await getDeploymentTime();

    // Calculate the next deployment time
    client.nextGame = new Date(now + deploymentIntervalMs);
    const nextDeploymentTime = client.nextGame.getTime();

    const kMinPlayers: number = await getMinPlayers();
    const kMinAssignedPlayers: number = kMinPlayers - 1;
    const kMaxAssignedPlayers: number = await getMaxPlayers() - 1;

    if (hosts.length < 1 || players.length < kMinAssignedPlayers) {
        await updateQueueMessages(/*notEnoughPlayers=*/true, nextDeploymentTime);
        return;
    }

    const groups = [];
    hosts.forEach((host) => {
        const assignedPlayers = [];
        if(client.battalionStrikeMode) {
            for (let i = 0; i < kMaxAssignedPlayers; i++) {
                if (players.length > 0) {
                    const randomIndex = Math.floor(Math.random() * players.length);
                    assignedPlayers.push(players.splice(randomIndex, 1)[0]);
                }
            }
        } else {
            assignedPlayers.push(...players.splice(0, kMaxAssignedPlayers));
        }

        // Include the group if we have a host and enough assigned players.
        // If we don't, the assigned players will be scheduled on the next round if we have another host.
        if (1 + assignedPlayers.length >= kMinPlayers) {
            groups.push({
                host: host,
                players: assignedPlayers
            });
        }
    })

    let deploymentCreated = false;

    for (const group of groups) {
        const debugObj = {
            hostId: group.host.user,
            playerCount: group.players.length,
            players: group.players.map(p => p.user)
        };
        debug(`Checking group: ${JSON.stringify(debugObj)}`, 'Queue System');

        const host = group.host;
        const selectedPlayers = group.players;

        const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null) as GuildTextBasedChannel;

        const signupsFormatted = selectedPlayers.map(player => {
            return `<@${player.user}>`;
        }).join("\n") || "` - `";

        // Fetch the GuildMember object for the host
        const hostMember: GuildMember = await departureChannel.guild.members.fetch(host.user).catch(() => null);

        // Use the nickname if available, otherwise fall back to the username
        const hostDisplayName = hostMember?.nickname || hostMember?.user.username || 'Unknown Host';

        // Generate the random code for the voice channel name
        const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

        await Promise.all(selectedPlayers.map(async player => {
            return await client.users.fetch(player.user).catch(() => null);
        }));

        const vc = await departureChannel.guild.channels.create({
            name: !client.battalionStrikeMode ? `🔊| HOTDROP ${randomCode} ${hostDisplayName}` : `🔊| ${hostDisplayName}'s Strike Group!`,
            type: ChannelType.GuildVoice,
            parent: await getParent(),
            userLimit: 4,
            permissionOverwrites: [
                {
                    id: departureChannel.guild.roles.everyone.id,
                    deny: ["ViewChannel"]
                },
                {
                    id: config.verifiedRoleId,
                    allow: ["ViewChannel", "Connect"],
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

        await VoiceChannel.insert({ channel: vc.id, expires: Date.now() + 3600000, guild: vc.guild.id }); // 3600000

        // Create base embed for players
        const playerEmbed = buildEmbed({ preset: "success" })
            .setTitle("🚀 You've Been Selected for a Deployment!")
            .setDescription(
                `You have been selected for a HOTDROP deployment!\n\n` +
                `**Code:** ${randomCode}\n` +
                `**Host:** ${hostDisplayName}\n` +
                `**Voice Channel:** <#${vc.id}>\n\n` +
                `Please be ready in the voice channel within 15 minutes.`
            );

        // Create specific embed for host
        const hostEmbed = buildEmbed({ preset: "success" })
            .setTitle("🎮 Your Squad is Ready!")
            .setDescription(
                `Your HOTDROP deployment squad has been assembled!\n\n` +
                `**Code:** ${randomCode}\n` +
                `**Voice Channel:** <#${vc.id}>\n\n` +
                `**Your Squad:**\n${selectedPlayers.map(p => `<@${p.user}>`).join('\n')}\n\n` +
                `Please join the voice channel and prepare to lead your squad. Deployment begins in 15 minutes.`
            );

        // Send DMs to all selected players and host
        await Promise.all([
            ...selectedPlayers.map(player => 
                client.users.fetch(player.user)
                    .then(user => user.send({ embeds: [playerEmbed] })
                    .catch(() => console.log(`Failed to DM player ${player.user}`)))
            ),
            // Send DM to host with their specific embed
            client.users.fetch(host.user)
                .then(user => user.send({ embeds: [hostEmbed] })
                .catch(() => console.log(`Failed to DM host ${host.user}`)))
        ]);

        const defaultContent = `-------------------------------------------\n\n# <:Helldivers:1226464844534779984> ATTENTION HELLDIVERS <:Helldivers:1226464844534779984>\n\n\n**HOTDROP:** **${randomCode} (${hostDisplayName})**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Deployment Lead:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------`;
        const strikeContent = `-------------------------------------------\n\n# <:Helldivers:1226464844534779984> ATTENTION HELLDIVERS <:Helldivers:1226464844534779984>\n\n\n**You have been assigned to ${hostDisplayName}'s Strike Group**\nTheir Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Strike Leader:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------`;
        await departureChannel.send({ content: client.battalionStrikeMode ? strikeContent : defaultContent }).catch(() => null);

        // remove the players from the queue
        for (const player of selectedPlayers) {
            await Queue.delete({ user: player.user });
        }

        // remove the host from the queue
        await Queue.delete({ user: host.user });

        // Mark that a deployment was created
        deploymentCreated = true;

        // edit the queue message
        await updateQueueMessages(false, nextDeploymentTime, deploymentCreated);
        success(`Queue messages updated for next deployment at ${new Date(nextDeploymentTime).toLocaleTimeString()}`, 'Queue System');

        // Fetch all player members to get their nicknames
        const playerMembers = await Promise.all(selectedPlayers.map(p => departureChannel.guild.members.fetch(p.user).catch(() => null)));

        // Log to all logging channels
        await logQueueDeployment({
            hostDisplayName,
            playerMembers,
            vc
        });
        success(`Successfully created deployment for ${hostDisplayName}`, 'Queue System');
    }
};
