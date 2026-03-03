import type { HitLocationKey } from "@actor/types.ts";
import { createConditionItemData } from "@item/condition/conditions-registry.ts";
import type { DH2eSynthetics } from "@rules/synthetics.ts";

/** A single entry from the critical damage table */
interface CriticalEntry {
    damageType: string;
    location: string;
    severity: number;
    title: string;
    description: string;
    effects: string[];
    lethal: boolean;
    duration: string;
    penalties: CriticalPenalty[];
}

interface CriticalPenalty {
    characteristic: string;
    modifier: number;
    permanent: boolean;
}

/** Cached critical table data */
let criticalTable: CriticalEntry[] | null = null;

/**
 * Load the critical damage table from the system's static data.
 * Caches the result in memory after first load.
 */
async function loadCriticalTable(): Promise<CriticalEntry[]> {
    if (criticalTable) return criticalTable;

    try {
        const response = await fetch(`systems/${SYSTEM_ID}/data/tables/critical-damage.json`);
        if (!response.ok) throw new Error("Critical table not found");
        criticalTable = await response.json();
    } catch (e) {
        console.error("DH2E | Failed to load critical damage table", e);
        criticalTable = [];
    }

    return criticalTable!;
}

/**
 * Look up a critical damage entry.
 *
 * @param damageType "energy" | "impact" | "rending" | "explosive"
 * @param location Hit location key
 * @param severity 1-10 (clamped)
 */
async function lookupCritical(
    damageType: string,
    location: HitLocationKey,
    severity: number,
): Promise<CriticalEntry | null> {
    const table = await loadCriticalTable();
    const clampedSeverity = Math.max(1, Math.min(10, severity));

    // Map left/right arm and leg variants
    const normalizedLocation = normalizeLocation(location);

    const entry = table.find(
        (e) =>
            e.damageType === damageType &&
            e.location === normalizedLocation &&
            e.severity === clampedSeverity,
    );

    if (!entry) {
        console.warn(
            `DH2E | No critical entry for ${damageType}/${normalizedLocation}/${clampedSeverity}`,
        );
        return null;
    }

    return entry;
}

/** Normalize hit location to match table format */
function normalizeLocation(location: HitLocationKey): string {
    return location;
}

/**
 * Apply a critical injury to an actor.
 * Creates a critical-injury item, applies condition effects, and posts a chat card.
 *
 * @param attacker Optional attacking actor — used for Deathdealer talent bonus
 * @param isMeleeAttack Whether the triggering attack was melee
 */
async function applyCriticalInjury(
    actor: Actor,
    entry: CriticalEntry,
    location: HitLocationKey,
    attacker?: Actor,
    isMeleeAttack?: boolean,
): Promise<void> {
    // True Grit: reduce critical severity by Toughness Bonus (minimum 1)
    const actorSynthetics = (actor as any).synthetics as DH2eSynthetics | undefined;
    if (actorSynthetics?.rollOptions?.has("talent:true-grit")) {
        const tb = (actor as any).system?.characteristics?.t?.bonus ?? 0;
        if (tb > 0) {
            const originalSeverity = entry.severity;
            entry = { ...entry, severity: Math.max(1, entry.severity - tb) };
            if (entry.severity < originalSeverity) {
                ui.notifications.info(
                    game.i18n?.format("DH2E.TrueGrit.Reduced", { tb: String(tb) })
                        ?? `True Grit: critical severity reduced by ${tb}`,
                );
            }
        }
    }

    // Deathdealer: add Perception bonus to critical severity
    if (attacker) {
        const attackerSynthetics = (attacker as any).synthetics as DH2eSynthetics | undefined;
        const perBonus = (attacker as any).system?.characteristics?.per?.bonus ?? 0;
        if (perBonus > 0) {
            const hasDeathdealer = isMeleeAttack
                ? attackerSynthetics?.rollOptions?.has("talent:deathdealer:melee")
                : attackerSynthetics?.rollOptions?.has("talent:deathdealer:ranged");
            if (hasDeathdealer) {
                entry = { ...entry, severity: Math.min(10, entry.severity + perBonus) };
            }
        }
    }

    // Check for divination critical immunity reminder
    try {
        const { DivinationSessionHandler } = await import("@divination/session-effects.ts");
        const result = DivinationSessionHandler.checkForEffect(actor as any, "critical");
        if (result && !DivinationSessionHandler.isUsedThisSession(actor, result.effect.type)) {
            await DivinationSessionHandler.postReminder(actor as any, result.divText, result.effect);
            await DivinationSessionHandler.markUsed(actor, result.effect.type);
        }
    } catch {
        // Divination module not available
    }

    // Create critical-injury item on the actor
    const itemData = {
        name: entry.title,
        type: "critical-injury",
        img: "systems/dh2e/icons/items/critical-injury.svg",
        system: {
            description: entry.description,
            location: location,
            damageType: entry.damageType,
            severity: entry.severity,
            effects: entry.effects,
            lethal: entry.lethal,
            duration: entry.duration,
            penalties: entry.penalties.map((p) => ({
                target: p.characteristic,
                value: p.modifier,
            })),
        },
    };

    await actor.createEmbeddedDocuments("Item", [itemData]);

    // Apply condition effects from the critical entry
    for (const effectSlug of entry.effects) {
        await applyConditionBySlug(actor, effectSlug);
    }

    // Post critical chat card
    await postCriticalCard(actor, entry, location);
}

