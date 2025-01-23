import Command from "../classes/Command.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { replyWithSuccess } from "../utils/interaction_replies.js";

export default new Command({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: {
        requiredPermissions: ["Administrator"],
    },
    options: [],
    callback: async ({ interaction }) => {
        const strikeModeEnabled = await HotDropQueue.getHotDropQueue().toggleStrikeMode();
        await replyWithSuccess(interaction, `Strike mode ${strikeModeEnabled ? "enabled" : "disabled"}!`);
    }}
);