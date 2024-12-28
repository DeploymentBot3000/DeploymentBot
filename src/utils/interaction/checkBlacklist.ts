import { buildErrorEmbed } from "../../embeds/embed.js";
import ReplyableInteraction from "./ReplyableInteraction.js";

export default async function checkBlacklist(interaction: ReplyableInteraction, blacklist: string[]):Promise<boolean> {
    if(!blacklist.length) return false;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const blacklistedRoles = blacklist.filter(roleId => member.roles.cache.has(roleId));
    if(!blacklistedRoles.length) return false; // return false is they are not on the blacklist
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