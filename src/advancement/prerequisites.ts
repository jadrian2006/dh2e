import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";

export interface PrereqResult {
    met: boolean;
    unmet: string[];
}

/** Map prerequisite abbreviation strings to system characteristic keys */
const CHAR_ABBREV_MAP: Record<string, CharacteristicAbbrev> = {
    ws: "ws",
    bs: "bs",
    s: "s",
    t: "t",
    ag: "ag",
    int: "int",
    per: "per",
    wp: "wp",
    fel: "fel",
};

/** Regex for characteristic abbreviation + target value, e.g. "Ag 30", "BS 40" */
const CHAR_RE = /^(WS|BS|S|T|Ag|Int|Per|WP|Fel)\s+(\d+)$/i;

/** Regex for "Psy Rating" with optional level, e.g. "Psy Rating", "Psy Rating 3" */
const PSY_RE = /^Psy\s+Rating\s*(\d*)$/i;

/** Regex for skill name with +N bonus, e.g. "Awareness +10", "Tech-Use +10" */
const SKILL_BONUS_RE = /^(.+?)\s+\+(\d+)$/;

/** Regex for skill name with "rank N", e.g. "Medicae rank 2" */
const SKILL_RANK_RE = /^(.+?)\s+rank\s+(\d+)$/i;

/**
 * Split a string on a delimiter, but only when not inside parentheses.
 */
function splitOutsideParens(text: string, delimiter: string): string[] {
    const results: string[] = [];
    let depth = 0;
    let current = "";

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth = Math.max(0, depth - 1);

        // Check if we're at a delimiter boundary (outside parens)
        if (depth === 0 && text.substring(i, i + delimiter.length) === delimiter) {
            results.push(current.trim());
            current = "";
            i += delimiter.length - 1; // skip rest of delimiter
            continue;
        }
        current += ch;
    }
    if (current.trim()) results.push(current.trim());
    return results;
}

/**
 * Check a single atomic prerequisite clause against an actor.
 * Returns true if met, false if unmet.
 */
function checkAtom(actor: AcolyteDH2e, clause: string): boolean {
    const trimmed = clause.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return true;

    // Skip ambiguous/unparseable prereqs (treat as met)
    if (/\bany\b/i.test(trimmed) || /\bselected\b/i.test(trimmed) || /\bRank\s+\d+\s+in\b/i.test(trimmed)) {
        return true;
    }

    // 1. Characteristic check: "Ag 30", "BS 40", "WP 50"
    const charMatch = CHAR_RE.exec(trimmed);
    if (charMatch) {
        const key = CHAR_ABBREV_MAP[charMatch[1].toLowerCase()];
        const target = Number(charMatch[2]);
        if (key) {
            return actor.system.characteristics[key].value >= target;
        }
    }

    // 2. Psy Rating check: "Psy Rating", "Psy Rating 3"
    const psyMatch = PSY_RE.exec(trimmed);
    if (psyMatch) {
        const targetLevel = psyMatch[1] ? Number(psyMatch[1]) : 1;
        // Check for a "Psy Rating" talent or system field
        const psyTalent = actor.items.find(
            (i: Item) => i.type === "talent" && i.name.toLowerCase() === "psy rating",
        );
        if (psyTalent) {
            const rank = (psyTalent.system as any).rank ?? 1;
            return rank >= targetLevel;
        }
        // Also check system.psyRating if it exists
        const sysRating = (actor.system as any).psyRating ?? 0;
        return sysRating >= targetLevel;
    }

    // 3. Skill with +N bonus: "Awareness +10", "Tech-Use +10"
    const bonusMatch = SKILL_BONUS_RE.exec(trimmed);
    if (bonusMatch) {
        const skillName = bonusMatch[1].trim();
        const bonus = Number(bonusMatch[2]);
        // +10 = advancement ≥ 2, +20 = ≥ 3, +30 = ≥ 4
        const requiredAdvancement = Math.floor(bonus / 10) + 1;
        return hasSkillAtRank(actor, skillName, requiredAdvancement);
    }

    // 4. Skill with "rank N": "Medicae rank 2"
    const rankMatch = SKILL_RANK_RE.exec(trimmed);
    if (rankMatch) {
        const skillName = rankMatch[1].trim();
        const requiredRank = Number(rankMatch[2]);
        return hasSkillAtRank(actor, skillName, requiredRank);
    }

    // 5. Name-based check — could be a skill (advancement ≥ 1) or talent (owned)
    return hasSkillOrTalent(actor, trimmed);
}

