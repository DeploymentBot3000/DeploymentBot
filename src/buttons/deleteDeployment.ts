import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import { DateTime } from "luxon";
import { sendErrorToLogChannel } from "../utils/log_channel.js";
import { User } from "discord.js";

function buildDeploymentDeletedConfirmationEmbed(user: User, deploymentTitle: string, deploymentTime: DateTime) {
    const timeToDeployment = DateTime.fromMillis(Number(deploymentTime)).diff(DateTime.now(), 'minutes').shiftTo('days', 'hours', 'minutes');

    return buildEmbed({ preset: "info" })
        .setColor('#FFA500')  // Orange
        .setTitle("Deployment Deleted!")
        .setDescription(`A deployment you were signed up for has been deleted!\nDeployment Name: ${deploymentTitle}\n Scheduled to start in: ${timeToDeployment.toHuman()}`);
}

export default new Button({
    id: "deleteDeployment",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function ({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user !== interaction.user.id) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You do not have permission to delete this deployment");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const client = interaction.client;
        try {
            const signups = (await Signups.find({ where: { deploymentId: deployment.id } })).map(s => s.userId);
            const backups = (await Backups.find({ where: { deploymentId: deployment.id } })).map(b => b.userId);
            const deploymentTime = DateTime.fromMillis(Number(deployment.startTime));

            await Promise.all(signups.concat(backups).map(async userId => {
                // Catch individial message failures so we don't interrupt the other messages from being sent.
                try {
                    const user = await client.users.fetch(userId);
                    const embed = buildDeploymentDeletedConfirmationEmbed(user, deployment.title, deploymentTime);
                    await user.send({ embeds: [embed] });
                } catch (e) {
                    sendErrorToLogChannel(e, client);
                }
            }));
        } catch (e) {
            sendErrorToLogChannel(e, client);
        }

        await deployment.remove();

        const successEmbed = buildEmbed({ preset: "success" })
        .setDescription("Deployment deleted successfully");
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
        await interaction.message.delete();
    }
})