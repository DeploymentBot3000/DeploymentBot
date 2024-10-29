import {LessThanOrEqual, MoreThanOrEqual} from 'typeorm';
import {ApplicationCommandOptionType } from 'discord.js';
import Slashcommand from "../classes/Slashcommand.js";
import {DateTime} from 'luxon';
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import Config from "../config.js";
import {buildEmbed} from "../utils/configBuilders.js";
import HackedEmbedBuilder from "../classes/HackedEmbedBuilder.js";


// Interface to define deployments a user is assigned to without al the bloat
interface foundDeployments {
    id: number;
    title: string;
    time: number;
    channel: string;
    leader: string;
    primaries: number;
    backups: number;
}

// Gets deployments in a given range
const getDeployments = async (start: number, end: number):Promise<foundDeployments[]> => {
    const foundDeployments: foundDeployments[] = [];
    const deployments = await Deployment.find({
        where: {
            startTime: MoreThanOrEqual(start),
            endTime: LessThanOrEqual(end)
        }
    });

    for (const deployment of deployments) {
        const primariesArray = await Signups.find({where: {deploymentId: deployment.id}});
        const primaries = primariesArray.length;
        const backupsArray = await Backups.find({where: {deploymentId: deployment.id}});
        const backups = backupsArray.length;
        foundDeployments.push({
            id: deployment.id,
            title: deployment.title,
            time: deployment.startTime,
            channel: deployment.channel,
            leader: deployment.user,
            primaries,
            backups
        });
    }

    return foundDeployments;
};

// Function to create the embed message
const buildDeploymentsEmbed = async (start: number, end: number): Promise<HackedEmbedBuilder> => {
    const deployments = await getDeployments(start, end);

    // Create the embed
    const embed = new HackedEmbedBuilder()
        .setTitle(`🗓️Deployments from <t:${Math.round(start / 1000)}:t> to <t:${Math.round(end / 1000)}:t>`)
        .setColor(0xb60000)
        .setTimestamp(DateTime.now().toJSDate());

    let count = 0;
    deployments.forEach(deployment => {
        const link = `https://discord.com/channels/${Config.guildId}/${deployment.channel}/${deployment.id}`;

        // Add field to the embed
        embed.addFields({
            name: `🚨${deployment.title}`,
            value: `**🕛Drop Time:** <t:${Math.round(deployment.time / 1000)}:t>\n
                    **🪖Drop Leader:** ${deployment.leader}\n
                    **🟢Primary Divers:** ${deployment.primaries}/4\n
                    **🔵Backup Divers:** ${deployment.backups}/4\n
                    **🔗Signup Link:** [Click me](${link})`,
            inline: true
        });

        if(count == 1) {
            embed.addFields({ name: '', value: ''});
            count = 0;
        } else count++
    });

    // Add footer
    embed.setFooter({
        text: Config.embeds.deploymentsCommand.footer.text,
        iconURL: Config.embeds.deploymentsCommand.footer.image
    });

    return embed;
};

export default new Slashcommand({
    name: "deploymentsearch",
    description: "Search for today's upcoming deployments!",
    cooldown: 0,
    permissions: [],
    requiredRoles: [{ role: "Verified", required: true }],
    options: [{ name: "start_time", type: ApplicationCommandOptionType.String, description: "Enter your desired start time", required: true },
              { name: "end_time", type: ApplicationCommandOptionType.String, description: "Enter your desired end time", required: false }],
    func: async function({ interaction }) {
        const startTimeString = interaction.options.getString("start_time");
        const endTimeString = interaction.options.getString("end_time");

        // Validate time format (HH:MM, 24-hour)
        const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(startTimeString) || (endTimeString && !timeRegex.test(endTimeString))) {
            console.log("Error: Invalid Time format!");
            await interaction.reply({ embeds: [buildEmbed({ preset: "error", name: "Error: Invalid Time Format", placeholders: { description: "Please use HH:MM format." }})], ephemeral: true });
            return;
        }

        // Parse start and end times into today’s date
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...startTimeString.split(':').map(Number));
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...endTimeString.split(':').map(Number));

        // Calculate 24 hours ahead
        const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Ensure times are within 24-hour range from now
        if (start < now || start > maxTime || end > maxTime) {
            await interaction.reply({ embeds: [buildEmbed({ preset: "error", name: "Error: Time Out of Range", placeholders: { description: "Please select a time within 24 hours from now." }})], ephemeral: true });
            return;
        }

        // Generate the embed based on valid time inputs
        const embed = await buildDeploymentsEmbed(start.getTime(), end.getTime());
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});