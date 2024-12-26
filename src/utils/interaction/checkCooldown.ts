import { AnySelectMenuInteraction, ButtonInteraction, Snowflake } from "discord.js";
import { DateTime, Duration } from "luxon";
import { buildErrorEmbed } from "../embedBuilders/configBuilders.js";
import { debug } from "../logger.js";

/**
 * Check if the user is on cooldown for the interaction and reply with an error if they are.
 * @returns true if the user is on cooldown, otherwise false.
 */
export async function userIsOnCooldownWithReply(interaction: AnySelectMenuInteraction | ButtonInteraction, interactionItemId: string, cooldown: Duration): Promise<boolean> {
    const error = checkCooldown(interaction.user.id, interactionItemId, cooldown);
    if (error instanceof Error) {
        await interaction.reply({
            embeds: [buildErrorEmbed()
                .setDescription(error.toString())], ephemeral: true
        });
        return true;
    }
    return false;
}

/**
 * A map of user IDs and interaction item IDs to the last time the user used the interaction.
 */
const _kCooldowns: Map<string, DateTime> = new Map();

/**
 * @returns An error if the user is on cooldown, otherwise null.
 */
function checkCooldown(userId: Snowflake, interactionItemId: string, cooldown: Duration) {
    const lastUsage = _kCooldowns.get(`${userId}-${interactionItemId}`);
    debug(`Cooldown Last usage: ${lastUsage}; ${userId}-${interactionItemId}`);
    const now = DateTime.now();
    if (lastUsage) {
        const timeUntilNextUseDuration = lastUsage.plus(cooldown).diff(now);
        if (timeUntilNextUseDuration > Duration.fromMillis(0)) {
            return new Error(`Please wait ${Math.ceil(timeUntilNextUseDuration.shiftTo('seconds').seconds)} seconds before using this interaction again!`);
        }
    }
    _kCooldowns.set(`${userId}-${interactionItemId}`, now);
    return null;
}
