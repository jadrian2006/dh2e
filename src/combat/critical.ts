import type { HitLocationKey } from "@actor/types.ts";

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
 * Load the critical damage table from the dh2e-data module.
 * Caches the result in memory after first load.
 */
async function loadCriticalTable(): Promise<CriticalEntry[]> {
    if (criticalTable) return criticalTable;

    try {
        const response = await fetch(`modules/dh2e-data/data/tables/critical-damage.json`);
        if (!response.ok) {
            console.warn("DH2E | Could not load critical damage table from module, trying system path");
            const fallback = await fetch(`systems/dh2e/data/tables/critical-damage.json`);
            if (!fallback.ok) throw new Error("Critical table not found");
            criticalTable = await fallback.json();
        } else {
            criticalTable = await response.json();
        }
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
 */
async function applyCriticalInjury(
    actor: Actor,
    entry: CriticalEntry,
    location: HitLocationKey,
): Promise<void> {
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

/** Create a condition item on the actor from an effect slug */
async function applyConditionBySlug(actor: Actor, slug: string): Promise<void> {
    // Parse effect slugs like "stunned-3" => condition "stunned", duration 3
    const match = slug.match(/^(.+?)-(\d+)$/);
    const conditionSlug = match ? match[1] : slug;
    const duration = match ? match[2] : "";

    // Skip non-condition effects (like "death", "on-fire", etc.)
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

    const conditionData = {
        name: conditionSlug.charAt(0).toUpperCase() + conditionSlug.slice(1),
        type: "condition",
        img: "systems/dh2e/icons/items/condition.svg",
        system: {
            description: `Applied by critical injury`,
            slug: conditionSlug,
            duration: duration ? `${duration} rounds` : "",
            stackable: false,
        },
    };

    await actor.createEmbeddedDocuments("Item", [conditionData]);
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
};
export type { CriticalEntry, CriticalPenalty };
