import { EmbedBuilder, User } from "discord.js";
import { formatUserForLog } from "./interaction_format.js";
import { debug, error } from "./logger.js";

// Some users have their incoming dms disabled which results in an exception.
// Catch and suppress these, it is on them to enable their dms if they want to receive these.
export async function sendDmToUser(user: User, msg: string | { embeds: EmbedBuilder[] }) {
    try {
        debug(`DM: ${formatUserForLog(user)}; Content: ${_formatDmOptionsForLog(msg)}`);
        await user.send(msg);
    } catch (e: any) {
        if ((e as Error).message.includes('Cannot send messages to this user')) {
            error(`Cannot send messages to this user: ${formatUserForLog(user)}`);
            return;
        }
        throw e;
    }
}

function _formatDmOptionsForLog(msg: string | { embeds: EmbedBuilder[] }) {
    if (typeof msg != 'string') {
        msg = `[${msg.embeds.map(e => e.data.title).join(', ')}]`;
    }

    if (msg.length > 100) {
        return msg.substring(0, 97) + "...";
    } else {
        return msg;
    }
}
