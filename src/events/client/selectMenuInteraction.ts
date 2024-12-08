import colors from "colors";
import {error, log} from "../../utils/logger.js";
import {client} from "../../index.js";
import {Interaction, PermissionsBitField} from "discord.js";
import {buildEmbed} from "../../utils/embedBuilders/configBuilders.js";
import Cooldown from "../../classes/Cooldown.js";
import checkBlacklist from "../../utils/interaction/checkBlacklist.js";
import hasRequiredRoles from "../../utils/interaction/hasRequiredRoles.js";
import hasRequiredPermissions from "../../utils/interaction/hasRequiredPermissions.js";
import checkCooldowns from "../../utils/interaction/checkCooldown.js";

export default {
    name: "interactionCreate",
    function: async function (interaction: Interaction) {
        if (!interaction.isAnySelectMenu()) return;

        const selectMenu = client.selectMenus.get(interaction.customId) || client.selectMenus.get(interaction.customId.split("-")[0]);
        if (!selectMenu) return;

        if(await checkBlacklist(interaction, selectMenu.blacklistedRoles)) return;
        if(!(await hasRequiredRoles(interaction, selectMenu.requiredRoles))) return;
        if(!(await hasRequiredPermissions(interaction, selectMenu.permissions))) return;
        if(await checkCooldowns(interaction, client.cooldowns.get(`${interaction.user.id}-${selectMenu.id}`))) return;

        try {
            log(`[Select Menu Clicked] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
            selectMenu.function({ interaction });
        } catch (e) {
            error(`[Select Menu Error] ${interaction.customId} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
            error(e);

            const embed = buildEmbed({ preset: "error" })
                .setDescription(":x: **An error occurred while executing this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (selectMenu.cooldown) {
            if (!interaction.inCachedGuild() || !interaction.member!.permissions.has(PermissionsBitField.Flags.Administrator)) {
                client.cooldowns.set(`${interaction.user.id}-${selectMenu.id}`, new Cooldown(`${interaction.user.id}-${selectMenu.id}`, selectMenu.cooldown));
            }
        }
    },
};