import { DateTime, Duration } from "luxon";
import config from "../config.js";

const _kDateInputErrorDescription: string = `# Invalid start time format\n
Please use on of the following formats:\n
* \`YYYY-MM-DD HH:MM <Time Zone Name>\` - Absolute time with IANA time zone name. E.g. \`2024-11-02 06:23 US/Central\`\n
* \`YYYY-MM-DD HH:MM UTC(+/-)X\` - Absolute time with UTC offset. E.g. \`2024-11-02 06:23 UTC-7\`\n
* \`??d ??h ??m ??s\` - Relative time. E.g. \`1h 10m 30s\` or \`5h\`\n
Time zone names are available at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`;

export function parseStartTime(input: string): DateTime | Error {
    const startTime = _parseStartTimeInternal(input);
    if (startTime instanceof Error) {
        return startTime;
    }

    const minDeploymentLeadTime: Duration = Duration.fromDurationLike({ minutes: config.min_deployment_lead_time_minutes });
    if (startTime < DateTime.now().plus(minDeploymentLeadTime)) {
        return new Error(`Deployment start time must be at least ${config.min_deployment_lead_time_minutes} minutes in the future.`);
    }

    return startTime;
}

export enum DiscordTimestampFormat {
    SHORT_TIME = "t",
    LONG_TIME = "T",
    SHORT_DATE = "d",
    LONG_DATE = "D",
    SHORT_DATE_TIME = "f",
    LONG_DATE_TIME = "F",
    RELATIVE_TIME = "R"
}

export function formatDiscordTime(date: DateTime, format: DiscordTimestampFormat = DiscordTimestampFormat.LONG_DATE_TIME): string {
    return `<t:${Math.floor(date.toSeconds())}:${format}>`;
}

function _parseStartTimeInternal(input: string): DateTime | Error {
    const startTime = _parseAbsoluteDateString(input);
    if (!(startTime instanceof Error)) {
        return startTime;
    }
    const duration = _parseRelativeTimeString(input);
    if (!(duration instanceof Error)) {
        return DateTime.now().plus(duration);
    }
    return new Error(_kDateInputErrorDescription);
}

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
 * @returns The duration in `input`.
 */
function _parseRelativeTimeString(input: string): Duration | Error {
    const relativeTimeRegex = /^\s*(\d{1,5}d)?\s*(\d{1,5}h)?\s*(\d{1,5}m)?\s*(\d{1,5}s)?\s*$/;
    const match = input.match(relativeTimeRegex);

    // If the input string is empty we can match no groups and only whitespace, checking match[0] prevents this edge case.
    if (!match || !match[0]) {
        return new Error('Input is not a valid relative time string.');
    }

    const duration = Duration.fromDurationLike({
        days: parseInt(match[1]) || 0,
        hours: parseInt(match[2]) || 0,
        minutes: parseInt(match[3]) || 0,
        seconds: parseInt(match[4]) || 0,
    });

    if (!duration.isValid) {
        throw new Error(`Invalid relative time string: ${input}`);
    }

    return duration;
}
