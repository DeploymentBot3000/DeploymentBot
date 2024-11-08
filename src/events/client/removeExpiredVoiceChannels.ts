import config from "../../config.js";
import VoiceChannel from "../../tables/VoiceChannel.js";
import {LessThanOrEqual} from "typeorm";
import {DateTime} from "luxon";
import {VoiceState} from "discord.js";

// Dynamically delete pickdrop VCs as soon as everyone leaves
export default {
    name: "voiceStateUpdate",
    once: false,
    function: async (oldState: VoiceState, newState: VoiceState):Promise<null> => {
        const channel = oldState.channel || newState.channel;
        if(!(channel.parent.id == config.vcCategory)) return;

        const vc = await VoiceChannel.findOne({
            where: {
                channel: channel.id,
                expires: LessThanOrEqual(DateTime.now().toMillis())
            }
        });

        if (!vc) return;

        if(channel && !channel.members.size) {
            await channel.delete().catch((err) => console.log(err));
            await vc.remove().catch((err) => console.log(err));
            console.log(`Expired & empty channel ${channel.id} deleted`);
        }
    }
}