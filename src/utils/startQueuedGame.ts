import { CategoryChannel, ChannelType, Guild, GuildMember, GuildTextBasedChannel } from "discord.js";
import { client } from "../custom_client.js";
import Queue from "../tables/Queue.js";
import config from "../config.js";
import { logQueueDeployment } from "./queueLogger.js";
import {debug, success} from "./logger.js";
import discord_server_config from "../config/discord_server.js";
import { findAllVcCategories } from "./findChannels.js";
import { buildSuccessEmbed } from "./embedBuilders/configBuilders.js";

// Add this function to generate a random 4-digit number
function generateRandomCode(){let $=[7734,1337,6969,4200,9001,2319,8008,4040,1234,2001,1984,1221,4004,5e3,1024,2e3,2012,8055,1138,1977,1942,3141,2718,1123,6174,4321,8086,6502,1701],_=$[Math.floor(Math.random()*$.length)],o=function $(){let _=[1,1];for(let o=2;o<15;o++)_.push((_[o-1]+_[o-2])%100);return _}()[Math.floor(15*Math.random())],e=[()=>_+o,()=>Number(String(_).slice(0,2)+String(o).padStart(2,"0")),()=>_^o,()=>Math.abs(_*o%1e4)],n=e[Math.floor(Math.random()*e.length)]();return n<1e3?n+=1e3:n>9999&&(n=Number(String(n).slice(0,4))),n}

function findNextAvailableVoiceCategory(guild: Guild, strikeMode: boolean): CategoryChannel {
    const vcCategoryPrefix = strikeMode ? discord_server_config.strike_vc_category_prefix : discord_server_config.hotdrop_vc_category_prefix;
    const maxChannels = strikeMode ? discord_server_config.strike_vc_category_max_channels : discord_server_config.hotdrop_vc_category_max_channels;
    let channels = findAllVcCategories(guild, vcCategoryPrefix)
        .filter(channel => channel.children.cache.size < maxChannels);
    if (!channels.size) {
        throw new Error(`All VC categories for prefix ${vcCategoryPrefix} are full`);
    }
    return channels.at(0);
}

export async function startQueuedGameImpl(strikeMode: boolean) {
    const queue = await Queue.find();
    const hosts = queue.filter(q => q.isHost);
    const players = queue.filter(q => !q.isHost);

    const kMaxAssignedPlayers: number = config.max_players - 1;

    const groups: { host: Queue, players: Queue[] }[] = [];
    hosts.forEach((host) => {
        const assignedPlayers: Queue[] = [];
        if (strikeMode) {
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
        if (1 + assignedPlayers.length >= config.min_players) {
            groups.push({
                host: host,
                players: assignedPlayers
            });
        }
    })

    if (!groups.length) {
        return false;
    }

    for (const group of groups) {
        const debugObj = {
            hostId: group.host.user,
            playerCount: group.players.length,
            players: group.players.map(p => p.user)
        };
        debug(`Checking group: ${JSON.stringify(debugObj)}`, 'Queue System');

        const host = group.host;
        const selectedPlayers: Queue[] = group.players;

        const departureChannel = await client.channels.fetch(config.departureChannel) as GuildTextBasedChannel;

        const signupsFormatted = selectedPlayers.map(player => {
            return `<@${player.user}>`;
        }).join("\n") || "` - `";

        // Fetch the GuildMember object for the host
        const hostMember = await departureChannel.guild.members.fetch(host.user).catch(() => null as GuildMember);

        // Use the nickname if available, otherwise fall back to the username
        const hostDisplayName = hostMember?.nickname || hostMember?.user.username || 'Unknown Host';

        // Generate the random code for the voice channel name
        const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

        await Promise.all(selectedPlayers.map(async player => {
            await client.users.fetch(player.user).catch(() => { });
        }));

        const vcCategory: CategoryChannel = findNextAvailableVoiceCategory(departureChannel.guild, strikeMode);

        const vcChannelName = !strikeMode ? `🔊| HOTDROP ${randomCode} ${hostDisplayName}` : `🔊| ${hostDisplayName}'s Strike Group!`;
        debug(`Creating voice channel: ${vcChannelName}`); (`Creating voice channel: ${vcChannelName}`);
        const vc = await departureChannel.guild.channels.create({
            name: vcChannelName,
            type: ChannelType.GuildVoice,
            parent: vcCategory,
            userLimit: 4,
            permissionOverwrites: [
                {
                    id: client.user,
                    allow: ["ViewChannel", "ManageChannels", "MoveMembers", "CreateInstantInvite"]
                },
                {
                    id: host.user,
                    allow: ["Connect", "Speak", "Stream", "MoveMembers", "CreateInstantInvite"]
                },
                ...selectedPlayers.map(player => {
                    return {
                        id: player.user,
                        allow: ["Connect", "Speak", "Stream"]
                    }
                }) as any
            ]
        });

        // Create base embed for players
        const playerEmbed = buildSuccessEmbed()
            .setTitle("🚀 You've Been Selected for a Deployment!")
            .setDescription(
                `You have been selected for a HOTDROP deployment!\n\n` +
                `**Code:** ${randomCode}\n` +
                `**Host:** ${hostDisplayName}\n` +
                `**Voice Channel:** <#${vc.id}>\n\n` +
                `Please be ready in the voice channel within 15 minutes.`
            );

        // Create specific embed for host
        const hostEmbed = buildSuccessEmbed()
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

        const defaultContent = `-------------------------------------------\n\n# ATTENTION HELLDIVERS\n\n\n**HOTDROP:** **${randomCode} (${hostDisplayName})**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Deployment Lead:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------`;
        const strikeContent = `-------------------------------------------\n\n# ATTENTION HELLDIVERS\n\n\n**You have been assigned to ${hostDisplayName}'s Strike Group**\nTheir Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Strike Leader:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------`;
        await departureChannel.send({ content: strikeMode ? strikeContent : defaultContent }).catch(() => { });

        // remove the players from the queue
        for (const player of selectedPlayers) {
            await Queue.delete({ user: player.user });
        }

        // remove the host from the queue
        await Queue.delete({ user: host.user });

        // Fetch all player members to get their nicknames
        const playerMembers = await Promise.all(selectedPlayers.map(p => departureChannel.guild.members.fetch(p.user).catch(() => null as GuildMember)));

        // Log to all logging channels
        await logQueueDeployment({
            hostDisplayName,
            playerMembers,
            vc
        });
        success(`Successfully created deployment for ${hostDisplayName}`, 'Queue System');
    }
    return true;
}
