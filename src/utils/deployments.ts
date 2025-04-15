import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Guild, GuildMember, Message, PermissionFlagsBits, Snowflake, StringSelectMenuBuilder, TextChannel, User } from "discord.js";
import { DateTime, Duration } from "luxon";
import cron from 'node-cron';
import { EntityManager, FindManyOptions, In, LessThanOrEqual, Not } from "typeorm";
import { buildButton } from "../buttons/button.js";
import { config } from "../config.js";
import { dataSource } from "../data_source.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import LatestInput from "../tables/LatestInput.js";
import Signups from "../tables/Signups.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { debug, success, verbose, warn } from "./logger.js";
import { deleteMessage, editMessage, fetchMessage } from "./message.js";
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
    // message is optional becuase the message might be deleted from discord
    // manually and we will fail to fetch it.
    message?: Message<true>,
    startTime: DateTime,
    endTime: DateTime,
    started: boolean,
    noticeSent: boolean,
    host: DeploymentMember,
    signups: DeploymentMember[],
    backups: DeploymentMember[],
}

export function formatDeployment(deployment: DeploymentDetails) {
    return `${deployment.id}; Title: ${deployment.title}; Message: ${deployment.message?.id};`
        + ` Host: ${deployment.host.guildMember.id}; startTime: ${deployment.startTime.toISO()};`
        + ` Signups: ${deployment.signups.map(v => v.guildMember.id).join(',')};`
        + ` Backups: ${deployment.backups.map(v => v.guildMember.id).join(',')}`;
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
        await DeploymentManager._instance._removeDeletedDeployments();
        cron.schedule("0 * * * *", DeploymentManager._instance._removeDeletedDeployments.bind(DeploymentManager._instance));

        // On startup and then at midnight every day.
        await DeploymentManager._instance._removeInvalidSignups();
        cron.schedule("0 0 * * *", DeploymentManager._instance._removeInvalidSignups.bind(DeploymentManager._instance));
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

    private async _removeDeletedDeployments() {
        debug('Removing deleted deployments...', 'DeploymentManager');
        await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployments = await entityManager.find(Deployment, { where: { deleted: true } });
            const ids = deployments.map(d => d.id);
            const deploymentsDelete = entityManager.delete(Deployment, { id: In(ids) });
            const signups = entityManager.delete(Signups, { deploymentId: In(ids) });
            const backups = entityManager.delete(Backups, { deploymentId: In(ids) });
            verbose(`Removed ${(await deploymentsDelete).affected} deleted deployments;  ${(await signups).affected} signups; ${(await backups).affected} backups`, 'DeploymentManager');
        });
    }

    private async _removeInvalidSignups() {
        debug("Removing old signups...", 'DeploymentManager');
        const deleteSignups = dataSource.transaction(async (entityManager: EntityManager) => {
            const ids = (await entityManager.find(Deployment)).map(d => d.id);
            const signups = entityManager.delete(Signups, { deploymentId: Not(In(ids)) });
            const backups = entityManager.delete(Backups, { deploymentId: Not(In(ids)) });
            verbose(`Cleared ${(await signups).affected} invalid signups and ${(await backups).affected} backups`, 'DeploymentManager');
        });
        debug("Clearing last input...", 'DeploymentManager');
        await LatestInput.clear();
        verbose("Cleared last input data", 'DeploymentManager');

        await deleteSignups;
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
                await deleteMessage(details.message);
            }
            throw e;
        }
        return details;
    }

    public async update(memberId: Snowflake, deploymentId: number, details: DeploymentDetails): Promise<{ newDetails: DeploymentDetails, oldDetails: DeploymentDetails } | Error> {
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, { where: { id: deploymentId } });
            const error = checkCanEditDeployment(deployment, memberId);
            if (error instanceof Error) {
                return error;
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
            return { newDetails, oldDetails, };
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

    public async delete(memberId: Snowflake, messageId: string, isAdmin: boolean): Promise<DeploymentDetails | Error> {
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, { where: { message: messageId } });
            if (!deployment) {
                return new Error("Deployment not found");
            }
            if (!(isAdmin || deployment.user == memberId)) {
                return new Error("You do not have permission to delete this deployment");
            }
            const signups = entityManager.find(Signups, { where: { deploymentId: deployment.id } });
            const backups = entityManager.find(Backups, { where: { deploymentId: deployment.id } });
            const oldDetails = await deploymentToDetails(this._client, deployment, await signups, await backups);

            await entityManager.remove(deployment);
            return oldDetails;
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

    public async signup(memberId: Snowflake, messageId: Snowflake, role: DeploymentRole): Promise<DeploymentDetails | Error> {
        if (role == DeploymentRole.UNSPECIFIED) {
            throw new Error('DeploymentRole.UNSPECIFIED in signup');
        }
        return await dataSource.transaction(async (entityManager: EntityManager) => {
            const deployment = await entityManager.findOne(Deployment, { where: { message: messageId } });
            if (!deployment) {
                return new Error(`Can't find deployment for message: ${messageId}`);
            } else if (deployment.noticeSent) {
                return new Error(`Can't signup to deployment after the departure notice is sent`);
            } else if (deployment.started) {
                return new Error(`Can't signup to deployment after it already started`);
            } else if (deployment.user == memberId && role == DeploymentRole.BACKUP) {
                return new Error('You cannot sign up as backup to your own deployment!');
            }

            const signups = await entityManager.find(Signups, { where: { deploymentId: deployment.id } });
            const backups = await entityManager.find(Backups, { where: { deploymentId: deployment.id } });

            if (role == DeploymentRole.BACKUP && backups.length >= config.max_players) {
                return new Error('Backup slots are full!');
            } else if (role != DeploymentRole.BACKUP && signups.length >= config.max_players) {
                return new Error('Fireteam slots are full!');
            }

            const previous = await _spliceSignup(signups, backups, memberId);

            if (previous) {
                if ((previous instanceof Backups && role == DeploymentRole.BACKUP) || (previous instanceof Signups && previous.role == role)) {
                    return new Error(`You are already signed up as ${role}`);
                }
                await entityManager.remove(previous);
            }
            if (role == DeploymentRole.BACKUP) {
                backups.push(await entityManager.save(entityManager.create(Backups, {
                    deploymentId: deployment.id,
                    userId: memberId,
                })));
            } else {
                signups.push(await entityManager.save(entityManager.create(Signups, {
                    deploymentId: deployment.id,
                    userId: memberId,
                    role: role,
                })));
            }

            return await deploymentToDetails(this._client, deployment, signups, backups);
        });
    }

    private _client: Client;
}

