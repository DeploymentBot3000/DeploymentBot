export default function formatToGoogleCalendarDate(ms) {
    const date = new Date(ms / 1000);
    console.log(date);
    const dateString = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    console.log(dateString)

    return dateString;
}