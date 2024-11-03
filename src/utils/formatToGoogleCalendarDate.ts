export default function formatToGoogleCalendarDate(timestamp: number): string {
    // Validate timestamp
    if (!timestamp || isNaN(timestamp)) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    
    // Ensure timestamp is within valid date range
    const date = new Date(timestamp);
    if (date.toString() === 'Invalid Date') {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    
    try {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (error) {
        console.error(`Error formatting date for timestamp ${timestamp}:`, error);
        throw new Error(`Failed to format date for timestamp: ${timestamp}`);
    }
}