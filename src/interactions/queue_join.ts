import { Duration } from "luxon";
import { Button } from "../buttons/button.js";
import { config } from "../config.js";
import { sendDmToUser } from "../utils/dm.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { formatMemberForLog } from "../utils/interaction_format.js";
import { deferUpdate, followUpWithError } from "../utils/interaction_replies.js";
import { success } from "../utils/logger.js";

export const QueueJoinButton = new Button({
    id: "join",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        if (!await deferUpdate(interaction)) { return; }

        const error = await HotDropQueue.getHotDropQueue().join(interaction.user.id);
        if (error instanceof Error) {
            await followUpWithError(interaction, error.message);
            return;
        }

        if (!HotDropQueue.getHotDropQueue().isStrikeModeEnabled()) {
            await sendDmToUser(interaction.user, 'You joined the Hot Drop Queue');
        }

        success(`User: ${formatMemberForLog(interaction.member)} joined the hot drop queue as a participant`, 'Queue');
    }
});
