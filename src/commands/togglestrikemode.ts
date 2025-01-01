import { PermissionFlagsBits } from "discord.js";
import Command from "../classes/Command.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Command({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: {
        requiredPermissions: [PermissionFlagsBits.Administrator],
    },
    options: [],
    callback: async ({ interaction }) => {
        HotDropQueue.getHotDropQueue().toggleStrikeMode();
        const successEmbed = buildSuccessEmbed()
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${HotDropQueue.getHotDropQueue().strikeModeEnabled ? "enabled" : "disabled"}!`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);