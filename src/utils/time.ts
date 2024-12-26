import { DateTime } from "luxon";

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
