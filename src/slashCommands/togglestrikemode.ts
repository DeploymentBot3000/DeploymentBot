import { ApplicationCommandOptionType } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import {client} from "../index.js";
import {buildEmbed} from "../utils/configBuilders.js";
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
        updateQueueMessages(false, client.nextGame.getTime(), false).then(() => null);
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Battalion Strike Toggle")
            .setDescription(`Battalion Strike mode ${client.battalionStrikeMode ? "enabled" : "disabled"}!`);
        interaction.reply({embeds: [successEmbed], ephemeral: true}).then(r => null);
    }}
);