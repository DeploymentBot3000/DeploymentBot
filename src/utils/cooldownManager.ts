import { Collection } from "discord.js";

const cooldowns = new Collection<string, number>();

export function handleCooldown(userId: string, commandId: string): { onCooldown: boolean, remainingTime?: number } {
    const key = `${userId}-${commandId}`;
    const now = Date.now();
    const cooldownTime = 5000; // 5 seconds

    if (cooldowns.has(key)) {
        const expirationTime = cooldowns.get(key);
        if (expirationTime && now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return { onCooldown: true, remainingTime: timeLeft };
        }
    }

    cooldowns.set(key, now + cooldownTime);
    return { onCooldown: false };
} 