async function _sendDeploymentNotices(client: Client, now: DateTime) {
    const departureChannel = await client.channels.fetch(config.departureChannel);
    if (!(departureChannel instanceof TextChannel)) {
        throw new Error(`Invalid departure channel: ${config.departureChannel}`);
    }

    const deployments = await _findDeployments(client, {
        where: {
            deleted: false,
            noticeSent: false,
            startTime: LessThanOrEqual(now.plus({ 'minutes': config.departure_notice_lead_time_minutes }).toMillis())
        }
    });

    for (const deployment of deployments) {
        try {
            await _sendDepartureMessage(departureChannel, deployment);

            deployment.noticeSent = true;
            const embed = buildDeploymentEmbed(deployment);
            await editMessage(deployment.message, { embeds: [embed] });

            const d = await Deployment.findOne({ where: { id: deployment.id } });
            d.noticeSent = true;
            await d.save();
        } catch (e: any) {
            await sendErrorToLogChannel(e, client);
        }
    }
}

async function _sendDepartureMessage(channel: TextChannel, deployment: DeploymentDetails) {
    debug(`Sending departure message for Deployment: ${formatDeployment(deployment)}`);
    await channel.send({ content: _departureMessage(deployment), });
    success(`Sent departure message for Deployment: ${formatDeployment(deployment)}`);
}

