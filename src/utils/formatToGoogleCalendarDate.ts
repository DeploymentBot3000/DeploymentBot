export default function formatToGoogleCalendarDate(timestamp: number): string {
    // Ensure timestamp is a valid number
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    
    const date = new Date(timestamp);
    
    // Validate date object
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date created from timestamp: ${timestamp}`);
    }
    
    // Format to YYYYMMDDTHHMMSS
    const formatted = date.toISOString()
        .replace(/[-:]/g, '')  // Remove dashes and colons
        .replace(/\.\d{3}Z/, ''); // Remove milliseconds and Z
    
    return formatted;
}