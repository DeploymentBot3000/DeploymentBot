import { MessageCreateOptions, MessagePayload, User } from "discord.js";
import { error } from "./logger.js";

// Some users have their incoming dms disabled which results in an exception.
// Catch and suppress these, it is on them to enable their dms if they want to receive these.
export async function sendDmToUser(user: User, options: string | MessagePayload | MessageCreateOptions) {
    try {
        await user.send(options);
    } catch (e) {
        error(e);
    }
}
