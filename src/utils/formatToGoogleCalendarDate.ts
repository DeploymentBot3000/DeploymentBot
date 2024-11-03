export default function formatToGoogleCalendarDate(ms: number) {
    const date = new Date(ms);
    return date.toISOString().replace(/[-:.]/g, "").slice(0, -4) + "Z";
}