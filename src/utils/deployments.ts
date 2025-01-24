import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Colors, EmbedBuilder, Guild, GuildMember, GuildTextBasedChannel, Message, PermissionFlagsBits, Snowflake, StringSelectMenuBuilder, TextChannel, User } from "discord.js";
import { DateTime, Duration } from "luxon";
import cron from 'node-cron';
import { EntityManager, In, LessThanOrEqual } from "typeorm";
import { buildButton } from "../buttons/button.js";
import { config } from "../config.js";
import { dataSource } from "../data_source.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import LatestInput from "../tables/LatestInput.js";
import Signups from "../tables/Signups.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { verbose } from "./logger.js";
import { formatDiscordTime } from "./time.js";

export enum DeploymentRole {
    UNSPECIFIED = 'UNSPECIFIED',
    FIRETEAM = 'Fireteam',
    BACKUP = 'Backup',
}

export function formatRoleEmoji(role: DeploymentRole) {
    if (role == DeploymentRole.BACKUP) {
        return config.backupEmoji;
    }
    const roleConfig = config.roles.find(r => r.name == role);
    if (roleConfig && roleConfig.emoji && roleConfig.emoji.length) {
        return roleConfig.emoji;
    }
    return '❓';
}

export function parseRole(role: string): DeploymentRole {
    // Fix for backwards compatability with deprecated offense role
    if (role.toLowerCase() == 'offense') {
        return DeploymentRole.FIRETEAM;
    }

    for (const roleName of Object.values(DeploymentRole)) {
        if (roleName.toLowerCase() == role.toLowerCase()) {
            return roleName;
        }
    }
    return DeploymentRole.UNSPECIFIED;
}

export interface DeploymentMember {
    guildMember: GuildMember,
    role: DeploymentRole,
}

export interface DeploymentDetails {
    id: number,
    title: string,
    difficulty: string,
    description: string,
    channel: TextChannel,
    message: Message<true>,
    startTime: DateTime,
    endTime: DateTime,
    host: DeploymentMember,
    signups: DeploymentMember[],
    backups: DeploymentMember[],
}

export class DeploymentManager {
    public static async init(client: Client) {
        if (DeploymentManager._instance) {
            throw new Error("DeploymentManager is already initialized.");
        }
        DeploymentManager._instance = new DeploymentManager(client);

        // On startup and then every minute on the minute.
        await DeploymentManager._instance._checkDeployments();
        cron.schedule('* * * * *', DeploymentManager._instance._checkDeployments.bind(DeploymentManager._instance));

        // On startup and then at the top of every hour.
        await DeploymentManager._instance._removeOldSignups();
        cron.schedule("0 * * * *", DeploymentManager._instance._removeOldSignups.bind(DeploymentManager._instance));

        // On startup and then at midnight every day.
        await DeploymentManager._instance._deleteOldDeploymentsFromDatabase();
        cron.schedule("0 0 * * *", DeploymentManager._instance._deleteOldDeploymentsFromDatabase.bind(DeploymentManager._instance));
    }

    public static get(): DeploymentManager {
        if (!DeploymentManager._instance) {
            throw new Error("DeploymentManager has not been initialized.");
        }
        return DeploymentManager._instance;
    }

    private static _instance: DeploymentManager;

    private constructor(client: Client) {
        this._client = client;
    }

    private async _checkDeployments() {
        const now = DateTime.now();
        await _sendDeploymentNotices(this._client, now);
        await _startDeployments(this._client, now);
        await _deleteOldDeployments(this._client, now);
    }

    private async _removeOldSignups() {
        const deletedDeployments: Deployment[] = await Deployment.find({ where: { deleted: true } });
        for (const deployment of deletedDeployments) {
            await Signups.delete({ deploymentId: deployment.id });
            await Backups.delete({ deploymentId: deployment.id });
            await Deployment.delete({ id: deployment.id });
            console.log(`Deleted deployment: ${deployment.id} & associated signups & backups`);
        }
    }

    private async _deleteOldDeploymentsFromDatabase() {
        const deployments = await Deployment.find();
        const signups = await Signups.find();
        const backups = await Backups.find();
        const deploymentsIDs = deployments.map(deployment => deployment.id);
        const signupsToDelete = signups.filter(s => !deploymentsIDs.includes(s.deploymentId)).map(s => s.id);
        const backupsToDelete = backups.filter(b => !deploymentsIDs.includes(b.deploymentId)).map(b => b.id);
        await Signups.delete({ id: In(signupsToDelete) });
        await Backups.delete({ id: In(backupsToDelete) });
        await LatestInput.clear();

        verbose("Performing database cleanup...");
        verbose(`Cleared ${signupsToDelete.length} invalid signups!`);
        verbose(`Cleared ${backupsToDelete.length} invalid backups!`);
        verbose(`Cleared last input data!`);
        verbose("Database cleanup complete!");
    }

