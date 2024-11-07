import emoji from 'node-emoji';

export function removeEmojis(text: string): string {
    return emoji.strip(text).trim();
}

export function validateAndRemoveEmojis(fields: Record<string, string>): Record<string, string> {
    const cleanedFields: Record<string, string> = {};
    Object.entries(fields).forEach(([fieldName, value]) => {
        cleanedFields[fieldName] = removeEmojis(value);
    });
    
    return cleanedFields;
} 