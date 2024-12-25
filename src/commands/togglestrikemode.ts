import Command from "../classes/Command.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Command({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    options: [],
    callback: async ({ interaction }) => {
        HotDropQueue.getHotDropQueue().toggleStrikeMode();
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${HotDropQueue.getHotDropQueue().strikeModeEnabled ? "enabled" : "disabled"}!`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);