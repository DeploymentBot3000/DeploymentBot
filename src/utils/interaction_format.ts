import { Channel, Guild, GuildMember, Interaction, InteractionType, User } from "discord.js";

export function formatInteractionDetailsForLog(interaction: Interaction<'cached'>) {
    let member = formatUserForLog(interaction.user);
    if (interaction.inCachedGuild()) {
        member = formatMemberForLog(interaction.member);
    }
    let message = '';
    if ('message' in interaction && interaction.message) {
        message = interaction.message.id;
    }
    let customId = '';
    if ('customId' in interaction) {
        customId = interaction.customId;
    }
    return `Guild: ${formatGuildForLog(interaction.guild)}; Member: ${member}; Message: ${message}; Type: ${formatInteractionType(interaction.type)}; CustomId: ${customId}; ID: ${interaction.id};`;
}

export function formatInteractionType(type: InteractionType) {
    switch (type) {
        case InteractionType.Ping:
            return 'Ping';
        case InteractionType.ApplicationCommand:
            return 'ApplicationCommand';
        case InteractionType.MessageComponent:
            return 'MessageComponent';
        case InteractionType.ApplicationCommandAutocomplete:
            return 'ApplicationCommandAutocomplete';
        case InteractionType.ModalSubmit:
            return 'ModalSubmit';
        default:
            return 'Unknown';
    }
}

export function formatGuildForLog(guild: Guild) {
    return `${guild.name} (${guild.id})`;
}

export function formatUserForLog(user: User) {
    return `${user.displayName} (${user.globalName}/${user.username}/${user.id})`;
}

export function formatMemberForLog(member: GuildMember) {
    return `${member.displayName} (${member.nickname}/${member.user.username}/${member.id})`;
}

export function formatChannelForLog(channel: Channel) {
    return `${'name' in channel ? channel.name : 'Unknown'} (${channel.id})`;
}
