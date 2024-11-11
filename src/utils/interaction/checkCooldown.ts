import {client} from "../../index.js";
import {buildEmbed} from "../configBuilders.js";
import Cooldown from "../../classes/Cooldown.js";
import ReplyableInteraction from "./ReplyableInteraction.js";

export default async function checkCooldowns(interaction: ReplyableInteraction, existingCooldown: Cooldown):Promise<boolean> {
    if(!existingCooldown) return;
    if (existingCooldown && !existingCooldown.isExpired()) {
        const cooldownEmbed = buildEmbed({preset: "error"})
            .setDescription("Please wait before using this interaction again!");
        await interaction.reply({embeds: [cooldownEmbed], ephemeral: true});
        return true; // true if on cooldown
    } else return; // false if not
}