    public async create(details: DeploymentDetails): Promise<DeploymentDetails> {
        try {
            await dataSource.transaction(async (entityManager: EntityManager) => {
                const deployment = entityManager.create(Deployment, {
                    channel: details.channel.id,
                    message: "",
                    user: details.host.guildMember.user.id,
                    title: details.title,
                    difficulty: details.difficulty,
                    description: details.description,
                    startTime: details.startTime.toMillis(),
                    endTime: details.endTime.toMillis(),
                    started: false,
                    deleted: false,
                    edited: false,
                    noticeSent: false,
                });
                await entityManager.save(deployment);

                const signup = entityManager.create(Signups, {
                    deploymentId: deployment.id,
                    userId: details.host.guildMember.user.id,
                    role: details.host.role,
                });
                await entityManager.save(signup);

                details = await deploymentToDetails(this._client, deployment, [signup], /*backups=*/[]);

                // Send the message as part of the transaction so we can save the message id to the deployment.
                // If the transaction fails, the message is deleted in the catch block below.
                details.message = await _sendDeploymentSignupMessage(details);
                deployment.message = details.message.id;

                await entityManager.save(deployment);
            });
        } catch (e: any) {
            console.log(e);
            if (details.message) {
                await sendErrorToLogChannel(new Error('Deleting signup message for partially created deployment'), this._client);
                await details.message.delete().catch((e: any) => sendErrorToLogChannel(e, this._client));
            }
            throw e;
        }
        return details;
    }

    public async update(deploymentId: number, details: DeploymentDetails): Promise<{ newDetails: DeploymentDetails, oldDetails: DeploymentDetails }> {
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, { where: { id: deploymentId } });
            if (!deployment) {
                throw new Error('Failed to find deployment');
            }
            const signups = entityManager.find(Signups, { where: { deploymentId: deployment.id } });
            const backups = entityManager.find(Backups, { where: { deploymentId: deployment.id } });
            const oldDetails = await deploymentToDetails(this._client, deployment, await signups, await backups);
            const newDetails: DeploymentDetails = { ...oldDetails };

            if (details.title) {
                deployment.title = details.title;
                newDetails.title = details.title;
            }
            if (details.difficulty) {
                deployment.difficulty = details.difficulty;
                newDetails.difficulty = details.difficulty;
            }
            if (details.description) {
                deployment.description = details.description;
                newDetails.description = details.description;
            }
            if (details.startTime) {
                if (!details.endTime) {
                    throw new Error(`Missing end time on deployment: ${deployment}; details: ${details}`);
                }
                deployment.startTime = details.startTime.toMillis();
                deployment.endTime = details.endTime.toMillis();
                newDetails.startTime = details.startTime;
                newDetails.endTime = details.endTime;
            }
            await entityManager.save(deployment);
            return {
                oldDetails: oldDetails,
                newDetails: newDetails,
            };
        });
    }

    public async remove(member: GuildMember, targetUser: User, deploymentTitle: string): Promise<DeploymentDetails | Error> {
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, {
                where: {
                    title: deploymentTitle,
                    deleted: false,
                    started: false
                }
            });
            if (!deployment) {
                return new Error(`Can't find deployment with title: ${deploymentTitle}; Or the deployment is deleted/started`);
            }

            // Check if user is admin or deployment host
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            const isHost = deployment.user === member.id;

            if (!isAdmin && !isHost) {
                return new Error('Only host or admin can remove players');
            }

            // Prevent removing self
            if (targetUser.id === member.id) {
                return new Error('You cannot remove yourself from the deployment');
            }

            // Find and remove user from signups or backups
            let signups = await entityManager.find(Signups, { where: { deploymentId: deployment.id } });
            let backups = await entityManager.find(Backups, { where: { deploymentId: deployment.id } });

            const signup = _spliceItem(signups, s => s.userId == targetUser.id);
            if (signup) {
                await entityManager.remove(signup);
            } else {
                const backup = _spliceItem(backups, b => b.userId == targetUser.id);
                if (backup) {
                    await entityManager.remove(backup);
                } else {
                    return new Error('User is not signed up for this deployment');
                }
            }
            return await deploymentToDetails(this._client, deployment, signups, backups);
        });
    }

    public async leave(memberId: Snowflake, messageId: Snowflake): Promise<DeploymentDetails | Error> {
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, { where: { message: messageId } });
            if (!deployment) {
                return new Error(`Can't find deployment for message: ${messageId}`);
            } else if (deployment.started) {
                return new Error(`Can't leave deployment after it already started`);
            } else if (deployment.user == memberId) {
                return new Error('You cannot leave your own deployment!');
            }

            const signups = await entityManager.find(Signups, { where: { deploymentId: deployment.id } });
            const backups = await entityManager.find(Backups, { where: { deploymentId: deployment.id } });

            const signup = _spliceItem(signups, s => s.userId == memberId);
            if (signup) {
                await entityManager.remove(signup);
            } else {
                const backup = _spliceItem(backups, b => b.userId == memberId);
                if (backup) {
                    await entityManager.remove(backup);
                } else {
                    return new Error('You are not signed up for this deployment');
                }
            }
            return await deploymentToDetails(this._client, deployment, signups, backups);
        });
    }

    private _client: Client;
}

