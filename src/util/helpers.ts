/** Convert a string to a URL-safe slug */
export function sluggify(text: string): string {
    return text
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Format a number with a sign prefix (+5, -3, 0) */
export function signedInteger(value: number): string {
    if (value >= 0) return `+${value}`;
    return `${value}`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/** Create a localized label from a config key */
export function localizeLabel(key: string): string {
    return game.i18n.localize(key);
}
