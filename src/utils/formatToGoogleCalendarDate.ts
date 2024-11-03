export default function formatToGoogleCalendarDate(timestamp: number): string {
    // Validate timestamp
    if (!timestamp || isNaN(timestamp)) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    
    const date = new Date(timestamp);
    
    // Validate date object
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date created from timestamp: ${timestamp}`);
    }
    
    // Format to YYYYMMDDTHHMMSSZ
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}