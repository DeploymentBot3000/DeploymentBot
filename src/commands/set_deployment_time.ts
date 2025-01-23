import { ApplicationCommandOptionType } from "discord.js";
import { Duration } from "luxon";
import ms from "ms";
import Command from "../classes/Command.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { replyWithError, replyWithSuccess } from "../utils/interaction_replies.js";

function parseDeploymentTimeString(input: string) {
    const milis = ms(input);
    if (milis == undefined) {
        return new Error(`Invalid input: ${input}; reason: Failed to parse duration`);
    }
    const duration = Duration.fromMillis(milis);
    if (!duration.isValid) {
        return new Error(`Invalid input: ${input}; reason: ${duration.invalidReason}`)
    }
    const minDuration = Duration.fromDurationLike({ 'seconds': 10 });
    if (duration < minDuration) {
        return new Error(`Invalid input: ${input}; reason: duration must be >= ${minDuration.toHuman()}`)
    }
    return duration;
}

export default new Command({
    name: "set-deployment-time",
    description: "Set the deployment time",
    permissions: {
        requiredPermissions: ["Administrator"]
    },
    options: [
        {
            name: "time",
            description: "The time of the deployment",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    callback: async function ({ interaction }) {
        const deploymentInterval = parseDeploymentTimeString(interaction.options.getString("time"));

        if (deploymentInterval instanceof Error) {
            await replyWithError(interaction, `Invalid time: ${deploymentInterval.message}`);
            return;
        }

        await HotDropQueue.getHotDropQueue().setDeploymentTime(deploymentInterval);

        await replyWithSuccess(interaction, `The deployment time has been set to ${deploymentInterval.toHuman()}`);
    }
})
