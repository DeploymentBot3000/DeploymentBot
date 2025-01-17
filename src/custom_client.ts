import { Client, GatewayIntentBits } from "discord.js";

// Initialize the client
export const client = new Client({
    // Invite link, this defines the permissions the bot has and what it can do.
    // https://discord.com/developers/applications/1312896264475508839/oauth2
    // Move Members
    //   - To set permissions on new voice channels to allow the host to kick out non squad members.
    // Create Instant Invite
    //   - To allow the host to invite others to the voice channel.
    // https://discord.com/oauth2/authorize?client_id=1312896264475508839&permissions=16777217&integration_type=0&scope=bot
    // The bot then must be given the `Manage Channels` permission on the hot drops and strikes VC categories.

    // Intents: Intents are event subscriptions that send information from the discord server to the bot.
    // These are often needed to populate the discord client cache, even if not subscribing to events explicitly.
    // They do not give permissions to do any operations.
    // https://discord.com/developers/docs/events/gateway#list-of-intents
    intents: [
        // Required to receive responses to vc channel creation and to find vc categories in the channel cache.
        GatewayIntentBits.Guilds,

        // Required for the bot to know how many members are in a voice channel.
        GatewayIntentBits.GuildVoiceStates,

        // Privileged Gateway Intents
        // Privileged Gateway Intents must also be enabled in the discord app bot config:
        // https://discord.com/developers/applications/1312896264475508839/bot
        // No Privileged Gateway Intents are required.
    ],
});
