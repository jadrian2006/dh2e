/**
 * Imperial Dating System utilities.
 *
 * Format: {check}.{yearFraction}.{year}.M{millennium}
 * Example: 0.337.815.M41
 *
 * - check (0-9): accuracy digit
 * - yearFraction (000-999): 1000 divisions of the standard Terran year
 * - year (001-999): year within the millennium
 * - millennium: M41 for standard DH2E
 *
 * Internally we track day (1-365) for arithmetic, converting to yearFraction for display.
 */

interface ImperialDate {
    check: number;   // 0-9
    year: number;    // 1-999
    day: number;     // 1-365 (Terran standard for arithmetic)
    millennium: number; // 41
}

class ImperialDateUtil {
    /** Format an Imperial date to display string: "0.337.815.M41" */
    static format(date: ImperialDate): string {
        const frac = ImperialDateUtil.toYearFraction(date.day).toString().padStart(3, "0");
        const yr = date.year.toString().padStart(3, "0");
        return `${date.check}.${frac}.${yr}.M${date.millennium}`;
    }

    /** Convert a day (1-365) to the 000-999 year fraction */
    static toYearFraction(day: number): number {
        return Math.floor(((day - 1) * 1000) / 365);
    }

    /** Compute days remaining between current date and a deadline */
    static daysRemaining(current: ImperialDate, deadline: ImperialDate): number {
        const currentTotal = ImperialDateUtil.#toAbsoluteDay(current);
        const deadlineTotal = ImperialDateUtil.#toAbsoluteDay(deadline);
        return deadlineTotal - currentTotal;
    }

    /** Advance an Imperial date by a number of days */
    static advanceDay(date: ImperialDate, days: number): ImperialDate {
        let newDay = date.day + days;
        let newYear = date.year;
        let newMillennium = date.millennium;

        while (newDay > 365) {
            newDay -= 365;
            newYear++;
            if (newYear > 999) {
                newYear = 1;
                newMillennium++;
            }
        }
        while (newDay < 1) {
            newDay += 365;
            newYear--;
            if (newYear < 1) {
                newYear = 999;
                newMillennium--;
            }
        }

        return {
            check: date.check,
            year: newYear,
            day: newDay,
            millennium: newMillennium,
        };
    }

    /** Check if the current date is past the deadline */
    static isOverdue(current: ImperialDate, deadline: ImperialDate): boolean {
        return ImperialDateUtil.daysRemaining(current, deadline) < 0;
    }

    /** Compare two dates: negative if a < b, 0 if equal, positive if a > b */
    static compareDates(a: ImperialDate, b: ImperialDate): number {
        return ImperialDateUtil.#toAbsoluteDay(a) - ImperialDateUtil.#toAbsoluteDay(b);
    }

    /** Convert to an absolute day count for comparison arithmetic */
    static #toAbsoluteDay(date: ImperialDate): number {
        return (date.millennium * 1000 + date.year) * 365 + date.day;
    }
}

export { ImperialDateUtil };
export type { ImperialDate };
