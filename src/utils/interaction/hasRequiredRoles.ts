import {buildEmbed} from "../embedBuilders/configBuilders.js";
import {requiredRolesType} from "../../classes/Slashcommand.js";
import ReplyableInteraction from "./ReplyableInteraction.js";

export default async function hasRequiredRoles(interaction:ReplyableInteraction, requiredRoles: requiredRolesType):Promise<boolean> {
    if (!requiredRoles.length) return true;
    if (!interaction.inCachedGuild()) {
        const embed = buildEmbed({preset: "error"})
            .setDescription(":x: **This command can only be used in a server!**");

        await interaction.reply({embeds: [embed], ephemeral: true});
        return false;
    }

    for (const role of requiredRoles) {
        const roleObj = interaction.guild!.roles.cache.find(r => r.id === role.role || r.name === role.role) || await interaction.guild!.roles.fetch(role.role).catch(() => null);
        if (!roleObj) {
            const embed = buildEmbed({preset: "error"})
                .setTitle("Invalid Role!")
                .setDescription(`:x: **The role \`${role.role}\` does not exist!**`);
            await interaction.reply({embeds: [embed], ephemeral: true});
            return false;
        }
        if ( role.required && !interaction.member.roles.cache.has(roleObj.id)) {
            const embed = buildEmbed({preset: "error"})
                .setTitle("Missing Server Role!")
                .setDescription(`:x: **You don't have the required role ${roleObj.name}!**`);
            await interaction.reply({embeds: [embed], ephemeral: true});
            return false;
        }
        if (!role.required && interaction.member.roles.highest.comparePositionTo(roleObj) < 0) {
            const embed = buildEmbed({preset: "error"})
                .setTitle("Missing Server Role!")
                .setDescription(`:x: **You don't have the required role ${roleObj.name}!**`);
            await interaction.reply({embeds: [embed], ephemeral: true});
            return false;
        }
    }
    return true;
}