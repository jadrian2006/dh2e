/**
 * Reverse the digits of a d100 roll for hit location determination.
 * E.g., 34 → 43, 70 → 07, 05 → 50, 100 → 001 → 1
 */
export function reverseDigits(roll: number): number {
    const tens = Math.floor(roll / 10) % 10;
    const ones = roll % 10;
    return ones * 10 + tens;
}

/** Roll a d100 (1-100) */
export function d100(): number {
    return Math.floor(Math.random() * 100) + 1;
}

/** Roll a d10 (1-10) */
export function d10(): number {
    return Math.floor(Math.random() * 10) + 1;
}
