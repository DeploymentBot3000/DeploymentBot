import { VoiceBasedChannel, VoiceState } from "discord.js";
import discord_server_config from "../config/discord_server.js";

function isBotManagedVoiceChannel(channel: VoiceBasedChannel): boolean {
    const catName = channel.parent.name;
    return catName.toLowerCase().startsWith(discord_server_config.hotdrop_vc_category_prefix.toLowerCase())
        || catName.toLowerCase().startsWith(discord_server_config.strike_vc_category_prefix.toLowerCase());
}

// Dynamically delete pickdrop VCs as soon as everyone leaves
export default {
    name: "voiceStateUpdate",
    callback: async (oldState: VoiceState, newState: VoiceState) => {
        const channel = oldState.channel || newState.channel;
        if (channel && isBotManagedVoiceChannel(channel) && channel.members.size == 0) {
            await channel.delete().catch((err) => console.log(err));
            console.log(`Expired & empty channel ${channel.id} deleted`);
        }
    }
}
