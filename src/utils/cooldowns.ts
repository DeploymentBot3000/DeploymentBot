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
    const now = DateTime.now();
    const lastUsage = _kCooldowns.get(`${userId}-${interactionItemId}`);
    const timeSinceLastUse = lastUsage ? now.diff(lastUsage) : undefined;
    if (timeSinceLastUse && timeSinceLastUse < cooldown) {
        const timeUntilNextUse = cooldown.minus(timeSinceLastUse);
        debug(`Cooldown Active - Last usage was: ${timeSinceLastUse} ago; Next Usage in: ${timeUntilNextUse} ${userId}-${interactionItemId}`);
        return new Error(`Please wait ${Math.ceil(timeUntilNextUse.shiftTo('seconds').seconds)} seconds before using this interaction again!`);
    } else {
        debug(`Cooldown Disabled - Last usage was: ${timeSinceLastUse} ago; ${userId}-${interactionItemId}`);
        _kCooldowns.set(`${userId}-${interactionItemId}`, now);
        return null;
    }
}
