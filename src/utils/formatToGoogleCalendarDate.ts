export default function formatToGoogleCalendarDate(ms: number) {
    const date = new Date(Math.round(ms / 1000));
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}