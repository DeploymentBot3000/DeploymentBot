import {ApplicationCommandOptionType} from "discord.js";
import Command from "../classes/Command.js";
import ms from "ms";
import { Duration } from "luxon";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../utils/embedBuilders/configBuilders.js";

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
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
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
            const errorEmbed = buildErrorEmbed()
                .setTitle("Invalid time")
                .setDescription(deploymentInterval.message);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await HotDropQueue.getHotDropQueue().setDeploymentTime(deploymentInterval);

        const successEmbed = buildSuccessEmbed()
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${deploymentInterval.toHuman()}`);

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
})
