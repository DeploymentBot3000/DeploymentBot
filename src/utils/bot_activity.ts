import { ActivityType, Client } from "discord.js";
import { Duration } from "luxon";

export function startActivityInterval(client: Client) {
    const statusList = [
        // Hot Drops
        "⏳ Checking hot drops",
        "🚀 Starting hot drops",
        // Voice channels
        "🔊 Creating voice channels",
        "🔇 Deleting empty voice channels",
        // scheduled deployment
        "📅 Starting deployments",
        "🗑️ Deleting old signups",
        // Logging
        "📩 Sending confirmation dms",
        "📝 Logging attendence",
    ];

    function setRandomStatus() {
        const randomStatus = statusList[Math.floor(Math.random() * statusList.length)];
        client.user.setActivity(randomStatus, { type: ActivityType.Custom });
    }

    setRandomStatus();
    setInterval(setRandomStatus, Duration.fromDurationLike({ 'minutes': 10 }).toMillis()).unref();
}

export function setWakingUpActivity(client: Client) {
    client.user.setActivity("Waking Up ...", { type: ActivityType.Custom });
}
