import { EmbedBuilder } from 'discord.js';
import Slashcommand from "../classes/Slashcommand.js";
import { DateTime } from 'luxon';
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Config from "../config.js";

// "Hacked" the embed builder to bypass name empty string restrictions
class HackedEmbedBuilder extends EmbedBuilder {
    addFields(...fields) {
        // Map over fields and remove the validation on the `name` field
        fields = fields.map(field => ({
            name: field.name ?? '', // Allow empty string as a valid `name` field
            value: field.value || '\u200B', // Ensure `value` is not empty, fallback to zero-width space
            inline: field.inline || false,
        }));

        // Pass modified fields to the parent class's `addFields` method without triggering validation
        this.data.fields = (this.data.fields || []).concat(fields);
        return this;
    }
}

// Interface to define deployments a user is assigned to without al the bloat
interface assignedDeployment {
    id: number;
    title: string;
    time: number;
    channel: string;
    assignment: string;
}

// Get deployments
const getUserDeployments = async (userID: string): Promise<assignedDeployment[]> => {
    const deployments: assignedDeployment[] = [];

    const signups = await Signups.find({ where: { userId: userID } });
    for (const signup of signups) {
        const deployment = await Deployment.find({ where: { id: signup.deploymentId } });
        if (deployment[0]) {
            deployments.push({
                id: deployment[0].id,
                title: deployment[0].title,
                time: deployment[0].startTime,
                channel: deployment[0].channel,
                assignment: signup.userId === deployment[0].user ? 'leader' : 'primary'
            });
        }
    }

    const backups = await Backups.find({ where: { userId: userID } });
    for (const backup of backups) {
        const deployment = await Deployment.find({ where: { id: backup.deploymentId } });
        if (deployment[0]) {
            deployments.push({
                id: deployment[0].id,
                title: deployment[0].title,
                time: deployment[0].startTime,
                channel: deployment[0].channel,
                assignment: 'backup'
            });
        }
    }

    return deployments.sort((a, b) => a.time - b.time);
};

// Helper Function to get the status emoji of the deployment
const getStatusEmoji = (assignment: string): string => {
    const emojiMap: { [key: string]: string } = {
        primary: '🟢',
        leader: '📛',
        backup: '🔵'
    };
    return emojiMap[assignment.toLowerCase()];
};

// Function to create the embed message
const buildDeploymentsEmbed = async (user: string): Promise<EmbedBuilder> => {
    const deployments = await getUserDeployments(user);

    // Create the embed
    const embed = new HackedEmbedBuilder()
        .setTitle(deployments.length == 0 ? Config.embeds.deploymentsCommand.title.noDeployments : Config.embeds.deploymentsCommand.title.default)
        .setColor(0xb60000)
        .setTimestamp(DateTime.now().toJSDate());

    deployments.forEach(deployment => {
        const title = deployment.title;
        const time = deployment.time;
        const assignment = deployment.assignment;
        const link = `https://discord.com/channels/${Config.guildId}/${deployment.channel}/${deployment.id}`;

        // Add field to the embed
        embed.addFields({
            name: '',
            value: `${getStatusEmoji(assignment)} ᲼**Operation:** ${title} | **Time:** <t:${Math.round(time / 1000)}:t> | **Assignment:** ${assignment.charAt(0).toUpperCase() + assignment.slice(1)} | [🔗](${link})`
        });
    });

    // Add footer
    embed.setFooter({
        text: Config.embeds.deploymentsCommand.footer.text,
        iconURL: Config.embeds.deploymentsCommand.footer.image
    });

    return embed;
};

export default new Slashcommand({
    name: "deployments",
    description: "Lists your upcoming deployments!",
    cooldown: 0,
    permissions: [],
    requiredRoles: [{ role: "Verified", required: true }],
    options: [],
    func: async function({ interaction }) {
        const user = interaction.user.id;
        const embed = await buildDeploymentsEmbed(user); // Await the async embed function
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});