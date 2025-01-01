import {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    CommandInteraction,
    MentionableSelectMenuInteraction,
    ModalSubmitInteraction,
    PermissionsBitField, PermissionsString,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
} from 'discord.js';
import { requiredRolesType } from "../classes/Command.js";
import { buildErrorEmbed } from "../embeds/embed.js";

export async function hasRequiredPermissions(interaction: _ReplyableInteraction, permissions: PermissionsString[]): Promise<boolean> {
    if (!permissions.length) return true;
    if (!interaction.inCachedGuild()) {
        const embed = buildErrorEmbed()
            .setDescription(":x: **This command can only be used in a server!**");
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return false;
    }

    const invalidPerms: PermissionsString[] = [];
    const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
    for (const perm of permissions) {
        if (!memberPerms.has(perm)) invalidPerms.push(perm);
    }
    if (invalidPerms.length) {
        const embed = buildErrorEmbed()
            .setTitle("Insufficient Permissions!")
            .setDescription(`You are missing the following permissions:\n${invalidPerms.map(p => `- ${p}`).join("\n")}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return false;
    }
    return true; // Return ture they have perms
}

export async function hasRequiredRoles(interaction: _ReplyableInteraction, requiredRoles: requiredRolesType): Promise<boolean> {
    if (!requiredRoles.length) return true;
    if (!interaction.inCachedGuild()) {
        const embed = buildErrorEmbed()
            .setDescription(":x: **This command can only be used in a server!**");

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return false;
    }

    for (const role of requiredRoles) {
        const roleObj = interaction.guild!.roles.cache.find(r => r.id === role.role || r.name === role.role) || await interaction.guild!.roles.fetch(role.role).catch(() => { }) || null;
        if (!roleObj) {
            const embed = buildErrorEmbed()
                .setTitle("Invalid Role!")
                .setDescription(`:x: **The role \`${role.role}\` does not exist!**`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }
        if (role.required && !interaction.member.roles.cache.has(roleObj.id)) {
            const embed = buildErrorEmbed()
                .setTitle("Missing Server Role!")
                .setDescription(`:x: **You don't have the required role ${roleObj.name}!**`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }
        if (!role.required && interaction.member.roles.highest.comparePositionTo(roleObj) < 0) {
            const embed = buildErrorEmbed()
                .setTitle("Missing Server Role!")
                .setDescription(`:x: **You don't have the required role ${roleObj.name}!**`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }
    }
    return true;
}

export async function checkBlacklist(interaction: _ReplyableInteraction, blacklist: string[]): Promise<boolean> {
    if (!blacklist.length) return false;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const blacklistedRoles = blacklist.filter(roleId => member.roles.cache.has(roleId));
    if (!blacklistedRoles.length) return false; // return false is they are not on the blacklist
    const blacklistedRolesNames = await Promise.all(blacklistedRoles.map(async (roleId) => {
        const role = await interaction.guild.roles.fetch(roleId);
        return role ? role.name : null;
    }));
    const description = `${blacklistedRolesNames.length >= 3 ? `${blacklistedRolesNames.slice(0, -1).join("'s , ")}'s, & ${blacklistedRolesNames[blacklistedRolesNames.length - 1]}` : `${blacklistedRolesNames.join("'s & ")}'s`} are not permitted to to use this interaction.`;
    const errorEmbed = buildErrorEmbed()
        .setTitle("Blacklisted Role!")
        .setDescription(description);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return true; // Return true if they are on the blacklist
}

type _ReplyableInteraction =
    | CommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | UserSelectMenuInteraction
    | RoleSelectMenuInteraction
    | ChannelSelectMenuInteraction
    | MentionableSelectMenuInteraction
    | ModalSubmitInteraction;