/** Create a condition item on the actor from an effect slug, sourcing from compendium when available */
async function applyConditionBySlug(actor: Actor, slug: string): Promise<void> {
    // Parse effect slugs like "stunned-3" => condition "stunned", duration 3
    const match = slug.match(/^(.+?)-(\d+)$/);
    const conditionSlug = match ? match[1] : slug;
    const remainingRounds = match ? parseInt(match[2], 10) : 0;

    // Skip non-condition effects (like "death", "prone", etc.)
    const skipSlugs = new Set(["death", "prone"]);
    if (skipSlugs.has(slug)) return;

    // Check if this condition type already exists on the actor
    const existing = actor.items.find(
        (i: Item) => i.type === "condition" && (i.system as any)?.slug === conditionSlug,
    );

    if (existing) {
        // If stackable, we could increment — for now just skip duplicates
        return;
    }

    // Source from core conditions registry for full rules data
    const conditionData = getConditionFromCompendium(conditionSlug, remainingRounds);
    await actor.createEmbeddedDocuments("Item", [conditionData]);
}

/** Look up a condition from the core conditions registry, with fallback */
function getConditionFromCompendium(
    slug: string,
    remainingRounds: number = 0,
): Record<string, unknown> {
    return createConditionItemData(slug, remainingRounds);
}

/** Post a critical damage chat card */
async function postCriticalCard(
    actor: Actor,
    entry: CriticalEntry,
    location: HitLocationKey,
): Promise<void> {
    const templatePath = `systems/${SYSTEM_ID}/templates/chat/critical-card.hbs`;
    const isGM = (game as any).user?.isGM ?? false;

    const templateData = {
        actorName: actor.name,
        actorId: actor.id,
        location: LOCATION_LABELS[location] ?? location,
        locationKey: location,
        severity: entry.severity,
        title: entry.title,
        description: entry.description,
        damageType: entry.damageType,
        effects: entry.effects,
        lethal: entry.lethal,
        duration: entry.duration,
        penalties: entry.penalties,
        isGM,
    };

    const content = await fa.handlebars.renderTemplate(templatePath, templateData);

    await fd.ChatMessage.create({
        content,
        flags: {
            [SYSTEM_ID]: {
                type: "critical",
                result: templateData,
            },
        },
    });
}

const LOCATION_LABELS: Record<string, string> = {
    head: "Head",
    rightArm: "Right Arm",
    leftArm: "Left Arm",
    body: "Body",
    rightLeg: "Right Leg",
    leftLeg: "Left Leg",
};

export {
    loadCriticalTable,
    lookupCritical,
    applyCriticalInjury,
    applyConditionBySlug,
    getConditionFromCompendium,
};
export type { CriticalEntry, CriticalPenalty };
