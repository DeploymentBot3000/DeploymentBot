import { buildErrorEmbed } from "./embedBuilders/configBuilders.js";
import {CacheType, ChannelType, GuildMember, ModalSubmitInteraction} from "discord.js";
import {DateTime, Duration} from "luxon";
import config from "../config.js";

function _parseAbsoluteDateString(input: string) {
    let parsedDate = null;
    for (const dateformat of ['yyyy-MM-dd HH:mm z', "yyyy-MM-dd HH:mm 'UTC'ZZ"]) {
        parsedDate = DateTime.fromFormat(input, dateformat);
        if (parsedDate.isValid) {
            return parsedDate;
        }
    }
    return new Error(`Failed to parse date string with error: ${parsedDate.invalidReason}`);
}

/**
 * 
 * @param input Relative time string, e.g. 1h10m30s, indicating 1 hour + 30 minutes + 30 seconds from now.
 * @returns The number of miliseconds in `input`.
 */
function _parseRelativeTimeString(input: string): number | Error {
    const relativeTimeRegex = /^(?:(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?)+$/;
    if (!relativeTimeRegex.test(input)) {
        return new Error('Input is not a valid relative time string.');
    }
    // Parse relative time
    const matches = input.match(/(\d+)([dhms])/g);
    let totalMs = 0;

    matches.forEach(match => {
        const value = parseInt(match.slice(0, -1));
        const unit = match.slice(-1);

        switch (unit) {
            case 'd':
                totalMs += value * 24 * 60 * 60 * 1000;
                break;
            case 'h':
                totalMs += value * 60 * 60 * 1000;
                break;
            case 'm':
                totalMs += value * 60 * 1000;
                break;
            case 's':
                totalMs += value * 1000;
                break;
        }
    });
    return totalMs;
}

function _parseStartDate(input: string) {
    const parsedDate = _parseAbsoluteDateString(input);
    if (!(parsedDate instanceof Error)) {
        return parsedDate.toJSDate();
    }
    const deltaMilis = _parseRelativeTimeString(input);
    if (!(deltaMilis instanceof Error)) {
        return new Date(Date.now() + deltaMilis);
    }
    console.log(parsedDate);
    console.log(deltaMilis);
    return new Error('Failed to parse input as absolute or relative time.');
}

const _kDateInputErrorDescription : string = `# Invalid start time format\n
Please use on of the following formats:\n
* \`YYYY-MM-DD HH:MM <Time Zone Name>\` - Absolute time with IANA time zone name. E.g. \`2024-11-02 06:23 US/Central\`\n
* \`YYYY-MM-DD HH:MM UTC(+/-)X\` - Absolute time with UTC offset. E.g. \`2024-11-02 06:23 UTC-7\`\n
* \`??h??m??s\` - Relative time. E.g. \`1h10m30s\`\n
Time zone names are available at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`;

export default async function getStartTime(startTime: string, interaction: ModalSubmitInteraction<CacheType>) {
    // Regex for relative time formats

    const startDate: Date | Error = _parseStartDate(startTime);

    if (startDate instanceof Error) {
        const errorEmbed = buildErrorEmbed()
            .setDescription(_kDateInputErrorDescription);
        await interaction.reply({embeds: [errorEmbed], ephemeral: true});
        setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

        // Log invalid time entry to specific channel
        const logChannel = await interaction.client.channels.fetch('1299122351291629599');
        if (logChannel?.type === ChannelType.GuildText) {
            await logChannel.send(`-----------------\n\nInvalid time format used by ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username}\nAttempted time:** ${startTime}**`);
        }
        throw startDate;
    }

    const minDeploymentLeadTime: Duration = Duration.fromDurationLike({minutes: config.min_deployment_lead_time_minutes});

    if (DateTime.fromJSDate(startDate) < DateTime.now().plus(minDeploymentLeadTime)) {
        const errorEmbed = buildErrorEmbed()
            .setDescription(`Start time must be at least ${minDeploymentLeadTime.toHuman()} in the future`);


        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        setTimeout(() => interaction.deleteReply().catch(() => null), 45000);
        throw new Error();
    }

    return startDate;
}