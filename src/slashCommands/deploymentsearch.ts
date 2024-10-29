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
    message: string;
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
            message: deployment.message,
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
        const link = `https://discord.com/channels/${Config.guildId}/${deployment.channel}/${deployment.message}`;

        // Add field to the embed
        embed.addFields({
            name: `🚨${deployment.title}`,
            value: `**🕛Drop Time:** <t:${Math.round(deployment.time / 1000)}:t>\n**🪖Drop Leader:** <@${deployment.leader}>\n**🟢Primary Divers:** ${deployment.primaries}/4\n**🔵Backup Divers:** ${deployment.backups}/4\n**🔗Signup Link:** [Click me](${link})`,
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
    options: [
        { name: "start_time", type: ApplicationCommandOptionType.String, description: "Enter your desired start time (HH:MM, 24-hour format)", required: true },
        { name: "time_zone", type: ApplicationCommandOptionType.String, description: "Enter your time zone (e.g., America/New_York)", required: true },
        { name: "end_time", type: ApplicationCommandOptionType.String, description: "Enter your desired end time (HH:MM, 24-hour format)", required: false }
    ],
    func: async function({ interaction }) {
        // User input ✅
        // Take in start time end time and timezone. ✅
        // Check to see if times and zone entered are of valid form ✅
        // Handle any errors ✅

        // User input
        const requestedStart = interaction.options.getString("start_time");
        const requestedEnd = interaction.options.getString("end_time");
        const timeZone = interaction.options.getString("time_zone");

        // Validate time format (HH:MM, 24-hour)
        const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
        const timezoneRegex = /^UTC([+-](0[0-9]|1[0-4]):?([0-5][0-9])?)?$/;
        if (!timeRegex.test(requestedStart) || (requestedEnd && !timeRegex.test(requestedEnd))) {
            await interaction.reply({ embeds: [buildEmbed({ preset: "error", name: "Error: Invalid Time Format", placeholders: { title: "Error: Invalid Time Format", description: "Please use HH:MM format." }})], ephemeral: true });
            console.log("Time issue");
            return;
        }
        if(!timezoneRegex.test(timeZone)) {
            await interaction.reply({ embeds: [buildEmbed({ preset: "error", name: "Error: Invalid Timezone Format", placeholders: { description: "Please use UTC+-HH:MM format." }})], ephemeral: true });
            console.log("Zone issue");
            console.log(timeZone);
            return;
        }

        //Logic
        // Get the start datetime
        // Get the end datetime - If no end time set it to 24 hours from the time the command was run
        // if the end time is less than the start time assume they mean for the next day and set the date to the next day
        // Check that the start time isn't in the past, the end time isn't outside of the 24 hour window, check that the start time isn't outside the 24 hour window
        // Get the time in mils and pass to the search function

        // Parse start and end times into DateTime objects in the specified time zone
        const now:DateTime = DateTime.now({ zone: timeZone });
        // Calculate 24 hours ahead in the specified time zone
        const maxTime:DateTime = now.plus({ days: 1 });

        const start = DateTime.fromFormat(requestedStart, 'HH:mm', { zone: timeZone }).set({
            year: now.year,
            month: now.month,
            day: now.day
        });

        const end = DateTime.fromFormat(requestedEnd, 'HH:mm', { zone: timeZone }).set({
            year: requestedEnd ? now.year : maxTime.year,
            month: requestedEnd ? now.month : maxTime.month,
            day: requestedEnd ? now.day : maxTime.day
        });

        // Ensure times are within 24-hour range from now
        if (start < now || start > maxTime || end > maxTime) {
            await interaction.reply({ embeds: [buildEmbed({ preset: "error", name: "Error: Time Out of Range", placeholders: { description: "Please select a time within 24 hours from now." }})], ephemeral: true });
            console.log(`Start: ${start}\n`, `End: ${end}\n`, `Maxtime: ${maxTime}\n`, `Now: ${now}`);
            return;
        }

        // Generate the embed based on valid time inputs
        const embed = await buildDeploymentsEmbed(start.toMillis(), end.toMillis());
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});