async function _sendDeploymentNotices(client: Client, now: DateTime) {
    const deploymentsNoNotice = await Deployment.find({
        where: {
            deleted: false,
            noticeSent: false,
            startTime: LessThanOrEqual(now.plus({ 'minutes': config.departure_notice_lead_time_minutes }).toMillis())
        }
    });

    for (const deployment of deploymentsNoNotice) {
        await _sendDepartureMessage(client, deployment);
    }
}

async function _sendDepartureMessage(client: Client, deployment: Deployment) {
    const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null as null) as GuildTextBasedChannel;
    const signups = await Signups.find({ where: { deploymentId: deployment.id } });
    const backups = await Backups.find({ where: { deploymentId: deployment.id } });

    await departureChannel.send({ content: _departureMessage(deployment, signups, backups), });

    deployment.noticeSent = true;
    await deployment.save();
}

function _departureMessage(deployment: Deployment, signups: Signups[], backups: Backups[]) {
    const signupsFormatted = signups.filter(s => s.userId != deployment.user).map(signup => {
        return `${formatRoleEmoji(parseRole(signup.role))} <@${signup.userId}>`;
    }).join(",") || "` - `";

    const backupsFormatted = backups.map(backup => `${config.backupEmoji} <@${backup.userId}>`).join(",") || "` - `";

    const departureNoticeLeadTimeMinutes = config.departure_notice_lead_time_minutes;

    return `
-------------------------------------------
# ATTENTION HELLDIVERS

**Operation: ${deployment.title}**
A Super Earth Destroyer will be mission ready and deploying to the operation grounds imminently.
Host, please open a communication channels in the next **5 minutes**.
Assigned divers, please join ASAP.
Backup divers, please to be ready to join if needed.
If you are late or can't make it, inform the deployment host ASAP.
The operation starts in **${departureNoticeLeadTimeMinutes} minutes**.

**Difficulty:** **${deployment.difficulty}**

**Host:** <@${deployment.user}>
**Assigned divers:** ${signupsFormatted}
**Standby divers:** ${backupsFormatted}
-------------------------------------------`
}

async function _startDeployments(client: Client, now: DateTime) {
    const unstartedDeployments = await Deployment.find({
        where: {
            deleted: false,
            started: false,
            startTime: LessThanOrEqual(now.toMillis()),
        }
    });

    for (const deployment of unstartedDeployments) {
        try {
            const signups = Signups.find({ where: { deploymentId: deployment.id } });
            const backups = Backups.find({ where: { deploymentId: deployment.id } });
            const details = await deploymentToDetails(client, deployment, await signups, await backups);
            if (!details.message) {
                continue;
            }

            const embed = buildDeploymentEmbed(details, Colors.Red, /*started=*/true);
            await details.message.edit({ content: "", embeds: [embed], components: [] });

            // Fetch all logging channels and send to each
            const loggingChannel = await client.channels.fetch(config.log_channel_id).catch(() => null as null) as GuildTextBasedChannel;

            const logEmbed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Deployment Started")
                .addFields(
                    { name: "Title", value: deployment.title, inline: true },
                    { name: "Host", value: formatHost(details.host), inline: true },
                    { name: "Difficulty", value: deployment.difficulty, inline: true },
                    { name: "Time", value: formatDiscordTime(DateTime.fromMillis(Number(deployment.startTime))), inline: false },
                    { name: "Players", value: formatSignups(details.signups, details.host), inline: true },
                    { name: "Backups", value: formatBackups(details.backups), inline: true },
                    { name: "Description", value: deployment.description || "No description provided" }
                )
                .setTimestamp();

            await loggingChannel.send({ embeds: [logEmbed] });
        } catch (err) {
            console.error(`Error building deployment embed for deployment ${deployment.id}:`, err);
        }

        deployment.started = true;
        await deployment.save();
    }
}

