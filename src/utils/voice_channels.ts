import { CategoryChannel, CategoryChildChannel, ChannelType, Client, Collection, Guild, PermissionsBitField, Snowflake } from "discord.js";
import discord_server_config from "../config/discord_server.js";
import { DateTime, Duration } from "luxon";
import config from "../config.js";
import { debug } from "./logger.js";
import { sendErrorToLogChannel } from "./log_channel.js";

export class VoiceChannelManager {
    public static async init(client: Client) {
        if (VoiceChannelManager._instance) {
            throw new Error("VoiceChannelManager is already initialized.");
        }
        VoiceChannelManager._instance = new VoiceChannelManager(client);

        await VoiceChannelManager._instance._clearEmptyVoiceChannels();
        setInterval(VoiceChannelManager._instance._clearEmptyVoiceChannels.bind(VoiceChannelManager._instance), Duration.fromDurationLike({ 'minutes': discord_server_config.clear_vc_channels_every_minutes }).toMillis()).unref();
    }

    public static get(): VoiceChannelManager {
        if (!VoiceChannelManager._instance) {
            throw new Error("VoiceChannelManager has not been initialized.");
        }
        return VoiceChannelManager._instance;
    }

    public async create(guild: Guild, strikeMode: boolean, vcChannelName: string, hostId: Snowflake, selectedPlayers: Snowflake[]) {
        const vcCategory = _findNextAvailableVoiceCategory(guild, strikeMode);
        return await guild.channels.create({
            name: vcChannelName,
            type: ChannelType.GuildVoice,
            parent: vcCategory,
            userLimit: 4,
            permissionOverwrites: [
                {
                    id: this._client.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.CreateInstantInvite]
                },
                {
                    id: hostId,
                    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.CreateInstantInvite]
                },
                ...selectedPlayers.map(id => {
                    return {
                        id: id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream]
                    }
                })
            ]
        });
    }

    private static _instance: VoiceChannelManager;

    private constructor(client: Client) {
        this._client = client;
    }

    private async _clearEmptyVoiceChannels() {
        const clearVcChannelsInterval = Duration.fromDurationLike({ 'minutes': discord_server_config.clear_vc_channels_every_minutes });
        const deleteChannelAfterVacantFor = clearVcChannelsInterval.minus({ 'seconds': 30 });
        debug("Clearing empty voice channels");
        const guild = this._client.guilds.cache.get(config.guildId);
        for (const prefix of [discord_server_config.strike_vc_category_prefix, discord_server_config.hotdrop_vc_category_prefix]) {
            for (const vcCategory of _findAllVcCategories(guild, prefix).values()) {
                for (const channel of vcCategory.children.cache.values()) {
                    await this._removeOldVoiceChannel(this._client, channel, deleteChannelAfterVacantFor);

                }
            }
        }
    }

    private async _removeOldVoiceChannel(client: Client, channel: CategoryChildChannel, deleteChannelAfterVacantFor: Duration) {
        if (channel.type == ChannelType.GuildVoice && channel.members.size == 0) {
            const lastSeenEmpty = this._lastSeenEmptyVcTime.get(channel.id) || DateTime.now();
            this._lastSeenEmptyVcTime.set(channel.id, lastSeenEmpty);
            if (lastSeenEmpty.plus(deleteChannelAfterVacantFor) < DateTime.now()) {
                debug(`Deleting voice channel: ${channel.name} with id: ${channel.id}`);
                await channel.delete().catch(e => sendErrorToLogChannel(e, client));
                this._lastSeenEmptyVcTime.delete(channel.id);
            } else {
                debug(`Voice channel: ${channel.name} with id: ${channel.id} was last seen empty on ${lastSeenEmpty.toISO()}, not old enough to delete`);
            }
        }
    }

    private _client: Client;
    // Map from vc channel id to the last time it was seen empty.
    private _lastSeenEmptyVcTime: Map<Snowflake, DateTime> = new Map();
}

function _findNextAvailableVoiceCategory(guild: Guild, strikeMode: boolean): CategoryChannel {
    const vcCategoryPrefix = strikeMode ? discord_server_config.strike_vc_category_prefix : discord_server_config.hotdrop_vc_category_prefix;
    const maxChannels = strikeMode ? discord_server_config.strike_vc_category_max_channels : discord_server_config.hotdrop_vc_category_max_channels;
    let channels = _findAllVcCategories(guild, vcCategoryPrefix)
        .filter(channel => channel.children.cache.size < maxChannels);
    if (!channels.size) {
        throw new Error(`All VC categories for prefix ${vcCategoryPrefix} are full`);
    }
    return channels.at(0);
}

function _findAllVcCategories(guild: Guild, vcCategoryPrefix: string) {
    let channels = guild.channels.cache.filter(channel =>
        channel.type == ChannelType.GuildCategory) as Collection<Snowflake, CategoryChannel>;
    if (!channels.size) {
        throw new Error("Cannot find any categories in the server for creating voice channels");
    }
    channels = channels.filter(channel => channel.name.toLowerCase().startsWith(vcCategoryPrefix.toLowerCase()));
    if (!channels.size) {
        throw new Error(`Cannot find any categories for prefix ${vcCategoryPrefix} in the server for creating voice channels`);
    }
    return channels;
}
