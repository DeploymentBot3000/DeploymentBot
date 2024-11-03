export default function formatToGoogleCalendarDate(ms) {
    const date = new Date(ms);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}