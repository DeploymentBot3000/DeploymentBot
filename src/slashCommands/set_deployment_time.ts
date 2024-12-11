import {ApplicationCommandOptionType} from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import ms from "ms";
import { client, setDeploymentInterval } from "../index.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { Duration } from "luxon";

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

export default new Slashcommand({
    name: "set-deployment-time",
    description: "Set the deployment time",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [
        {
            name: "time",
            description: "The time of the deployment",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    func: async function({ interaction }) {
        const deploymentInterval = parseDeploymentTimeString(interaction.options.getString("time"));

        if (deploymentInterval instanceof Error) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setTitle("Invalid time")
                .setDescription(deploymentInterval.message);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await setDeploymentInterval(deploymentInterval);

        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${deploymentInterval.toHuman()}`);

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        client.nextGame = new Date(Date.now() + deploymentInterval.toMillis());

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})
