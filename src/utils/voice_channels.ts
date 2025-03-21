import { CategoryChannel, CategoryChildChannel, ChannelType, Client, Collection, Guild, PermissionsBitField, Snowflake, User, VoiceChannel } from "discord.js";
import { DateTime, Duration } from "luxon";
import { config } from "../config.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { debug } from "./logger.js";
import { checkDiscordPerms } from "./permissions.js";

export class VoiceChannelManager {
    public static async init(client: Client) {
        if (VoiceChannelManager._instance) {
            throw new Error("VoiceChannelManager is already initialized.");
        }
        VoiceChannelManager._instance = new VoiceChannelManager(client);

        await VoiceChannelManager._instance._clearEmptyVoiceChannels();
        setInterval(VoiceChannelManager._instance._clearEmptyVoiceChannels.bind(VoiceChannelManager._instance), Duration.fromDurationLike({ 'minutes': config.discord_server.clear_vc_channels_every_minutes }).toMillis()).unref();
    }

    public static get(): VoiceChannelManager {
        if (!VoiceChannelManager._instance) {
            throw new Error("VoiceChannelManager has not been initialized.");
        }
        return VoiceChannelManager._instance;
    }

    public async create(guild: Guild, strikeMode: boolean, vcChannelName: string, hostId: Snowflake, _selectedPlayers: Snowflake[]) {
        const vcCategory = _findNextAvailableVoiceCategory(guild, strikeMode);
        _checkVcPermissions(vcCategory, guild.client.user);
        const verifiedPerms = [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.UseVAD, PermissionsBitField.Flags.Stream];
        const hostPerms = verifiedPerms.concat([PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.CreateInstantInvite]);
        const channel = await guild.channels.create({
            name: vcChannelName,
            type: ChannelType.GuildVoice,
            parent: vcCategory,
            userLimit: 4,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: config.discord_server.roles.verified_role_id,
                    allow: verifiedPerms,
                },
                {
                    id: this._client.user.id,
                    allow: hostPerms.concat([PermissionsBitField.Flags.ManageChannels]),
                },
                {
                    id: hostId,
                    allow: hostPerms,
                },
            ]
        });
        debug(`Created voice channel: ${channel.name} with id: ${channel.id} in ${vcCategory.name}`, 'VoiceChannelManager');
        return channel;
    }

    private static _instance: VoiceChannelManager;

    private constructor(client: Client) {
        this._client = client;
    }

    private async _clearEmptyVoiceChannels() {
        try {
            const clearVcChannelsInterval = Duration.fromDurationLike({ 'minutes': config.discord_server.clear_vc_channels_every_minutes });
            const deleteChannelAfterVacantFor = clearVcChannelsInterval.minus({ 'seconds': 30 });
            debug("Clearing empty voice channels", 'VoiceChannelManager');
            const guild = this._client.guilds.cache.get(config.guildId);
            for (const prefix of [config.discord_server.strike_vc_category_prefix, config.discord_server.hotdrop_vc_category_prefix]) {
                for (const vcCategory of _findAllVcCategories(guild, prefix).values()) {
                    for (const channel of vcCategory.children.cache.values()) {
                        await this._removeOldVoiceChannel(this._client, channel, deleteChannelAfterVacantFor);

                    }
                }
            }
        } catch (e: any) {
            sendErrorToLogChannel(e, this._client);
        }
    }

    private async _removeOldVoiceChannel(client: Client, channel: CategoryChildChannel, deleteChannelAfterVacantFor: Duration) {
        if (channel.isVoiceBased() && channel.type == ChannelType.GuildVoice && channel.members.size == 0) {
            const lastSeenEmpty = this._lastSeenEmptyVcTime.get(channel.id) || DateTime.now();
            this._lastSeenEmptyVcTime.set(channel.id, lastSeenEmpty);
            if (lastSeenEmpty.plus(deleteChannelAfterVacantFor) < DateTime.now()) {
                debug(`Deleting voice channel: ${channel.name} with id: ${channel.id}`, 'VoiceChannelManager');
                _checkVcPermissions(channel, client.user);
                await channel.delete().catch(e => sendErrorToLogChannel(e, client));
                this._lastSeenEmptyVcTime.delete(channel.id);
            } else {
                debug(`Voice channel: ${channel.name} with id: ${channel.id} was last seen empty on ${lastSeenEmpty.toISO()}, not old enough to delete`, 'VoiceChannelManager');
            }
        } else {
            debug(`Voice channel: ${channel.name} with id: ${channel.id} has ${channel.members.size} members`, 'VoiceChannelManager');
        }
    }

    private _client: Client;
    // Map from vc channel id to the last time it was seen empty.
    private _lastSeenEmptyVcTime: Map<Snowflake, DateTime> = new Map();
}

function _findNextAvailableVoiceCategory(guild: Guild, strikeMode: boolean): CategoryChannel {
    const vcCategoryPrefix = strikeMode ? config.discord_server.strike_vc_category_prefix : config.discord_server.hotdrop_vc_category_prefix;
    const maxChannels = strikeMode ? config.discord_server.strike_vc_category_max_channels : config.discord_server.hotdrop_vc_category_max_channels;
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

function _checkVcPermissions(vcCategory: CategoryChannel | VoiceChannel, user: User) {
    checkDiscordPerms(vcCategory, user, new PermissionsBitField(
        // verified perms
        PermissionsBitField.Flags.ViewChannel
        | PermissionsBitField.Flags.Connect
        | PermissionsBitField.Flags.Speak
        | PermissionsBitField.Flags.UseVAD
        | PermissionsBitField.Flags.Stream
        // host perms
        | PermissionsBitField.Flags.MoveMembers
        | PermissionsBitField.Flags.CreateInstantInvite
        // bot perms
        | PermissionsBitField.Flags.ManageChannels
    ));
}
