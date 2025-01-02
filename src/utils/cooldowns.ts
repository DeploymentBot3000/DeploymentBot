import { Snowflake } from "discord.js";
import { DateTime, Duration } from "luxon";
import { debug } from "./logger.js";

/**
 * A map of user IDs and interaction item IDs to the last time the user used the interaction.
 */
const _kCooldowns: Map<string, DateTime> = new Map();

/**
 * @returns An error if the user is on cooldown, otherwise null.
 */
export function checkCooldown(userId: Snowflake, interactionItemId: string, cooldown: Duration): Error {
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
