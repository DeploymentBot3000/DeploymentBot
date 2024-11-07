const EMOJI_REGEX = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDDE6-\uDDFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g;

export function removeEmojis(text: string): string {
    return text.replace(EMOJI_REGEX, '').trim();
}

export function containsEmojis(text: string): boolean {
    return EMOJI_REGEX.test(text);
}

export function validateAndRemoveEmojis(fields: Record<string, string>): Record<string, string> {
    const foundEmojis: string[] = [];
    
    // Check all fields for emojis
    Object.entries(fields).forEach(([fieldName, value]) => {
        if (containsEmojis(value)) {
            foundEmojis.push(fieldName);
        }
    });
    
    // If emojis found, throw error
    if (foundEmojis.length > 0) {
        throw new Error(`Emojis are not allowed in the following fields: ${foundEmojis.join(', ')}`);
    }
    
    // Remove emojis from all fields
    const cleanedFields: Record<string, string> = {};
    Object.entries(fields).forEach(([fieldName, value]) => {
        cleanedFields[fieldName] = removeEmojis(value);
    });
    
    return cleanedFields;
} 