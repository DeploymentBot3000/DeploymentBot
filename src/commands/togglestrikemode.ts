import Command from "../classes/Command.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Command({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: {
        requiredPermissions: ["Administrator"],
    },
    options: [],
    callback: async ({ interaction }) => {
        const strikeModeEnabled = await HotDropQueue.getHotDropQueue().toggleStrikeMode();
        const successEmbed = buildSuccessEmbed()
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${strikeModeEnabled ? "enabled" : "disabled"}!`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);