function _departureMessage(deployment: DeploymentDetails) {
    const signupsFormatted = deployment.signups
        .filter(s => s.guildMember.id != deployment.host.guildMember.id)
        .map(s => `${formatRoleEmoji(s.role)} ${s.guildMember.displayName} ||<@${s.guildMember.id}>||`)
        .join(", ") || "` - `";

    const backupsFormatted = deployment.backups
        .map(b => `${config.backupEmoji} ${b.guildMember.displayName} ||<@${b.guildMember.id}>||`)
        .join(", ") || "` - `";

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

**Host:** ${deployment.host.guildMember.displayName} ||<@${deployment.host.guildMember.id}>||
**Assigned divers:** ${signupsFormatted}
**Standby divers:** ${backupsFormatted}
-------------------------------------------`
}

async function _startDeployments(client: Client, now: DateTime) {
    const loggingChannel = await client.channels.fetch(config.log_channel_id);
    if (!(loggingChannel instanceof TextChannel)) {
        throw new Error(`Invalid log channel type: ${config.log_channel_id}`);
    }

    const deployments = await _findDeployments(client, {
        where: {
            deleted: false,
            started: false,
            startTime: LessThanOrEqual(now.toMillis()),
        }
    });

    for (const deployment of deployments) {
        if (!deployment.message) {
            warn(`Skipping start for missing message; Deployment: ${formatDeployment(deployment)}`, 'Deployment');
            continue;
        }
        try {
            deployment.started = true;
            const embed = buildDeploymentEmbed(deployment);
            await editMessage(deployment.message, { content: "", embeds: [embed], components: [] });

            const logEmbed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Deployment Started")
                .addFields(
                    { name: "Title", value: deployment.title, inline: true },
                    { name: "Host", value: formatHost(deployment.host), inline: true },
                    { name: "Difficulty", value: deployment.difficulty, inline: true },
                    { name: "Time", value: formatDiscordTime(DateTime.fromMillis(Number(deployment.startTime))), inline: false },
                    { name: "Players", value: formatSignups(deployment.signups, deployment.host), inline: true },
                    { name: "Backups", value: formatBackups(deployment.backups), inline: true },
                    { name: "Description", value: deployment.description || "No description provided" }
                )
                .setTimestamp();

            await loggingChannel.send({ embeds: [logEmbed] });

            const d = await Deployment.findOne({ where: { id: deployment.id } });
            d.started = true;
            await d.save();

            success(`Started Deployment: ${formatDeployment(deployment)}`, 'Deployment');
        } catch (e: any) {
            await sendErrorToLogChannel(e, client);
        }
    }
}

async function _deleteOldDeployments(client: Client, now: DateTime) {
    const deploymentDeleteLeadTime = Duration.fromDurationLike({ 'minutes': config.deployment_delete_time_minutes });
    const deployments = await _findDeployments(client, {
        where: {
            deleted: false,
            endTime: LessThanOrEqual((now.minus(deploymentDeleteLeadTime)).toMillis())
        }
    });

    for (const deployment of deployments) {
        if (deployment.message) {
            await deleteMessage(deployment.message);
        }
        const d = await Deployment.findOne({ where: { id: deployment.id } });
        d.deleted = true;
        await d.save();
        success(`Deleted Deployment: ${formatDeployment(deployment)}`, 'Deployment');
    }
}

async function _sendDeploymentSignupMessage(deployment: DeploymentDetails) {
    const embed = buildDeploymentEmbed(deployment);
    const rows = _buildDeploymentSignupRows();

    debug(`Sending signup message: ${deployment.id}; Host: ${deployment.host.guildMember.id}; signups: ${deployment.signups.map(s => s.guildMember.id).join(',')}; backups: ${deployment.backups.map(b => b.guildMember.id).join(',')};`);
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
    const message = fetchMessage(channel.messages, deployment.message);
    const host = _getDeploymentHost(channel.guild, deployment.user, signups);
    const signupsMembers = Promise.all(signups.map(s => _getDeploymentMember(channel.guild, s)));
    const backupMembers = Promise.all(backups.map(b => _getDeploymentMember(channel.guild, b)));

    return {
        id: deployment.id,
        title: deployment.title,
        difficulty: deployment.difficulty,
        description: deployment.description,
        channel: channel,
        message: await message,
        startTime: DateTime.fromMillis(Number(deployment.startTime)),
        endTime: DateTime.fromMillis(Number(deployment.endTime)),
        started: deployment.started,
        noticeSent: deployment.noticeSent,
        host: await host,
        signups: await signupsMembers,
        backups: await backupMembers,
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

async function _spliceSignup(signups: Signups[], backups: Backups[], userId: Snowflake) {
    return _spliceItem(signups, s => s.userId == userId) ?? _spliceItem(backups, b => b.userId == userId);
}

async function _findDeployments(client: Client, options: FindManyOptions<Deployment>) {
    const { deployments, signups, backups } = await dataSource.transaction('READ COMMITTED', async (entityManager: EntityManager) => {
        const deployments = await entityManager.find(Deployment, options);
        const deploymentIds = deployments.map(d => d.id);
        const signups = entityManager.find(Signups, { where: { deploymentId: In(deploymentIds) } });
        const backups = entityManager.find(Backups, { where: { deploymentId: In(deploymentIds) } });
        return { deployments, signups: await signups, backups: await backups };
    });
    const details = await Promise.all(deployments.map(async d => {
        try {
            return await deploymentToDetails(client, d, signups.filter(s => s.deploymentId == d.id), backups.filter(s => s.deploymentId == d.id));
        } catch (e: any) {
            await sendErrorToLogChannel(e, client);
            return null;
        }
    }));
    return details.filter(d => d != null);
}


export function checkCanEditDeployment(deployment: Deployment, memberId: Snowflake): Error {
    if (!deployment) {
        return new Error("Deployment not found");
    }
    if (deployment.user !== memberId) {
        return new Error("You do not have permission to edit this deployment");
    }
    if (deployment.noticeSent) {
        return new Error("You can't edit a deployment after the notice has been sent!");
    }
    const deploymentStartTime = DateTime.fromMillis(Number(deployment.startTime));
    if (DateTime.now() >= deploymentStartTime) {
        return new Error("You can't edit a deployment that has already started!");
    }
    return null;
}