async function _deleteOldDeployments(client: Client, now: DateTime) {
    const deploymentDeleteLeadTime = Duration.fromDurationLike({ 'minutes': config.deployment_delete_time_minutes });
    const deploymentsToDelete = await Deployment.find({
        where: {
            deleted: false,
            endTime: LessThanOrEqual((now.minus(deploymentDeleteLeadTime)).toMillis())
        }
    });

    for (const deployment of deploymentsToDelete) {
        const channel = await client.channels.fetch(deployment.channel).catch(() => null as null) as GuildTextBasedChannel;
        const message = await channel?.messages.fetch(deployment.message).catch(() => null as null);

        if (message) {
            await message.delete().catch(() => { });
        }
        deployment.deleted = true;
        await deployment.save();
    }
}

async function _sendDeploymentSignupMessage(deployment: DeploymentDetails) {
    const embed = buildDeploymentEmbed(deployment, Colors.Green, /*started=*/false);
    const rows = _buildDeploymentSignupRows();

    return await deployment.channel.send({ content: `<@${deployment.host.guildMember.id}> is looking for people to group up! ⬇️. <@&${config.discord_server.roles.lfg_role_id}>`, embeds: [embed], components: rows });
}

function _buildDeploymentSignupRows() {
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setPlaceholder("Select a role to sign up...").setCustomId("signup").addOptions(
                ...config.roles.map(role => ({
                    label: role.name,
                    value: role.name,
                    emoji: role.emoji || undefined,
                })),
                {
                    label: DeploymentRole.BACKUP,
                    value: DeploymentRole.BACKUP,
                    emoji: config.backupEmoji
                }
            )),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            buildButton("editDeployment"),
            buildButton("deleteDeployment"),
            new ButtonBuilder()
                .setCustomId("leaveDeployment")
                .setLabel("Leave")
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

async function _getDeploymentMember(guild: Guild, signup: Signups | Backups): Promise<DeploymentMember> {
    let role: DeploymentRole = DeploymentRole.UNSPECIFIED;
    if (signup instanceof Backups) {
        role = DeploymentRole.BACKUP;
    } else if ((signup instanceof Signups) && Object.values(DeploymentRole).includes(signup.role as DeploymentRole)) {
        role = signup.role as DeploymentRole;
    }
    return {
        guildMember: await guild.members.fetch(signup.userId),
        role: role,
    };
}

function _getDeploymentHost(guild: Guild, hostId: Snowflake, signups: Signups[]) {
    for (const signup of signups) {
        if (signup.userId == hostId) {
            return _getDeploymentMember(guild, signup);
        }
    }
    throw new Error(`Can't find host in signup list`);
}

export async function deploymentToDetails(client: Client, deployment: Deployment, signups: Signups[], backups: Backups[]): Promise<DeploymentDetails> {
    const channel = await client.channels.fetch(deployment.channel);
    if (!(channel instanceof TextChannel)) {
        throw new Error(`Invalid channel type: ${channel}`);
    }

    return {
        id: deployment.id,
        title: deployment.title,
        difficulty: deployment.difficulty,
        description: deployment.description,
        channel: channel,
        message: await channel.messages.fetch(deployment.message),
        startTime: DateTime.fromMillis(Number(deployment.startTime)),
        endTime: DateTime.fromMillis(Number(deployment.endTime)),
        host: await _getDeploymentHost(channel.guild, deployment.user, signups),
        signups: await Promise.all(signups.map(s => _getDeploymentMember(channel.guild, s))),
        backups: await Promise.all(backups.map(b => _getDeploymentMember(channel.guild, b))),
    }
}

function formatSignups(signups: DeploymentMember[], host: DeploymentMember) {
    return signups
        .filter(s => s.guildMember.user.id != host.guildMember.user.id)
        .map(s => `${formatRoleEmoji(s.role)} <@${s.guildMember.user.id}>`)
        .join("\n")
        || "- None -";
}

function formatBackups(backups: DeploymentMember[]) {
    return backups
        .map(b => `${formatRoleEmoji(b.role)} <@${b.guildMember.user.id}>`)
        .join("\n")
        || "- None -";
}

function formatHost(host: DeploymentMember) {
    return `<@${host.guildMember.user.id}>`;
}

function _spliceItem<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
    const index = array.findIndex(predicate);
    if (index !== -1) {
        return array.splice(index, 1)[0];
    }
    return undefined;
}
