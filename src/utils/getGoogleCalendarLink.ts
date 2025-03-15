
function formatToGoogleCalendarDate(timestamp: number): string {
    timestamp = Number(timestamp);
    if (typeof timestamp !== 'number' || isNaN(timestamp)) throw new Error(`Invalid timestamp: ${timestamp}`);
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) throw new Error(`Invalid date created from timestamp: ${timestamp}`);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// encodeURIComponent version that encodes all non alphanumeric characters, including special characters that are valid uri component characters.
// Since we use links in markdown, we need to escape all characters that might break the markdown syntax like parenthesis.
function _encodeURIComponent(uriComponent: string) {
    return encodeURIComponent(uriComponent).replace(/[^A-Za-z0-9]/g, c => "%" + c.charCodeAt(0).toString(16));
}

export default function getGoogleCalendarLink(title: string, description: string, startDate: number, endDate: number) {
    const uriTitle = _encodeURIComponent(title);
    // Limit the google description since we need to fit a bunch more details into the same field.
    // 200 is arbitrary here, we know that 500 is too long in some edge cases, likely due to url encoding.
    const details = _encodeURIComponent(description.slice(0, 200));
    const uriLocation = _encodeURIComponent("505th Deployments Channel");
    const formattedStart = formatToGoogleCalendarDate(startDate);
    const formattedEnd = formatToGoogleCalendarDate(endDate);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${uriTitle}&details=${details}&dates=${formattedStart}/${formattedEnd}&location=${uriLocation}&sf=true&output=xml`;
}
