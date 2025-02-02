import { Client, GuildMember, Snowflake, TextChannel, VoiceChannel } from "discord.js";
import { In } from "typeorm";
import { config } from "../config.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { buildHotDropStartedEmbed, QueueDeploymentEmbedOptions } from "../embeds/queue.js";
import Queue from "../tables/Queue.js";
import { sendDmToUser } from "./dm.js";
import { sendEmbedToLogChannel, sendErrorToLogChannel } from "./log_channel.js";
import { debug, error, success, verbose } from "./logger.js";
import { VoiceChannelManager } from "./voice_channels.js";

function generateRandomCode(){let $=[7734,1337,6969,4200,9001,2319,8008,4040,1234,2001,1984,1221,4004,5e3,1024,2e3,2012,8055,1138,1977,1942,3141,2718,1123,6174,4321,8086,6502,1701],_=$[Math.floor(Math.random()*$.length)],o=function $(){let _=[1,1];for(let o=2;o<15;o++)_.push((_[o-1]+_[o-2])%100);return _}()[Math.floor(15*Math.random())],e=[()=>_+o,()=>Number(String(_).slice(0,2)+String(o).padStart(2,"0")),()=>_^o,()=>Math.abs(_*o%1e4)],n=e[Math.floor(Math.random()*e.length)]();return n<1e3?n+=1e3:n>9999&&(n=Number(String(n).slice(0,4))),n}

interface HotDropGroup {
    host: GuildMember;
    players: GuildMember[];
};

export async function startQueuedGameImpl(client: Client, strikeMode: boolean): Promise<void> {
    const guild = await client.guilds.fetch(config.guildId);

    const departureChannel = await client.channels.fetch(config.departureChannel);
    if (!(departureChannel instanceof TextChannel)) {
        throw new Error(`Invalid departure channel: ${config.departureChannel}`);
    }

    const queue = await Queue.find();
    const hosts = queue.filter(q => q.isHost);
    const players = queue.filter(q => !q.isHost);
    const rawGroups = groupPlayers(hosts.map(h => h.user), players.map(p => p.user), strikeMode);
    if (!rawGroups.length) {
        verbose(`Not enough players for hot drop; Hosts: ${hosts.length}; Players: ${players.length};`, 'Queue');
        return;
    }

    const groups: HotDropGroup[] = await Promise.all(rawGroups.map(async g => ({
        host: await guild.members.fetch(g.host),
        players: await Promise.all(g.players.map(p => guild.members.fetch(p))),
    })));

    for (const group of groups) {
        try {
            await _startHotDropGame(group, departureChannel, strikeMode);
        } catch (e: any) {
            await sendErrorToLogChannel(e, client);
        }
    }
}

function _hotDropDepartureNotice(randomCode: string, hostDisplayName: string, vc: VoiceChannel, host: GuildMember, players: GuildMember[]) {
    const departureNoticeLeadTimeMinutes = config.departure_notice_lead_time_minutes;

    return `
-------------------------------------------
# ATTENTION HELLDIVERS

**Hot Drop:** **${randomCode} (${hostDisplayName})**
A Super Earth Destroyer will be mission ready and deploying to the operation grounds imminently.
**Communication Channel:** <#${vc.id}>.
Host and assigned divers, please join ASAP.
The operation starts in **${departureNoticeLeadTimeMinutes} minutes**.

**Host:** ${host.displayName} ||<@${host.id}>||
**Assigned divers:** ${players.map(p => `${p.displayName} ||<@${p.id}>||`).join(', ')}
-------------------------------------------`;
}

function _strikeDepartureNotice(hostDisplayName: string, vc: VoiceChannel, host: GuildMember, players: GuildMember[]) {
    return `
-------------------------------------------
# ATTENTION HELLDIVERS

**You have been assigned to ${hostDisplayName}'s Strike Group**
A Super Earth Destroyer will be mission ready and deploying to the operation grounds imminently.
**Communication Channel:** <#${vc.id}>.
Host and assigned divers, please join ASAP.

**Host:** ${host.displayName} ||<@${host.id}>||
**Assigned divers:** ${players.map(p => `${p.displayName} ||<@${p.id}>||`).join(', ')}
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

export function groupPlayers(hosts: Snowflake[], players: Snowflake[], strikeMode: boolean) {
    const kMaxAssignedPlayers: number = config.max_players - 1;

    const groups: { host: Snowflake, players: Snowflake[] }[] = [];
    hosts.forEach((host) => {
        let assignedPlayers: Snowflake[] = [];
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
            groups.push({ host: host, players: assignedPlayers });
        }
    });
    return groups;
}

async function _startHotDropGame(group: HotDropGroup, departureChannel: TextChannel, strikeMode: boolean) {
    const playerIds = group.players.map(p => p.id);
    const randomCode = `${generateRandomCode()}-${generateRandomCode()}`;

    const vcChannelName = !strikeMode ? `🔊| HOTDROP ${randomCode} ${group.host.displayName}` : `🔊| ${group.host.displayName}'s Strike Group!`;
    const vc = await VoiceChannelManager.get().create(departureChannel.guild, strikeMode, vcChannelName, group.host.id, playerIds);

    if (!strikeMode) {
        const playerEmbed = _buildPlayerSelectedForDeploymentEmbed(randomCode, group.host.displayName, vc.id);
        const hostEmbed = _buildHostSquadReadForDeploymentEmbed(randomCode, playerIds, vc.id);
        await Promise.all(group.players.map(p => sendDmToUser(p.user, { embeds: [playerEmbed] })));
        await sendDmToUser(group.host.user, { embeds: [hostEmbed] });
    }

    debug(`Sending departure message: ${randomCode}; Host: ${group.host.displayName}; Players: ${playerIds.join(', ')};`);
    let messageContent: string = null;
    if (strikeMode) {
        messageContent = _strikeDepartureNotice(group.host.displayName, vc, group.host, group.players);
    } else {
        messageContent = _hotDropDepartureNotice(randomCode, group.host.displayName, vc, group.host, group.players);
    }
    await departureChannel.send({ content: messageContent });

    await Queue.delete({ user: In([group.host.id].concat(group.players.map(p => p.id))) });
    await _logHotDropStarted(departureChannel.client, { hostDisplayName: group.host.displayName, playerMembers: playerIds, vc });
    success(`Created hot drop: ${randomCode}; Host: ${group.host.displayName}; Players: ${playerIds.join(', ')};`, 'Queue');
}