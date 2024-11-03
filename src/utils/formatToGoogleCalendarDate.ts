export default function formatToGoogleCalendarDate(ms) {
    const date = new Date(ms / 1000);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}