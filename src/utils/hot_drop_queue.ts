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
            await this.updateMessage(/*notEnoughPlayers=*/!this._deploymentCreated, /*deploymentCreated=*/this._deploymentCreated);
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
    }

    public async toggleStrikeMode() {
        this._strikeModeEnabled = !this._strikeModeEnabled;
        this.updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);
    }

    public async updateMessage(notEnoughPlayers: boolean, deploymentCreated: boolean) {
        return _updateHotDropEmbed(this._client, notEnoughPlayers, this._nextGame, deploymentCreated);
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
        await this.updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);
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
