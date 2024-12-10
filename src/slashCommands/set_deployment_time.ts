import {ApplicationCommandOptionType} from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import ms from "ms";
import { client, setDeploymentInterval } from "../index.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { Duration } from "luxon";
import { error } from "../utils/logger.js";

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
        const deploymentInterval = Duration.fromMillis(ms(interaction.options.getString("time")));

        if (!deploymentInterval || !deploymentInterval.isValid) {
            if (deploymentInterval) {
                error(deploymentInterval.invalidReason);
            }
            const errorEmbed = buildEmbed({ preset: "error" })
                .setTitle("Invalid time")
                .setDescription("Please provide a valid time");

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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
