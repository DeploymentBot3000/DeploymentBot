import { MessageCreateOptions, MessagePayload, User } from "discord.js";
import { formatUserForLog } from "./interaction_format.js";
import { error } from "./logger.js";

// Some users have their incoming dms disabled which results in an exception.
// Catch and suppress these, it is on them to enable their dms if they want to receive these.
export async function sendDmToUser(user: User, options: string | MessagePayload | MessageCreateOptions) {
    try {
        await user.send(options);
    } catch (e: any) {
        if ((e as Error).message.includes('Cannot send messages to this user')) {
            error(`Cannot send messages to this user: ${formatUserForLog(user)}`);
            return;
        }
        throw e;
    }
}
