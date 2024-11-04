// Role ID for the blacklisted role
export const BLACKLISTED_ROLE_ID = "1303095979507056702";

export default async function checkBlacklist(userId: string, guild: any) {
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(BLACKLISTED_ROLE_ID);
} 