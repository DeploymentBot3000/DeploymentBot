import {buildEmbed} from "../configBuilders.js";
import { PermissionsBitField, PermissionsString} from "discord.js";
import ReplyableInteraction from "./ReplyableInteraction.js";

export default async function hasRequiredPermissions(interaction: ReplyableInteraction, permissions: PermissionsString[]):Promise<boolean> {
    if(permissions.length) return true;
    if (!interaction.inCachedGuild()) {
        const embed = buildEmbed({ preset: "error" })
            .setDescription(":x: **This command can only be used in a server!**");
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const invalidPerms: PermissionsString[] = [];
    const memberPerms: PermissionsBitField = interaction.member!.permissions as PermissionsBitField;
    for (const perm of permissions) {
        if (!memberPerms.has(perm)) invalidPerms.push(perm);
    }
    if (invalidPerms.length) {
        const embed = buildEmbed({ preset: "error" })
            .setTitle("Insufficient Permissions!")
            .setDescription(`You are missing the following permissions:\n${invalidPerms.map(p => `- ${p}`).join("\n")}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    return true; // Return ture they have perms
}