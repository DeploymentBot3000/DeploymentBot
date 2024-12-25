import { DateTime, Duration } from "luxon";
import { startQueuedGameImpl } from "./startQueuedGame.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { Client, GuildTextBasedChannel } from "discord.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import buildQueueEmbed from "./embedBuilders/buildQueueEmbed.js";
import { log } from "./logger.js";
import { getDeploymentTimeSetting, setDeploymentTimeSetting } from "./settings.js";
import config from "../config.js";
import Queue from "../tables/Queue.js";
import { logQueueAction } from "./queueLogger.js";

async function _updateHotDropEmbed(client: Client, notEnoughPlayers: boolean, nextDeploymentTime: DateTime, deploymentCreated: boolean) {
    log("Updating Hot Drop Embed", 'Queue System');

    const queueMessages = await QueueStatusMsg.find();
    if (queueMessages.length == 0) {
        return null;
    }
    const queueMessage = queueMessages[0];
    const channel = await client.channels.fetch(queueMessage.channel) as GuildTextBasedChannel;
    const message = await channel.messages.fetch(queueMessage.message);

    log(`Next deployment time: ${nextDeploymentTime.toISO()}`, 'Queue System');

    const embed = await buildQueueEmbed(notEnoughPlayers, nextDeploymentTime.toMillis(), deploymentCreated, channel);

    await message.edit({ embeds: [embed] });
    log(`Hot Drop Embed updated: ${message.id}`, 'Queue System');
    return message;
}


export class HotDropQueue {
    public static async initHotDropQueue(client: Client) {
        if (HotDropQueue._kHotDropQueue != null) {
            throw new Error('Hot Drop Queue already initialized');
        }
        HotDropQueue._kHotDropQueue = new HotDropQueue(client);
        await HotDropQueue._kHotDropQueue._setNextDeployment(await getDeploymentTimeSetting(config.guildId));
    }
    private static _kHotDropQueue: HotDropQueue = null;

    public static getHotDropQueue() {
        if (HotDropQueue._kHotDropQueue == null) {
            throw new Error('Hot Drop Queue already initialized');
        }
        return HotDropQueue._kHotDropQueue;
    }

    private constructor(client: Client) {
        this._client = client;
    }

    // Set the next hot drop or strike to start duration into the future.
    // For hot drops, this becomes the new duration between hot drops.
    public async setDeploymentTime(deploymentInterval: Duration) {
        await setDeploymentTimeSetting(config.guildId, deploymentInterval);
        await this._setNextDeployment(deploymentInterval);
    }

    private async _setNextDeployment(deploymentInterval: Duration) {
        this._deploymentInterval = deploymentInterval;
        this._nextGame = DateTime.now().plus(this._deploymentInterval);

        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this._startNewGames();
        }, this._deploymentInterval.toMillis()).unref();

        try {
            await this.updateMessage();
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
    }

    public async toggleStrikeMode() {
        this._strikeModeEnabled = !this._strikeModeEnabled;
        await this.updateMessage();
    }

    private async updateMessage() {
        return _updateHotDropEmbed(this._client, !this._deploymentCreated, this._nextGame, this._deploymentCreated);
    }

    private async _startNewGames() {
        try {
            this._deploymentCreated = await startQueuedGameImpl(this.strikeModeEnabled);
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
        this._strikeModeEnabled = false;
        await this._setNextDeployment(this._deploymentInterval);
    }

    public async clear() {
        await Queue.clear();
        await this.updateMessage();
    }

    public async joinAsHost(userId: string): Promise<Error> {
        const alreadyQueued = await Queue.findOne({ where: { user: userId } });
        const currentHostCount = await Queue.find({ where: { isHost: true } });

        if (alreadyQueued?.isHost) {
            return new Error('You are already in the queue');
        } else if (currentHostCount.length >= config.queueMaxes.hosts && !this._strikeModeEnabled) {
            return new Error('The hosts queue is currently full!');
        }

        const joinTime = new Date();

        if (alreadyQueued && !alreadyQueued.isHost) {
            await Queue.update(alreadyQueued.id, {
                isHost: true,
                joinTime: joinTime
            });
        } else {
            await Queue.insert({
                user: userId,
                isHost: true,
                joinTime: joinTime
            });
        }

        await logQueueAction({
            type: 'host',
            userId: userId
        });

        await this.updateMessage();
        return null;
    }

    public async join(userId: string): Promise<Error> {
        const alreadyQueued = await Queue.findOne({ where: { user: userId } });
        const playersInQueue = await Queue.find({ where: { isHost: false } });

        if (alreadyQueued && !alreadyQueued.isHost) {
            return new Error('You are already in the queue');
        } else if (playersInQueue.length >= config.queueMaxes.players && !this._strikeModeEnabled) {
            return new Error('The queue is currently full!');
        }

        const joinTime = new Date();

        await logQueueAction({
            type: 'join',
            userId: userId
        });

        if (alreadyQueued?.isHost) {
            await Queue.update(alreadyQueued.id, {
                isHost: false,
                joinTime: joinTime
            });
        } else {
            await Queue.insert({
                user: userId,
                isHost: false,
                joinTime: joinTime
            });
        }

        await this.updateMessage();
        return null;
    }

    public async leave(userId: string): Promise<Error> {
        const alreadyQueued = await Queue.findOne({ where: { user: userId } });

        if (!alreadyQueued) {
            return new Error('You are not in the queue');
        }

        const queueBefore = await Queue.find();
        const beforeCount = queueBefore.length;

        const leaveTime = new Date();

        await Queue.delete({ user: userId });

        const queueAfter = await Queue.find();
        const afterCount = queueAfter.length;

        await logQueueAction({
            type: 'leave',
            userId: userId,
            joinTime: alreadyQueued.joinTime,
            leaveTime: leaveTime,
            queueBefore: beforeCount,
            queueAfter: afterCount,
        });

        await this.updateMessage();
        return null;
    }

    public get strikeModeEnabled() {
        return this._strikeModeEnabled;
    }
    public get nextGame() {
        return this._nextGame;
    }

    private _client: Client;
    private _timeout: NodeJS.Timeout;
    private _deploymentInterval: Duration;
    private _strikeModeEnabled: boolean = false;
    private _nextGame: DateTime;
    private _deploymentCreated: boolean = false;
}
