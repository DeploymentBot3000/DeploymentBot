export default function formatToGoogleCalendarDate(timestamp: number) {
    return new Date(timestamp).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}