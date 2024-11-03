export default function formatToGoogleCalendarDate(ms: number) {
    // Validate the timestamp is within reasonable bounds
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    
    if (ms < now - oneYearMs || ms > now + oneYearMs) {
        throw new Error(`Timestamp out of reasonable range: ${ms}`);
    }

    const date = new Date(ms);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid timestamp: ${ms}`);
    }
    
    return date.toISOString().replace(/[-:.]/g, "").slice(0, -4) + "Z";
}