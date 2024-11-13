import { ChannelType, GuildTextBasedChannel, User, GuildMember, PermissionFlagsBits, TextChannel } from "discord.js";
import { client, getDeploymentTime } from "../index.js";
import Queue from "../tables/Queue.js";
import config from "../config.js";
import VoiceChannel from "../tables/VoiceChannel.js";
import updateQueueMessages from "./updateQueueMessage.js";
import {logQueueDeployment} from "./queueLogger.js";

// Add this function to generate a random 4-digit number
function generateRandomCode() {
    return Math.floor(1000 + Math.random() * 9000);
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

    if (hosts.length < 1 || players.length < 3) {
        await updateQueueMessages(true, nextDeploymentTime);
        return;
    }

    const groups = [];
    hosts.forEach((host) => {
        const assignedPlayers = [];
        if(client.battalionStrikeMode) {
            for (let i = 0; i < 3; i++)
                if (players.length > 0) {
                    const randomIndex = Math.floor(Math.random() * players.length);
                    assignedPlayers.push(players.splice(randomIndex, 1)[0]);
                }
        } else assignedPlayers.push(...players.splice(0, 3));

        if (assignedPlayers.length === 3) groups.push({
            host: host,
            players: assignedPlayers
        });
    })

    let deploymentCreated = false;

    for (const group of groups) {
        console.log('\x1b[36m%s\x1b[0m', 'Checking group:', {
            hostId: group.host.user,
            playerCount: group.players.length,
            players: group.players.map(p => p.user)
        });

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
            name: `🔊| HOTDROP ${randomCode} ${hostDisplayName}`,
            type: ChannelType.GuildVoice,
            parent: config.vcCategory,
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

        await departureChannel.send({ content: `-------------------------------------------\n\n# <:Helldivers:1226464844534779984> ATTENTION HELLDIVERS <:Helldivers:1226464844534779984>\n\n\n**HOTDROP:** **${randomCode} (${hostDisplayName})**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**.\n**Communication Channel:** <#${vc.id}>.\n\n**Deployment Lead:**\n<@${host.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\nYou are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------` }).catch(() => null);

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
        console.log('\x1b[33m%s\x1b[0m', `Queue messages updated for next deployment at ${new Date(nextDeploymentTime).toLocaleTimeString()}`);

        // Fetch all player members to get their nicknames
        const playerMembers = await Promise.all(selectedPlayers.map(p => departureChannel.guild.members.fetch(p.user).catch(() => null)));

        // Log to all logging channels
        await logQueueDeployment({
            hostDisplayName,
            playerMembers,
            vc
        });
        console.log('\x1b[35m%s\x1b[0m', `Successfully created deployment for ${hostDisplayName}`);
    }
};

