import { GuildMessageManager, Message, MessageEditOptions, MessagePayload, Snowflake } from "discord.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { error } from "./logger.js";

export async function fetchMessage(messages: GuildMessageManager, id: Snowflake): Promise<Message<true> | undefined> {
    return messages.fetch(id).catch((e: any): Message<true> | undefined => {
        if (e instanceof Error && e.message.includes('Unknown Message')) {
            error(`Failed to fetch message: ${id} from channel: ${messages.channel.name} (${messages.channel.id})`);
            return undefined;
        }
        throw e;
    });
}

export async function deleteMessage(message: Message<true>) {
    await message.delete().catch(async (e: any) => {
        if (e instanceof Error && e.message.includes('Unknown Message')) {
            error(`Failed to delete message: ${message.id} from channel: ${message.channel.name} (${message.channel.id})`);
        } else {
            await sendErrorToLogChannel(e, message.client);
        }
    });
}

export async function editMessage(message: Message<true>, content: string | MessageEditOptions | MessagePayload) {
    await message.edit(content).catch(async (e: any) => {
        if (e instanceof Error && e.message.includes('Unknown Message')) {
            error(`Failed to edit message: ${message.id} from channel: ${message.channel.name} (${message.channel.id})`);
        } else {
            await sendErrorToLogChannel(e, message.client);
        }
    });
}
