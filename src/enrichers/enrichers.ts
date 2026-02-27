import type { CharacteristicAbbrev } from "@actor/types.ts";
import { CANONICAL_SKILL_CHARS } from "@item/skill/uses.ts";

/**
 * Cached condition data from the dh2e-data.conditions compendium.
 * Populated lazily on first enrichCondition call.
 */
const conditionCache = new Map<string, {
    name: string;
    description: string;
    img: string;
    uuid: string;
}>();
let conditionCacheReady = false;

/** Map from lowercase characteristic abbreviation to full i18n key */
const CHAR_ABBREV_TO_KEY: Record<string, CharacteristicAbbrev> = {
    ws: "ws", bs: "bs", s: "s", t: "t", ag: "ag",
    int: "int", per: "per", wp: "wp", fel: "fel",
};

/**
 * Register all DH2E custom text enrichers.
 * Called from the init hook after settings are registered.
 */
export function registerEnrichers(): void {
    CONFIG.TextEditor.enrichers.push(
        {
            pattern: /@Condition\[([^\]]+)\](?:\{([^}]+)\})?/gi,
            enricher: enrichCondition,
        },
        {
            pattern: /@Check\[([^\]]+)\](?:\{([^}]+)\})?/gi,
            enricher: enrichCheck,
        },
        {
            pattern: /@Damage\[([^\]]+)\](?:\{([^}]+)\})?/gi,
            enricher: enrichDamage,
        },
    );
}

/** Populate the condition cache from the compendium index */
async function ensureConditionCache(): Promise<void> {
    if (conditionCacheReady) return;
    conditionCacheReady = true;

    try {
        const g = game as any;
        const pack = g.packs?.get("dh2e-data.conditions");
        if (!pack) return;

        const index = await pack.getIndex({ fields: ["system.description", "system.slug"] });
        for (const entry of index) {
            const slug = (entry as any).system?.slug
                ?? entry.name?.toLowerCase().replace(/\s+/g, "-")
                ?? "";
            if (!slug) continue;
            conditionCache.set(slug, {
                name: entry.name ?? slug,
                description: (entry as any).system?.description ?? "",
                img: entry.img ?? `systems/dh2e/icons/conditions/${slug}.svg`,
                uuid: `Compendium.dh2e-data.conditions.${entry._id}`,
            });
        }
    } catch (e) {
        console.warn("DH2E | Could not populate condition cache for enrichers", e);
    }
}

/**
 * Enrich `@Condition[slug]{optional label}` into a styled condition badge.
 */
function enrichCondition(
    match: RegExpMatchArray,
    _options: Record<string, unknown>,
): HTMLElement | null {
    const slug = match[1]?.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) return null;

    const customLabel = match[2]?.trim();

    // Try cache (may be empty on first render before ready — that's fine, enrichment re-runs)
    const cached = conditionCache.get(slug);
    const label = customLabel ?? cached?.name ?? slug.split("-").map(
        w => w.charAt(0).toUpperCase() + w.slice(1),
    ).join(" ");

    const a = document.createElement("a");
    a.className = "dh2e-enricher condition-link";
    a.dataset.slug = slug;
    if (cached?.uuid) a.dataset.uuid = cached.uuid;
    if (cached?.description) a.dataset.tooltip = cached.description;
    a.draggable = false;
    a.textContent = label;

    // Lazy-load cache if not ready
    if (!conditionCacheReady) {
        ensureConditionCache();
    }

    return a;
}

/**
 * Enrich `@Check[type|mod:N]{optional label}` into a clickable check link.
 *
 * `type` can be a skill name ("Awareness") or characteristic abbreviation ("wp").
 * Pipe-delimited params: `mod:±N` for difficulty modifier.
 */
function enrichCheck(
    match: RegExpMatchArray,
    _options: Record<string, unknown>,
): HTMLElement | null {
    const raw = match[1]?.trim();
    if (!raw) return null;

    const customLabel = match[2]?.trim();

    // Parse pipe-delimited params
    const parts = raw.split("|").map(p => p.trim());
    const typePart = parts[0];
    let mod = 0;

    for (let i = 1; i < parts.length; i++) {
        const param = parts[i].toLowerCase();
        if (param.startsWith("mod:")) {
            mod = parseInt(param.slice(4), 10) || 0;
        }
    }

    // Determine if this is a skill or characteristic
    const lowerType = typePart.toLowerCase();
    const isCharacteristic = lowerType in CHAR_ABBREV_TO_KEY;
    const isSkill = !isCharacteristic && (typePart in CANONICAL_SKILL_CHARS);

    // Resolve display name
    let displayName: string;
    if (isCharacteristic) {
        const charKey = CHAR_ABBREV_TO_KEY[lowerType];
        const charConfig = (CONFIG as any).DH2E?.characteristics?.[charKey];
        const label = charConfig?.label;
        displayName = label ? ((game as any).i18n?.localize(label) ?? typePart) : typePart;
    } else {
        displayName = typePart;
    }

    // Build label
    const g = game as any;
    let label: string;
    if (customLabel) {
        label = customLabel;
    } else if (mod !== 0) {
        const modStr = mod > 0 ? `+${mod}` : String(mod);
        label = g.i18n?.format("DH2E.Enricher.CheckLabelMod", { name: displayName, mod: modStr })
            ?? `${displayName} Test (${modStr})`;
    } else {
        label = g.i18n?.format("DH2E.Enricher.CheckLabel", { name: displayName })
            ?? `${displayName} Test`;
    }

    const a = document.createElement("a");
    a.className = "dh2e-enricher inline-check";
    a.dataset.action = "inline-check";
    a.dataset.type = typePart;
    if (mod !== 0) a.dataset.mod = String(mod);
    a.draggable = false;
    a.textContent = label;

    return a;
}

