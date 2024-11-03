export default function formatToGoogleCalendarDate(ms: number) {
    const date = new Date(Math.round(ms / 1000));
    console.log(date);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}