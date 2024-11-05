import {buildEmbed} from "./configBuilders.js";
import {CacheType, ChannelType, GuildMember, ModalSubmitInteraction} from "discord.js";
import { DateTime } from "luxon";

export default async function getStartTime(startTime: string, interaction: ModalSubmitInteraction<CacheType>) {
    // Regex for both absolute and relative time formats
    const absoluteTimeRegex = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}) UTC[+-]\d{1,2}(:30)?$/;
    const relativeTimeRegex = /^(?:(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?)+$/;

    let startDate: Date;

    if (absoluteTimeRegex.test(startTime)) {
        // Parse using Luxon for better handling of time zones
        const startDateTime = DateTime.fromFormat(startTime, "yyyy-MM-dd HH:mm 'UTC'ZZ");
        startDate = startDateTime.toJSDate();  // Converts Luxon DateTime to JavaScript Date
    } else if (relativeTimeRegex.test(startTime)) {
        // Parse relative time
        const matches = startTime.match(/(\d+)([dhms])/g);
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

        // Calculate the relative start date based on current time
        startDate = new Date(Date.now() + totalMs);
    } else {
        const errorEmbed = buildEmbed({preset: "error"})
            .setDescription("**Invalid start time format. Please use `YYYY-MM-DD HH:MM UTC(+/-)X` (EX:`2024-11-02 06:23 UTC-7`**\nLog:Error formatting data");
        await interaction.reply({embeds: [errorEmbed], ephemeral: true});
        setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

        // Log invalid time entry to specific channel
        const logChannel = await interaction.client.channels.fetch('1299122351291629599');
        if (logChannel?.type === ChannelType.GuildText) {
            await logChannel.send(`-----------------\n\nInvalid time format used by ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username}\nAttempted time:** ${startTime}**`);
        }
        throw new Error();
    }

    if(startDate instanceof Date && isNaN(startDate.getTime())) {
        const errorEmbed = buildEmbed({ preset: "error" })
            .setDescription("**Invalid start time format. Please use `YYYY-MM-DD HH:MM UTC(+/-)X` (EX:`2024-11-02 06:23 UTC-7`**\nLog:Error parsing date string");
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

        // Log invalid time entry to specific channel
        const logChannel = await interaction.client.channels.fetch('1299122351291629599');
        if (logChannel?.type === ChannelType.GuildText) {
            await logChannel.send(`-----------------\n\nFailed to parse time by ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username}\nAttempted time:** ${startTime}**`);
        }

        console.log('Error: Could not parse data/time string - ${startDate}');
        throw new Error();
    }

    // const oneHourFromNow = Date.now() + (60 * 60 * 1000); // 1 hour in milliseconds
    //
    // if (startDate.getTime() < oneHourFromNow) {
    //     const errorEmbed = buildEmbed({ preset: "error" })
    //         .setDescription("Start time must be at least 1 hour in the future");
    //
    //
    //     await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    //     setTimeout(() => interaction.deleteReply().catch(() => null), 45000);
    //     throw new Error();
    // }

    return startDate;
}