/**
 * Register global delegated click handlers for enricher links.
 * Handles clicks in item sheets, journal entries, and other non-chat contexts.
 * Called once from the ready hook.
 */
export function activateEnricherListeners(): void {
    document.body.addEventListener("click", (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const link = target.closest<HTMLAnchorElement>(".dh2e-enricher");
        if (!link) return;

        // Skip if already handled by chat listeners (inside a chat message element)
        if (link.closest("[data-message-id]")) return;

        event.preventDefault();

        if (link.classList.contains("condition-link")) {
            onConditionClick(link);
        } else if (link.dataset.action === "inline-check") {
            onInlineCheckClick(link);
        } else if (link.dataset.action === "inline-damage") {
            onInlineDamageClick(link);
        }
    });
}

/** Open condition sheet from enricher link */
async function onConditionClick(link: HTMLAnchorElement): Promise<void> {
    const uuid = link.dataset.uuid;
    if (uuid) {
        const doc = await fromUuid(uuid);
        if (doc) {
            (doc as any).sheet?.render(true);
            return;
        }
    }

    const slug = link.dataset.slug;
    if (!slug) return;

    const g = game as any;
    const pack = g.packs?.get("dh2e-data.conditions");
    if (!pack) return;

    const index = await pack.getIndex();
    const entry = index.find((e: any) => {
        const name = e.name?.toLowerCase().replace(/\s+/g, "-");
        return name === slug;
    });
    if (entry) {
        const doc = await pack.getDocument(entry._id);
        (doc as any)?.sheet?.render(true);
    }
}

/** Roll check from enricher link */
async function onInlineCheckClick(link: HTMLAnchorElement): Promise<void> {
    const { CheckDH2e } = await import("@check/check.ts");
    const { CANONICAL_SKILL_CHARS: skillChars } = await import("@item/skill/uses.ts");

    const typePart = link.dataset.type;
    if (!typePart) return;

    const g = game as any;
    const actor = g.user?.character
        ?? canvas?.tokens?.controlled?.[0]?.actor
        ?? null;

    if (!actor) {
        ui.notifications?.warn(
            g.i18n?.localize("DH2E.Enricher.NoActor")
                ?? "Select a token or assign a character to roll.",
        );
        return;
    }

    const mod = parseInt(link.dataset.mod ?? "0", 10) || 0;
    const lowerType = typePart.toLowerCase();
    const charAbbrevs = new Set(["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"]);

    if (charAbbrevs.has(lowerType)) {
        const charKey = lowerType as any;
        const charValue = (actor as any).system?.characteristics?.[charKey]?.value
            ?? (actor as any).system?.characteristics?.[charKey]?.base
            ?? 0;
        const charConfig = (CONFIG as any).DH2E?.characteristics?.[charKey];
        const charLabel = charConfig?.label
            ? (g.i18n?.localize(charConfig.label) ?? typePart)
            : typePart;

        await CheckDH2e.roll({
            actor,
            characteristic: charKey,
            baseTarget: charValue + mod,
            label: `${charLabel} Test`,
            domain: `characteristic:${charKey}`,
        });
    } else {
        const skillItem = (actor as any).items?.find(
            (i: Item) => i.type === "skill" && i.name === typePart,
        );

        if (skillItem) {
            const sys = skillItem.skillSystem ?? skillItem.system ?? {};
            await CheckDH2e.roll({
                actor,
                characteristic: sys.linkedCharacteristic ?? "ws",
                baseTarget: (skillItem.totalTarget ?? 0) + mod,
                label: `${skillItem.displayName ?? skillItem.name} Test`,
                domain: `skill:${typePart.toLowerCase().replace(/\s+/g, "-")}`,
                skillDescription: sys.description ?? "",
            });
        } else {
            const linkedChar = skillChars[typePart] ?? "ws";
            const charValue = (actor as any).system?.characteristics?.[linkedChar]?.value
                ?? (actor as any).system?.characteristics?.[linkedChar]?.base
                ?? 0;
            await CheckDH2e.roll({
                actor,
                characteristic: linkedChar,
                baseTarget: charValue + mod,
                label: `${typePart} Test`,
                domain: `skill:${typePart.toLowerCase().replace(/\s+/g, "-")}`,
                untrained: true,
            });
        }
    }
}

/** Roll damage from enricher link */
async function onInlineDamageClick(link: HTMLAnchorElement): Promise<void> {
    const formula = link.dataset.formula;
    if (!formula) return;

    try {
        const roll = new foundry.dice.Roll(formula);
        await roll.evaluate();

        const label = link.textContent ?? formula;
        const speaker = fd.ChatMessage.getSpeaker?.() ?? {};
        await roll.toMessage({
            speaker,
            flavor: `<strong>${label}</strong>`,
        });
    } catch (e) {
        console.error("DH2E | Inline damage roll failed:", e);
        ui.notifications?.error(`Invalid damage formula: ${formula}`);
    }
}

/**
 * Enrich `@Damage[formula]{optional label}` into a clickable damage roll link.
 */
function enrichDamage(
    match: RegExpMatchArray,
    _options: Record<string, unknown>,
): HTMLElement | null {
    const formula = match[1]?.trim();
    if (!formula) return null;

    const customLabel = match[2]?.trim();
    const label = customLabel ?? formula;

    const a = document.createElement("a");
    a.className = "dh2e-enricher inline-damage";
    a.dataset.action = "inline-damage";
    a.dataset.formula = formula;
    a.draggable = false;
    a.textContent = label;

    return a;
}
