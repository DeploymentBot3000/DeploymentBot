import Slashcommand from "../classes/Slashcommand.js";
import { client } from "../custom_client.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

export default new Slashcommand({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [],
    func: ({ interaction }) => {
        client.battalionStrikeMode = !client.battalionStrikeMode;
        updateQueueMessages(true, client.nextGame.getTime(), false);
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${client.battalionStrikeMode ? "enabled" : "disabled"}!`);
        interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);