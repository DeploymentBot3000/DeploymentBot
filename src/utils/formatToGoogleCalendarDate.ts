export default function formatToGoogleCalendarDate(ms) {
    const date = new Date(ms / 1000);
    const dateString = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    console.log(dateString)

    return dateString;
}