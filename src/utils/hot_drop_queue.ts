import { Client, GuildMember, GuildTextBasedChannel } from "discord.js";
import { DateTime, Duration } from "luxon";
import { EntityManager } from "typeorm";
import { config } from "../config.js";
import { dataSource } from "../data_source.js";
import buildQueuePanelEmbed from "../embeds/queue.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { verbose } from "./logger.js";
import { logQueueAction } from "./queueLogger.js";
import { getDeploymentTimeSetting, setDeploymentTimeSetting } from "./settings.js";
import { startQueuedGameImpl } from "./startQueuedGame.js";

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

        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
    }

    public async toggleStrikeMode(): Promise<boolean> {
        this._strikeModeEnabled = !this._strikeModeEnabled;
        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
        return this._strikeModeEnabled;
    }

    private async _startNewGames() {
        try {
            await startQueuedGameImpl(this._strikeModeEnabled);
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
        this._strikeModeEnabled = false;
        await this._setNextDeployment(this._deploymentInterval);
    }

    public async clear() {
        await Queue.clear();
        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
    }

    public async joinAsHost(userId: string): Promise<Error> {
        const error = await dataSource.transaction(async (entityManager: EntityManager): Promise<Error> => {
            const alreadyQueued = await entityManager.findOne(Queue, { where: { user: userId } });
            const currentHostCount = await entityManager.find(Queue, { where: { isHost: true } });

            if (alreadyQueued?.isHost) {
                return new Error('You are already in the queue');
            } else if (currentHostCount.length >= config.queueMaxes.hosts && !this._strikeModeEnabled) {
                return new Error('The hosts queue is currently full!');
            }

            const joinTime = new Date();

            if (alreadyQueued && !alreadyQueued.isHost) {
                await entityManager.update(Queue, alreadyQueued.id, {
                    isHost: true,
                    joinTime: joinTime
                });
            } else {
                await entityManager.insert(Queue, {
                    user: userId,
                    isHost: true,
                    joinTime: joinTime
                });
            }
            return null;
        });
        if (error instanceof Error) {
            return error;
        }

        await logQueueAction({
            type: 'host',
            userId: userId
        });
        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
        return null;
    }

    public async join(userId: string): Promise<Error> {
        const error = await dataSource.transaction(async (entityManager: EntityManager): Promise<Error> => {
            const alreadyQueued = await entityManager.findOne(Queue, { where: { user: userId } });
            const playersInQueue = await entityManager.find(Queue, { where: { isHost: false } });

            if (alreadyQueued && !alreadyQueued.isHost) {
                return new Error('You are already in the queue');
            } else if (playersInQueue.length >= config.queueMaxes.players && !this._strikeModeEnabled) {
                return new Error('The queue is currently full!');
            }

            const joinTime = new Date();

            if (alreadyQueued?.isHost) {
                await entityManager.update(Queue, alreadyQueued.id, {
                    isHost: false,
                    joinTime: joinTime
                });
            } else {
                await entityManager.insert(Queue, {
                    user: userId,
                    isHost: false,
                    joinTime: joinTime
                });
            }
            return null;
        });
        if (error instanceof Error) {
            return error;
        }

        await logQueueAction({
            type: 'join',
            userId: userId
        });
        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
        return null;
    }

    public async leave(userId: string): Promise<Error> {
        type TransactionResult = { joinTime: Date, leaveTime: Date, beforeCount: number, afterCount: number };
        const transactionResult = await dataSource.transaction(async (entityManager: EntityManager): Promise<TransactionResult | Error> => {
            const alreadyQueued = await entityManager.findOne(Queue, { where: { user: userId } });

            if (!alreadyQueued) {
                return new Error('You are not in the queue');
            }

            const queueBefore = await entityManager.find(Queue);
            await entityManager.delete(Queue, { user: userId });
            const queueAfter = await entityManager.find(Queue);

            return {
                joinTime: alreadyQueued.joinTime,
                leaveTime: new Date(),
                beforeCount: queueBefore.length,
                afterCount: queueAfter.length

            };
        });
        if (transactionResult instanceof Error) {
            return transactionResult;
        }

        await logQueueAction({
            type: 'leave',
            userId: userId,
            joinTime: transactionResult.joinTime,
            leaveTime: transactionResult.leaveTime,
            queueBefore: transactionResult.beforeCount,
            queueAfter: transactionResult.afterCount,
        });
        await _updateHotDropEmbed(this._client, this._nextGame, this._strikeModeEnabled);
        return null;
    }

    public get nextGame() {
        return this._nextGame;
    }

    private _client: Client;
    private _timeout: NodeJS.Timeout;
    private _deploymentInterval: Duration;
    private _strikeModeEnabled: boolean = false;
    private _nextGame: DateTime;
}

async function _updateHotDropEmbed(client: Client, nextDeploymentTime: DateTime, strikeModeEnabled: boolean) {
    verbose("Updating Hot Drop Embed", 'Queue System');

    const queueMessages = await QueueStatusMsg.find();
    if (queueMessages.length == 0) {
        return null;
    }
    const queueMessage = queueMessages[0];
    const channel = await client.channels.fetch(queueMessage.channel) as GuildTextBasedChannel;
    const message = await channel.messages.fetch(queueMessage.message);

    verbose(`Next deployment time: ${nextDeploymentTime.toISO()}`, 'Queue System');

    const currentQueue = await Queue.find();
    const hosts = await Promise.all(currentQueue.filter(q => q.isHost).map(async host => {
        return await channel.guild.members.fetch(host.user)
            .then((member: GuildMember) => member.displayName)
            .catch(() => 'Unknown User');
    }));
    const players = await Promise.all(currentQueue.filter(q => !q.isHost).map(async player => {
        return await channel.guild.members.fetch(player.user)
            .then((member: GuildMember) => member.displayName)
            .catch(() => 'Unknown User');
    }));
    const embed = buildQueuePanelEmbed(nextDeploymentTime.toMillis(), hosts, players, strikeModeEnabled);

    await message.edit({ embeds: [embed] });
    verbose(`Hot Drop Embed updated: ${message.id}`, 'Queue System');
    return message;
}
