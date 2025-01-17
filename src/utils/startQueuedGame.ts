import { GuildMember, GuildTextBasedChannel, VoiceChannel } from "discord.js";
import { config } from "../config.js";
import { client } from "../custom_client.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import Queue from "../tables/Queue.js";
import { sendDmToUser } from "./dm.js";
import { debug, success } from "./logger.js";
import { logHotDropStarted } from "./queueLogger.js";
import { VoiceChannelManager } from "./voice_channels.js";

// Add this function to generate a random 4-digit number
function generateRandomCode(){let $=[7734,1337,6969,4200,9001,2319,8008,4040,1234,2001,1984,1221,4004,5e3,1024,2e3,2012,8055,1138,1977,1942,3141,2718,1123,6174,4321,8086,6502,1701],_=$[Math.floor(Math.random()*$.length)],o=function $(){let _=[1,1];for(let o=2;o<15;o++)_.push((_[o-1]+_[o-2])%100);return _}()[Math.floor(15*Math.random())],e=[()=>_+o,()=>Number(String(_).slice(0,2)+String(o).padStart(2,"0")),()=>_^o,()=>Math.abs(_*o%1e4)],n=e[Math.floor(Math.random()*e.length)]();return n<1e3?n+=1e3:n>9999&&(n=Number(String(n).slice(0,4))),n}

export async function startQueuedGameImpl(strikeMode: boolean): Promise<void> {
    const queue = await Queue.find();
    const hosts = queue.filter(q => q.isHost);
    const players = queue.filter(q => !q.isHost);

    const kMaxAssignedPlayers: number = config.max_players - 1;

    const groups: { host: Queue, players: Queue[] }[] = [];
    hosts.forEach((host) => {
        let assignedPlayers: Queue[] = [];
        if (strikeMode) {
            for (let i = 0; i < kMaxAssignedPlayers; i++) {
                if (players.length > 0) {
                    const randomIndex = Math.floor(Math.random() * players.length);
                    assignedPlayers.push(players.splice(randomIndex, 1)[0]);
                }
            }
        } else {
            assignedPlayers = players.splice(0, kMaxAssignedPlayers);
        }

        // Include the group if we have a host and enough assigned players.
        // If we don't, the assigned players will be scheduled on the next round if we have another host.
        if (1 + assignedPlayers.length >= config.min_players) {
            debug(`Creating hot drop; Host: ${host.user}; players: ${assignedPlayers.map(p => p.user).join(', ')}; min_players: ${config.min_players}`);
            groups.push({
                host: host,
                players: assignedPlayers
            });
        }
    })

    if (!groups.length) {
        return;
    }

    for (const group of groups) {
        const host = group.host;
        const selectedPlayers: Queue[] = group.players;

        const departureChannel = await client.channels.fetch(config.departureChannel) as GuildTextBasedChannel;

        const signupsFormatted = selectedPlayers.map(player => {
            return `<@${player.user}>`;
        }).join(",") || "` - `";

        // Fetch the GuildMember object for the host
        const hostMember = await departureChannel.guild.members.fetch(host.user).catch(() => null as GuildMember);

        // Use the nickname if available, otherwise fall back to the username
        const hostDisplayName = hostMember?.nickname || hostMember?.user.username || 'Unknown Host';

        // Generate the random code for the voice channel name
        const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

        await Promise.all(selectedPlayers.map(async player => {
            await client.users.fetch(player.user).catch(() => { });
        }));

        const vcChannelName = !strikeMode ? `🔊| HOTDROP ${randomCode} ${hostDisplayName}` : `🔊| ${hostDisplayName}'s Strike Group!`;
        debug(`Creating voice channel: ${vcChannelName}`);
        const vc = await VoiceChannelManager.get().create(departureChannel.guild, strikeMode, vcChannelName, host.user, selectedPlayers.map(p => p.user));

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
                    .then(user => sendDmToUser(user, { embeds: [playerEmbed] }))
            ),
            // Send DM to host with their specific embed
            client.users.fetch(host.user)
                .then(user => sendDmToUser(user, { embeds: [hostEmbed] })),
        ]);

        const defaultContent = _hotDropDepartureNotice(randomCode, hostDisplayName, vc, host, signupsFormatted);
        const strikeContent = _strikeDepartureNotice(hostDisplayName, vc, host, signupsFormatted);
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
        await logHotDropStarted({
            hostDisplayName,
            playerMembers,
            vc
        });
        success(`Successfully created deployment for ${hostDisplayName}`, 'Queue System');
    }
}

function _hotDropDepartureNotice(randomCode: string, hostDisplayName: string, vc: VoiceChannel, host: Queue, signupsFormatted: string) {
    const departureNoticeLeadTimeMinutes = config.departure_notice_lead_time_minutes;

    return `
-------------------------------------------
# ATTENTION HELLDIVERS

**Hot Drop:** **${randomCode} (${hostDisplayName})**
A Super Earth Destroyer will be mission ready and deploying to the operation grounds imminently.
**Communication Channel:** <#${vc.id}>.
Host and assigned divers, please join ASAP.
The operation starts in **${departureNoticeLeadTimeMinutes} minutes**.

**Host:** <@${host.user}>
**Assigned divers:** ${signupsFormatted}
-------------------------------------------`;
}

function _strikeDepartureNotice(hostDisplayName: string, vc: VoiceChannel, host: Queue, signupsFormatted: string) {
    return `
-------------------------------------------
# ATTENTION HELLDIVERS

**You have been assigned to ${hostDisplayName}'s Strike Group**
A Super Earth Destroyer will be mission ready and deploying to the operation grounds imminently.
**Communication Channel:** <#${vc.id}>.
Host and assigned divers, please join ASAP.

**Host:** <@${host.user}>
**Assigned divers:** ${signupsFormatted}
-------------------------------------------`;
}
