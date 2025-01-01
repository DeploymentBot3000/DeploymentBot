import {
    GuildMember,
    PermissionResolvable,
    Role,
    Snowflake
} from 'discord.js';

export interface PermissionsConfig {
    deniedRoles?: Snowflake[];
    requireRoles?: Snowflake[];
    requiredPermissions?: PermissionResolvable[];
}

export async function checkPermissions(member: GuildMember, permissions: PermissionsConfig): Promise<Error> {
    const deniedRoles = permissions.deniedRoles ? Promise.all(permissions.deniedRoles.map(roleId => member.guild.roles.fetch(roleId))) : Promise.resolve([]);
    const requireRoles = permissions.requireRoles ? Promise.all(permissions.requireRoles.map(roleId => member.guild.roles.fetch(roleId))) : Promise.resolve([]);
    return _inDenyList(member, await deniedRoles) ?? _hasRequiredRoles(member, await requireRoles) ?? _hasRequiredPermissions(member, permissions.requiredPermissions ?? []);
}

function _hasRequiredPermissions(member: GuildMember, permissions: PermissionResolvable[]): Error {
    const missingPermissions = permissions.filter(perm => !member.permissions.has(perm)).join(", ");
    if (missingPermissions) {
        return new Error(`Required permissions: ${missingPermissions}`);
    }
    return null;
}

function _hasRequiredRoles(member: GuildMember, roles: Role[]): Error {
    const missingRoles = roles.filter(role => role.members.hasAny(member.id)).map(role => role.name).join(", ");
    if (missingRoles) {
        return new Error(`Missing roles: ${missingRoles}`);
    }
    return null;
}

function _inDenyList(member: GuildMember, roles: Role[]): Error {
    const deniedRoles = roles.filter(role => role.members.hasAny(member.id)).map(role => role.name).join(", ");
    if (deniedRoles) {
        return new Error(`Denied roles: ${deniedRoles}`);
    }
    return null;
}
