import { CategoryChannel, ChannelType, Collection, Guild, Snowflake } from "discord.js";

export function findAllVcCategories(guild: Guild, vcCategoryPrefix: string) {
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
