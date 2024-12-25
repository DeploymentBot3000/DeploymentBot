import Slashcommand from "../classes/Slashcommand.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

export default new Slashcommand({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [],
    callback: async ({ interaction }) => {
        HotDropQueue.getHotDropQueue().toggleStrikeMode();
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${HotDropQueue.getHotDropQueue().strikeModeEnabled ? "enabled" : "disabled"}!`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);