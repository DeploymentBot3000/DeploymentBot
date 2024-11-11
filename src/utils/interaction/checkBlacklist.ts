import {buildEmbed} from "../configBuilders.js";
import ReplyableInteraction from "./ReplyableInteraction.js";

export default async function checkBlacklist(interaction: ReplyableInteraction, blacklist: string[]):Promise<boolean> {
    if(!blacklist.length) return false;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const br = blacklist.filter(roleId => member.roles.cache.has(roleId));
    if(br.length) return false; // return false is they are not on the blacklist
    const description = `${br.length >= 3 ? `${br.slice(0, -1).join(', ')}, & ${br[br.length - 1]}` : `${br.join(" & ")}`} are not permitted to to use this interaction `;
    const errorEmbed = buildEmbed({ preset: "error" })
        .setTitle("Blacklisted Role!")
        .setDescription(description);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return true; // Return true if they are on the blacklist
} 