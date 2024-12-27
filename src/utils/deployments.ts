import { Client, EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import cron from 'node-cron';
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import LatestInput from "../tables/LatestInput.js";
import { In, LessThanOrEqual } from "typeorm";
import { DateTime, Duration } from "luxon";
import config from "../config.js";
import { formatDiscordTime } from "./time.js";
import { buildDeploymentEmbed } from "./embedBuilders/signupEmbedBuilder.js";

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

        console.log("Database Purge:");
        console.log(`Cleared ${signupsToDelete.length} invalid signups!`);
        console.log(`Cleared ${backupsToDelete.length} invalid backups!`);
        console.log(`Cleared last input data!`);
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
        _sendDepartureMessage(client, deployment);

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
        const role = config.roles.find(role => role.name === signup.role);
        return `${role.emoji} <@${signup.userId}>`;
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
        const channel = await client.channels.fetch(deployment.channel).catch(() => null as null) as GuildTextBasedChannel;
        const message = await channel.messages.fetch(deployment.message).catch(() => null as null);

        if (!message) {
            continue;
        }

        try {
            const embed = await buildDeploymentEmbed(deployment, message.guild, "Red", true);
            await message.edit({ content: "", embeds: [embed], components: [] });

            // Fetch all logging channels and send to each
            const loggingChannel = await client.channels.fetch(config.log_channel_id).catch(() => null as null) as GuildTextBasedChannel;
            const signups = await Signups.find({ where: { deploymentId: deployment.id } });
            const backups = await Backups.find({ where: { deploymentId: deployment.id } });

            const signupsFormatted = signups.map(signup => {
                if (signup.userId == deployment.user) return null;
                const role = config.roles.find(role => role.name === signup.role);
                const member = message.guild.members.cache.get(signup.userId);
                return `${role.emoji} ${member?.nickname || member?.user.username || signup.userId}`;
            }).filter(s => s).join("\n") || "- None -";

            const backupsFormatted = backups.map(backup => {
                const member = message.guild.members.cache.get(backup.userId);
                return `${config.backupEmoji} ${member?.nickname || member?.user.username || backup.userId}`;
            }).join("\n") || "- None -";

            const logEmbed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Deployment Started")
                .addFields(
                    { name: "Title", value: deployment.title, inline: true },
                    { name: "Host", value: message.guild.members.cache.get(deployment.user)?.nickname || deployment.user, inline: true },
                    { name: "Difficulty", value: deployment.difficulty, inline: true },
                    { name: "Time", value: formatDiscordTime(DateTime.fromMillis(deployment.startTime)), inline: false },
                    { name: "Players", value: signupsFormatted, inline: true },
                    { name: "Backups", value: backupsFormatted, inline: true },
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
