import { Client, GuildMember, GuildTextBasedChannel, Snowflake, VoiceChannel } from "discord.js";
import { config } from "../config.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { buildHotDropStartedEmbed, QueueDeploymentEmbedOptions } from "../embeds/queue.js";
import Queue from "../tables/Queue.js";
import { sendDmToUser } from "./dm.js";
import { sendEmbedToLogChannel } from "./log_channel.js";
import { debug, error, success, verbose } from "./logger.js";
import { VoiceChannelManager } from "./voice_channels.js";

function generateRandomCode(){let $=[7734,1337,6969,4200,9001,2319,8008,4040,1234,2001,1984,1221,4004,5e3,1024,2e3,2012,8055,1138,1977,1942,3141,2718,1123,6174,4321,8086,6502,1701],_=$[Math.floor(Math.random()*$.length)],o=function $(){let _=[1,1];for(let o=2;o<15;o++)_.push((_[o-1]+_[o-2])%100);return _}()[Math.floor(15*Math.random())],e=[()=>_+o,()=>Number(String(_).slice(0,2)+String(o).padStart(2,"0")),()=>_^o,()=>Math.abs(_*o%1e4)],n=e[Math.floor(Math.random()*e.length)]();return n<1e3?n+=1e3:n>9999&&(n=Number(String(n).slice(0,4))),n}

export async function startQueuedGameImpl(client: Client, strikeMode: boolean): Promise<void> {
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

        if (1 + assignedPlayers.length >= config.min_players) {
            debug(`Creating hot drop; Host: ${host.user}; players: ${assignedPlayers.map(p => p.user).join(', ')}; min_players: ${config.min_players}`, 'Queue System');
            groups.push({ host: host, players: assignedPlayers });
        }
    })

    if (!groups.length) {
        verbose(`Not enough players for hot drop; Hosts: ${hosts.length}; Players: ${players.length};`, 'Queue System');
        return;
    }

    for (const group of groups) {
        const host = group.host;
        const selectedPlayers: Queue[] = group.players;

        const departureChannel = await client.channels.fetch(config.departureChannel) as GuildTextBasedChannel;

        const signupsFormatted = selectedPlayers.map(player => {
            return `<@${player.user}>`;
        }).join(",") || "` - `";

        const hostMember = await departureChannel.guild.members.fetch(host.user).catch(() => null as GuildMember);
        const hostDisplayName = hostMember?.nickname || hostMember?.user.username || 'Unknown Host';
        const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

        await Promise.all(selectedPlayers.map(async player => {
            await client.users.fetch(player.user).catch(() => { });
        }));

        const vcChannelName = !strikeMode ? `🔊| HOTDROP ${randomCode} ${hostDisplayName}` : `🔊| ${hostDisplayName}'s Strike Group!`;
        const vc = await VoiceChannelManager.get().create(departureChannel.guild, strikeMode, vcChannelName, host.user, selectedPlayers.map(p => p.user));

        const playerEmbed = _buildPlayerSelectedForDeploymentEmbed(randomCode, hostDisplayName, vc.id);
        const hostEmbed = _buildHostSquadReadForDeploymentEmbed(randomCode, selectedPlayers.map(p => p.user), vc.id);

        await Promise.all([
            ...selectedPlayers.map(player => 
                client.users.fetch(player.user)
                    .then(user => sendDmToUser(user, { embeds: [playerEmbed] }))
            ),
            client.users.fetch(host.user)
                .then(user => sendDmToUser(user, { embeds: [hostEmbed] })),
        ]);

        const defaultContent = _hotDropDepartureNotice(randomCode, hostDisplayName, vc, host, signupsFormatted);
        const strikeContent = _strikeDepartureNotice(hostDisplayName, vc, host, signupsFormatted);
        debug(`Sending departure message: ${randomCode}; host: ${hostDisplayName}; signups: ${signupsFormatted};`);
        await departureChannel.send({ content: strikeMode ? strikeContent : defaultContent }).catch(() => { });

        for (const player of selectedPlayers) {
            await Queue.delete({ user: player.user });
        }
        await Queue.delete({ user: host.user });

        const playerMembers = await Promise.all(selectedPlayers.map(p => departureChannel.guild.members.fetch(p.user).catch(() => null as GuildMember)));

        await _logHotDropStarted(client, { hostDisplayName, playerMembers, vc });
        success(`Created hot drop: ${randomCode}; Host: ${hostDisplayName}; Participants: ${selectedPlayers.map(p => p.user).join(",")};`, 'Queue System');
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

async function _logHotDropStarted(client: Client, options: QueueDeploymentEmbedOptions) {
    await sendEmbedToLogChannel(buildHotDropStartedEmbed(options), client).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}

function _buildPlayerSelectedForDeploymentEmbed(randomCode: string, hostDisplayName: string, vcChannelId: string) {
    return buildSuccessEmbed()
        .setTitle("🚀 You've Been Selected for a Deployment!")
        .setDescription(
            `You have been selected for a HOTDROP deployment!\n\n` +
            `**Code:** ${randomCode}\n` +
            `**Host:** ${hostDisplayName}\n` +
            `**Voice Channel:** <#${vcChannelId}>\n\n` +
            `Please be ready in the voice channel within 15 minutes.`
        );
}

function _buildHostSquadReadForDeploymentEmbed(randomCode: string, selectedPlayers: Snowflake[], vcChannelId: string) {
    return buildSuccessEmbed()
        .setTitle("🎮 Your Squad is Ready!")
        .setDescription(
            `Your HOTDROP deployment squad has been assembled!\n\n` +
            `**Code:** ${randomCode}\n` +
            `**Voice Channel:** <#${vcChannelId}>\n\n` +
            `**Your Squad:**\n${selectedPlayers.map(p => `<@${p}>`).join('\n')}\n\n` +
            `Please join the voice channel and prepare to lead your squad. Deployment begins in 15 minutes.`
        );
}
