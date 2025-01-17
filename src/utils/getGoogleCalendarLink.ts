import { MAX_FIELD_VALUE_LENGTH } from "../discord_constants.js";

function formatToGoogleCalendarDate(timestamp: number): string {
    timestamp = Number(timestamp);
    if (typeof timestamp !== 'number' || isNaN(timestamp)) throw new Error(`Invalid timestamp: ${timestamp}`);
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) throw new Error(`Invalid date created from timestamp: ${timestamp}`);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export default function getGoogleCalendarLink(title: string, description: string, startDate: number, endDate: number) {
    const uriTitle = encodeURIComponent(title);
    // Limit the google description since we need to fit a bunch more details into the same field.
    // 500 is arbitrary here, we probably can fit more.
    const details = encodeURIComponent(description.slice(0, MAX_FIELD_VALUE_LENGTH - 500));
    const uriLocation = encodeURIComponent("505th Deployments Channel");
    const formattedStart = formatToGoogleCalendarDate(startDate);
    const formattedEnd = formatToGoogleCalendarDate(endDate);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${uriTitle}&details=${details}&dates=${formattedStart}/${formattedEnd}&location=${uriLocation}&sf=true&output=xml`;
}
