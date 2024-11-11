import { ApplicationCommandOptionType, GuildTextBasedChannel } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import ms from "ms";
import { client, setDeploymentTime } from "../index.js";
import { buildEmbed } from "../utils/configBuilders.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";

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
        const time = ms(interaction.options.getString("time"));

        if (!time) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setTitle("Invalid time")
                .setDescription("Please provide a valid time");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await setDeploymentTime(time.toString());

        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${time}`);

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        client.nextGame = new Date(Date.now() + time);

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})