/**
 * Check if an actor has a skill at a minimum advancement rank.
 * Handles both plain names ("Acrobatics") and specializations ("Trade (Armourer)").
 */
function hasSkillAtRank(actor: AcolyteDH2e, name: string, minRank: number): boolean {
    // Parse potential specialization: "Trade (Armourer)" → base="Trade", spec="Armourer"
    const specMatch = /^(.+?)\s*\((.+?)\)$/.exec(name);

    for (const item of actor.items) {
        if (item.type !== "skill") continue;
        const sys = item.system as any;
        const spec: string = sys.specialization ?? "";

        if (specMatch) {
            // Match base name + specialization
            if (
                item.name.toLowerCase() === specMatch[1].trim().toLowerCase() &&
                spec.toLowerCase() === specMatch[2].trim().toLowerCase()
            ) {
                return (sys.advancement ?? 0) >= minRank;
            }
        } else {
            // Match plain name (no spec required)
            if (item.name.toLowerCase() === name.toLowerCase() && !spec) {
                return (sys.advancement ?? 0) >= minRank;
            }
            // Also match if the skill has no specialization distinction
            if (item.name.toLowerCase() === name.toLowerCase()) {
                return (sys.advancement ?? 0) >= minRank;
            }
        }
    }
    return false;
}

/**
 * Check if an actor has a skill (advancement ≥ 1) or talent (owned) by name.
 * Handles parenthetical specializations for both.
 */
function hasSkillOrTalent(actor: AcolyteDH2e, name: string): boolean {
    // Check skills first (need advancement ≥ 1)
    if (hasSkillAtRank(actor, name, 1)) return true;

    // Check talents by exact name
    const specMatch = /^(.+?)\s*\((.+?)\)$/.exec(name);
    for (const item of actor.items) {
        if (item.type !== "talent") continue;
        // Talents store their full name including specialization
        if (item.name.toLowerCase() === name.toLowerCase()) return true;
        // Also check base name match for talents with parenthetical qualifiers
        if (specMatch && item.name.toLowerCase() === name.toLowerCase()) return true;
    }

    return false;
}

/**
 * Check all prerequisites in a prerequisite string against an actor.
 *
 * Prerequisite strings are comma-separated AND clauses.
 * Individual clauses may contain " or " for OR conditions.
 *
 * @returns Object with `met` (all conditions satisfied) and `unmet` (list of failed conditions)
 */
export function checkPrerequisites(actor: AcolyteDH2e, prereqString: string): PrereqResult {
    if (!prereqString || prereqString.trim().toLowerCase() === "none") {
        return { met: true, unmet: [] };
    }

    // Split on ", " outside parentheses to get AND clauses
    const andClauses = splitOutsideParens(prereqString, ", ");
    const unmet: string[] = [];

    for (const clause of andClauses) {
        // Check for OR within this clause (outside parens)
        const orParts = splitOutsideParens(clause, " or ");

        if (orParts.length > 1) {
            // OR: any one passing satisfies this clause
            const anyMet = orParts.some((part) => checkAtom(actor, part));
            if (!anyMet) {
                unmet.push(clause);
            }
        } else {
            // Single atomic check
            if (!checkAtom(actor, clause)) {
                unmet.push(clause);
            }
        }
    }

    return { met: unmet.length === 0, unmet };
}
