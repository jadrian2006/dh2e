import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import WizardRoot from "./wizard-root.svelte";
import type { CreationData, OriginOption, HomeworldOption, BackgroundOption, RoleOption, DivinationResult, WizardPurchase } from "./types.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import { recordTransaction } from "../advancement/xp-ledger.ts";
import { appendLog } from "@actor/log.ts";
import { getSetting } from "../ui/settings/settings.ts";
import { getCompendiumTable } from "@util/index.ts";
import {
    getAllDocumentsOfType,
    findInAllPacks,
    findInMultipleTypes,
    getPacksOfType,
    getCreationDataPaths,
    type PackType,
} from "@util/pack-discovery.ts";
import {
    getCharBonuses,
    getFateConfig,
    getWoundsFormula,
    getCorruptionFormula,
    getAptitudes,
    getGrants,
    getGrantsOfType,
    getEliteAdvances,
    type GrantSource,
} from "./creation-helpers.ts";

const CHAR_KEYS = new Set<string>(["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"]);
const EQUIPMENT_TYPES: PackType[] = ["weapons", "armour", "gear", "cybernetics", "ammunition"];

/** A group of mutually exclusive characteristic choices within a divination. */
interface DivinationChoiceGroup {
    label: string;
    options: { label: string; key: string; delta: number }[];
}

/** Session-triggered divination effect that fires once per session */
interface DivinationSessionEffect {
    type: "corruption-mod" | "insanity-mod" | "fatigue-mod" | "critical-immunity" | "awareness-reroll" | "damage-reaction" | "fate-survival";
    /** +1 or -1 for corruption/insanity/fatigue modifiers */
    modifier?: number;
    /** true = informational reminder only, no Apply button */
    reminderOnly?: boolean;
}

/** Structured divination effect — supports fixed and choice-based modifiers. */
interface DivinationEffect {
    choiceGroups?: DivinationChoiceGroup[];
    characteristics?: Record<string, number>;
    talent?: string;
    skill?: string;
    fate?: number;
    sessionEffect?: DivinationSessionEffect;
}

/**
 * Structured divination effects for automated application.
 * Entries with "or" choices use choiceGroups; the UI presents radio buttons.
 * Narrative-only effects (session triggers, special rules) are omitted — the
 * divination text is always stored in details for reference.
 */
const DIVINATION_EFFECTS: Record<string, DivinationEffect> = {
    "Trust in your fear.":
        { characteristics: { per: 5 } },
    "Humans must die so that humanity can endure.":
        { talent: "Jaded" },
    "The pain of the bullet is ecstasy compared to damnation.":
        { characteristics: { ag: -3 }, sessionEffect: { type: "critical-immunity", reminderOnly: true } },
    "Be a boon to your allies and the bane of your enemies.":
        { talent: "Hatred" },
    "The wise learn from the deaths of others.":
        { choiceGroups: [
            { label: "Increase by 3", options: [
                { label: "Agility", key: "ag", delta: 3 },
                { label: "Intelligence", key: "int", delta: 3 },
            ]},
            { label: "Reduce by 3", options: [
                { label: "Weapon Skill", key: "ws", delta: -3 },
                { label: "Ballistic Skill", key: "bs", delta: -3 },
            ]},
        ]},
    "Kill the alien before it can speak its lies.":
        { talent: "Quick Draw" },
    "Truth is subjective.":
        { characteristics: { per: 3 }, sessionEffect: { type: "corruption-mod", modifier: 1 } },
    "Thought begets Heresy.":
        { characteristics: { int: -3 }, sessionEffect: { type: "corruption-mod", modifier: -1 } },
    "Heresy begets Retribution.":
        { choiceGroups: [
            { label: "Increase by 3", options: [
                { label: "Fellowship", key: "fel", delta: 3 },
                { label: "Strength", key: "s", delta: 3 },
            ]},
            { label: "Reduce by 3", options: [
                { label: "Toughness", key: "t", delta: -3 },
                { label: "Willpower", key: "wp", delta: -3 },
            ]},
        ]},
    "If a job is worth doing, it is worth dying for.":
        { choiceGroups: [
            { label: "Increase by 3", options: [
                { label: "Toughness", key: "t", delta: 3 },
                { label: "Willpower", key: "wp", delta: 3 },
            ]},
            { label: "Reduce by 3", options: [
                { label: "Fellowship", key: "fel", delta: -3 },
                { label: "Strength", key: "s", delta: -3 },
            ]},
        ]},
    "Violence solves everything.":
        { choiceGroups: [
            { label: "Increase by 3", options: [
                { label: "Weapon Skill", key: "ws", delta: 3 },
                { label: "Ballistic Skill", key: "bs", delta: 3 },
            ]},
            { label: "Reduce by 3", options: [
                { label: "Agility", key: "ag", delta: -3 },
                { label: "Intelligence", key: "int", delta: -3 },
            ]},
        ]},
    "Ignorance is a wisdom of its own.":
        { characteristics: { per: -3 }, sessionEffect: { type: "insanity-mod", modifier: -1 } },
    "Only the insane have strength enough to prosper.":
        { characteristics: { wp: 3 }, sessionEffect: { type: "insanity-mod", modifier: 1 } },
    "A suspicious mind is a healthy mind.":
        { characteristics: { per: 2 }, sessionEffect: { type: "awareness-reroll", reminderOnly: true } },
    "Suffering is an unrelenting instructor.":
        { characteristics: { t: -3 }, sessionEffect: { type: "damage-reaction", reminderOnly: true } },
    "The only true fear is dying without your duty done.":
        { talent: "Resistance (Cold)" },
    "Innocence is an illusion.":
        { talent: "Keen Intuition" },
    "To war is human.":
        { skill: "Dodge" },
    "There is no substitute for zeal.":
        { talent: "Clues from the Crowds" },
    "Only in death does duty end.":
        { sessionEffect: { type: "fatigue-mod", modifier: -1 } },
    "Even one who has nothing can still offer his life.":
        { sessionEffect: { type: "fate-survival", reminderOnly: true } },
    "Do not ask why you serve. Only ask how.":
        { fate: 1 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve "X or Y" choices → first option. Handles top-level and inner-paren "or". */
function resolveOr(text: string): string {
    // Top-level split: find first " or " (optionally preceded by comma) outside parens
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "(") depth++;
        else if (text[i] === ")") depth--;
        else if (depth === 0) {
            const rest = text.slice(i);
            const m = rest.match(/^,?\s+or\s+/);
            if (m) {
                text = text.slice(0, i).trim();
                break;
            }
        }
    }
    // Inner-paren: "Weapon Training (Las or Solid Projectile)" → "Weapon Training (Las)"
    text = text.replace(/\(([^)]+)\)/g, (_, inner: string) => {
        const first = inner.split(/,?\s+or\s+/)[0].trim();
        return `(${first})`;
    });
    return text;
}

/** True if the entry is a "pick one" placeholder that requires manual choice */
function isPickOne(text: string): boolean {
    return /\bpick one\b/i.test(text);
}

/**
 * Parse quantity prefix from equipment strings.
 * "3 doses of stimm" → { name: "stimm", quantity: 3 }
 * "12 lho sticks" → { name: "lho sticks", quantity: 12 }
 */
/** Split "X or Y" at top level into options array. Returns single-element array if no "or". */
function splitOrChoices(text: string): string[] {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "(") depth++;
        else if (text[i] === ")") depth--;
        else if (depth === 0) {
            const rest = text.slice(i);
            const m = rest.match(/^,?\s+or\s+/);
            if (m) return [text.slice(0, i).trim(), text.slice(i + m[0].length).trim()];
        }
    }
    return [text];
}

function parseEquipment(text: string): { name: string; quantity: number } {
    const m = text.match(/^(\d+)\s+(?:doses?\s+of\s+|vials?\s+of\s+)?(.+)$/i);
    if (m) return { name: m[2].trim(), quantity: parseInt(m[1]) };
    return { name: text, quantity: 1 };
}

/**
 * Alias map for equipment names that don't exactly match compendium entries.
 * Keys are the lowercase name as it appears in background equipment lists.
 */
const NAME_ALIASES: Record<string, string> = {
    "medi-kit": "medikit",
    "dataslate": "data-slate",
    "glow-globe": "glow-globe/stab-light",
    "lho sticks": "lho-sticks",
    "combat vest": "flak vest",
    "psy focus": "psy-focus",
    "armoured bodyglove": "bodyglove",
    "enforcer light carapace armour": "carapace armour (full)",
};

/** Find an item in compendium packs by name (case-insensitive, with alias support) */
async function findInPack(packId: string, name: string): Promise<any | null> {
    const pack = game.packs.get(packId);
    if (!pack) return null;
    const index = await pack.getIndex();
    const lc = name.toLowerCase();
    const alias = NAME_ALIASES[lc]?.toLowerCase();
    const entry = index.find((e: any) => {
        const n = e.name.toLowerCase();
        return n === lc || (alias && n === alias);
    });
    if (!entry) return null;
    return pack.getDocument(entry._id);
}

/** Search all packs of a given type for an item by name, with alias support */
async function findInPackType(type: PackType, name: string): Promise<any | null> {
    const lc = name.toLowerCase();
    const alias = NAME_ALIASES[lc]?.toLowerCase();

    for (const packId of getPacksOfType(type)) {
        const pack = game.packs.get(packId);
        if (!pack) continue;
        const index = await pack.getIndex();
        const entry = index.find((e: any) => {
            const n = e.name.toLowerCase();
            return n === lc || (alias && n === alias);
        });
        if (entry) return pack.getDocument(entry._id);
    }
    return null;
}

/** Search multiple pack types for an item by name, with alias support */
async function findInPacks(packTypes: PackType[], name: string): Promise<any | null> {
    for (const type of packTypes) {
        const doc = await findInPackType(type, name);
        if (doc) return doc;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Wizard Application
// ---------------------------------------------------------------------------

/**
 * Character creation wizard — multi-step guided or manual creation.
 *
 * Steps: 1) Homeworld → 2) Background → 3) Role → 4) Divination → 5) Characteristics → 6) Review
 * Loads option data from any active dh2e-compatible data modules.
 * Falls back to manual text entry when the module is not installed.
 *
 * All UI state (step, selections) lives inside the Svelte component tree.
 * The wizard class only handles data loading and applying results to the actor.
 */
class CreationWizard extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-creation-wizard",
        classes: ["dh2e", "dialog", "creation-wizard"],
        position: { width: 820, height: 720 },
        window: { resizable: true, minimizable: false },
    });

    protected override root = WizardRoot;

    #actor: Actor;

    /** Cached creation data — fetched once and shared across instances */
    static #dataCache: CreationData | null = null;

    constructor(actor: Actor) {
        super({});
        this.#actor = actor;
    }

    override get title(): string {
        return `Character Creation — ${this.#actor.name}`;
    }

    protected override _onRender(context: Record<string, unknown>, options: fa.ApplicationRenderOptions): void {
        super._onRender(context, options);
        const scale = getSetting<number>("wizardScale");
        if (scale !== 100 && this.element) {
            (this.element as HTMLElement).style.zoom = String(scale / 100);
        }
    }

    /** Load creation data — tries compendium packs first, falls back to JSON */
    static async #loadData(): Promise<CreationData> {
        if (CreationWizard.#dataCache) return CreationWizard.#dataCache;

        let homeworlds: HomeworldOption[] = [];
        let backgrounds: BackgroundOption[] = [];
        let roles: RoleOption[] = [];
        let divinations: DivinationResult[] = [];

        // Try compendium packs first — discover from all dh2e modules
        const hwDocs = await getAllDocumentsOfType("homeworlds");
        const bgDocs = await getAllDocumentsOfType("backgrounds");
        const rlDocs = await getAllDocumentsOfType("roles");

        /** Map a compendium document to a unified OriginOption */
        function toOriginOption(doc: any): OriginOption {
            const sys = doc.system ?? {};
            return {
                name: doc.name,
                description: sys.description ?? "",
                bonus: sys.bonus ?? "",
                bonusDescription: sys.bonusDescription ?? "",
                source: sys.source ?? "",
                rules: sys.rules ?? [],
                _itemData: doc.toObject(),
            };
        }

        if (hwDocs.length > 0) {
            homeworlds = hwDocs.map(toOriginOption);
        }

        if (bgDocs.length > 0) {
            backgrounds = bgDocs.map(toOriginOption);
        }

        if (rlDocs.length > 0) {
            roles = rlDocs.map(toOriginOption);
        }

        // Fall back to JSON files if compendiums not available — scan all dh2e module paths
        if (homeworlds.length === 0 || backgrounds.length === 0 || roles.length === 0) {
            const creationPaths = getCreationDataPaths();
            for (const basePath of creationPaths) {
                try {
                    const [hwJson, bgJson, rlJson] = await Promise.all([
                        homeworlds.length === 0 ? fu.fetchJsonWithTimeout(`${basePath}/homeworlds.json`) : Promise.resolve(null),
                        backgrounds.length === 0 ? fu.fetchJsonWithTimeout(`${basePath}/backgrounds.json`) : Promise.resolve(null),
                        roles.length === 0 ? fu.fetchJsonWithTimeout(`${basePath}/roles.json`) : Promise.resolve(null),
                    ]);
                    if (hwJson) homeworlds = homeworlds.concat(hwJson as HomeworldOption[]);
                    if (bgJson) backgrounds = backgrounds.concat(bgJson as BackgroundOption[]);
                    if (rlJson) roles = roles.concat(rlJson as RoleOption[]);
                } catch {
                    // This module doesn't have creation data — skip
                }
            }
        }

        // Try compendium table first for divinations
        const divTable = await getCompendiumTable("divinations");
        if (divTable) {
            divinations = [...(divTable as any).results]
                .sort((a: any, b: any) => a.range[0] - b.range[0])
                .map((r: any) => ({
                    roll: r.range as [number, number],
                    text: r.name ?? "",
                    effect: r.flags?.dh2e?.effect ?? "",
                }));
        }

        // Fallback to JSON — scan all dh2e module paths
        if (divinations.length === 0) {
            for (const basePath of getCreationDataPaths()) {
                try {
                    const data = await fu.fetchJsonWithTimeout(`${basePath}/divinations.json`) as DivinationResult[];
                    divinations = divinations.concat(data);
                } catch {
                    // This module doesn't have divination data
                }
            }
        }

        homeworlds.sort((a, b) => a.name.localeCompare(b.name));
        backgrounds.sort((a, b) => a.name.localeCompare(b.name));
        roles.sort((a, b) => a.name.localeCompare(b.name));

        CreationWizard.#dataCache = { homeworlds, backgrounds, roles, divinations };
        return CreationWizard.#dataCache;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const data = await CreationWizard.#loadData();
        const charGenMethod = game.settings.get(SYSTEM_ID, "charGenMethod") as string ?? "rolled";
        const startingXP = game.settings.get(SYSTEM_ID, "startingXP") as number ?? 1000;

        const divinationRerolls = game.settings.get(SYSTEM_ID, "divinationRerolls") as number ?? 1;

        return {
            ctx: {
                actor: this.#actor,
                data,
                charGenMethod,
                startingXP,
                divinationRerolls,
                onFinish: (state: Record<string, unknown>) => this.#finish(state),
                onCancel: () => this.close(),
            },
        };
    }

    async #finish(state: Record<string, unknown>): Promise<void> {
        const updates: Record<string, unknown> = {};
        const aptitudes: string[] = [];
        const itemsToCreate: Record<string, unknown>[] = [];

        const characteristics = state.characteristics as Record<CharacteristicAbbrev, number>;
        const homeworld = state.homeworld as OriginOption | null;
        const background = state.background as OriginOption | null;
        const role = state.role as OriginOption | null;
        const divination = state.divination as DivinationResult | null;
        const woundsRoll = state.woundsRoll as number | null;
        const fateRoll = state.fateRoll as number | null;
        const purchases = (state.purchases ?? []) as WizardPurchase[];
        const xpSpent = (state.xpSpent ?? 0) as number;

        // 0. Starting XP from world setting
        const startingXP = game.settings.get(SYSTEM_ID, "startingXP") as number ?? 1000;
        if (startingXP > 0) {
            updates["system.xp.total"] = startingXP;
        }

        // 1. Characteristics — values from Svelte already include homeworld +5/-5
        for (const [key, value] of Object.entries(characteristics)) {
            updates[`system.characteristics.${key}.base`] = value;
        }

        // 2. Homeworld
        if (homeworld) {
            const hwRules = homeworld.rules ?? [];

            // Influence: handle "inf" bonus/penalty (not a characteristic)
            let influence = 25;
            for (const b of getCharBonuses(hwRules)) {
                if (b.characteristic === "inf") influence += b.value;
            }
            updates["system.influence"] = influence;

            // Fate: base threshold + Emperor's Blessing (+1 if d10 roll met target)
            const fateConfig = getFateConfig(hwRules);
            if (fateConfig) {
                const blessed = fateRoll !== null && fateRoll >= fateConfig.blessing;
                const totalFate = fateConfig.threshold + (blessed ? 1 : 0);
                updates["system.fate.max"] = totalFate;
                updates["system.fate.value"] = totalFate;
            }

            // Wounds from formula
            const woundsFormula = getWoundsFormula(hwRules);
            if (woundsRoll !== null) {
                updates["system.wounds.max"] = woundsRoll;
                updates["system.wounds.value"] = woundsRoll;
            } else if (woundsFormula) {
                // Fallback: parse base value from formula (e.g., "9+1d5" → 9)
                const flat = parseInt(woundsFormula) || 8;
                updates["system.wounds.max"] = flat;
                updates["system.wounds.value"] = flat;
            }

            updates["system.details.homeworld"] = homeworld.name;

            // Aptitudes from homeworld
            for (const apt of getAptitudes(hwRules)) {
                if (typeof apt === "string") aptitudes.push(apt);
                else aptitudes.push(resolveOr(apt.join(" or ")));
            }

            // Embed origin item
            if (homeworld._itemData) {
                const itemData = { ...homeworld._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }

            // Process Grant REs from homeworld
            const hwChoices = (state.homeworldChoices ?? {}) as Record<number, string | number>;
            await this.#processGrants(hwRules, hwChoices, itemsToCreate, state);

            // Homeworld corruption (e.g., Daemon World: 1d10+5)
            const corruptionFormula = getCorruptionFormula(hwRules);
            if (corruptionFormula) {
                const corruptionRoll = state.corruptionRoll as number | null;
                if (corruptionRoll !== null) {
                    updates["system.corruption"] = corruptionRoll;
                }
            }
        }

        // 3. Background — skills, talents, equipment (all via Grant REs)
        if (background) {
            const bgRules = background.rules ?? [];
            updates["system.details.background"] = background.name;

            // Aptitudes from background
            for (const apt of getAptitudes(bgRules)) {
                if (typeof apt === "string") aptitudes.push(apt);
                else aptitudes.push(resolveOr(apt.join(" or ")));
            }

            // Embed origin item
            if (background._itemData) {
                const itemData = { ...background._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }

            // Process Grant REs from background
            const bgChoices = (state.backgroundChoices ?? state.gearChoices ?? {}) as Record<number, string | number>;
            await this.#processGrants(bgRules, bgChoices, itemsToCreate, state);
        }

        // 4. Role — aptitudes + talent + elite advances (all via REs)
        if (role) {
            const rlRules = role.rules ?? [];
            updates["system.details.role"] = role.name;

            // Aptitudes from role
            for (const apt of getAptitudes(rlRules)) {
                if (typeof apt === "string") aptitudes.push(apt);
                else aptitudes.push(resolveOr(apt.join(" or ")));
            }

            // Embed origin item
            if (role._itemData) {
                const itemData = { ...role._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }

            // Process Grant REs from role (talents + elite advances)
            const rlChoices = (state.roleChoices ?? {}) as Record<number, string | number>;
            await this.#processGrants(rlRules, rlChoices, itemsToCreate, state);

            // Elite Advances from Grant REs
            const eliteAdvanceIds = getEliteAdvances(rlRules);
            if (eliteAdvanceIds.length > 0) {
                for (const advId of eliteAdvanceIds) {
                    if (advId === "psyker") {
                        // Grant Psyker aptitude
                        aptitudes.push("Psyker");
                        // Grant Psy Rating talent (tier 1)
                        const prDoc = await findInPackType("talents", "Psy Rating");
                        if (prDoc) {
                            const prData = prDoc.toObject();
                            prData.system.tier = 1;
                            itemsToCreate.push(prData);
                        } else {
                            console.warn("dh2e | Psy Rating talent not found in compendium");
                        }

                        // Unsanctioned psyker corruption — if background is NOT Adeptus Astra Telepathica
                        const bgName = background?.name ?? "";
                        const isSanctioned = bgName === "Adeptus Astra Telepathica";
                        if (!isSanctioned) {
                            const corruptionRoll = new foundry.dice.Roll("1d10+3");
                            await corruptionRoll.evaluate();
                            const corruptionGain = corruptionRoll.total ?? 6;
                            const currentCorruption = (updates["system.corruption"] as number) ?? 0;
                            updates["system.corruption"] = currentCorruption + corruptionGain;

                            const speaker = fd.ChatMessage.getSpeaker?.({ actor: this.#actor }) ?? { alias: this.#actor.name };
                            await fd.ChatMessage.create({
                                content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.EliteAdvance.UnsanctionedCorruption", { amount: String(corruptionGain) }) ?? `Unsanctioned psyker — gained ${corruptionGain} Corruption Points!`}</em></div>`,
                                speaker,
                            });
                        }
                    }
                }
                updates["system.eliteAdvances"] = eliteAdvanceIds;
            }
        }

        // 5. Divination — text + stat effects + talent/skill grants
        if (divination) {
            updates["system.details.divination"] = divination.text;

            const fx = DIVINATION_EFFECTS[divination.text];
            if (fx) {
                // Choice-based characteristic adjustments
                const divChoices = (state.divinationChoices ?? {}) as Record<number, string>;
                if (fx.choiceGroups) {
                    for (let gi = 0; gi < fx.choiceGroups.length; gi++) {
                        const group = fx.choiceGroups[gi];
                        const selectedKey = divChoices[gi] ?? group.options[0].key;
                        const opt = group.options.find(o => o.key === selectedKey) ?? group.options[0];
                        const charKey = `system.characteristics.${opt.key}.base`;
                        const current = (updates[charKey] as number)
                            ?? characteristics[opt.key as CharacteristicAbbrev] ?? 25;
                        updates[charKey] = current + opt.delta;
                    }
                }

                // Fixed characteristic adjustments
                if (fx.characteristics) {
                    for (const [key, delta] of Object.entries(fx.characteristics)) {
                        const charKey = `system.characteristics.${key}.base`;
                        const current = (updates[charKey] as number)
                            ?? characteristics[key as CharacteristicAbbrev] ?? 25;
                        updates[charKey] = current + delta;
                    }
                }

                // Fate threshold bonus
                if (fx.fate) {
                    const current = (updates["system.fate.max"] as number) ?? 2;
                    updates["system.fate.max"] = current + fx.fate;
                    updates["system.fate.value"] = updates["system.fate.max"] as number;
                }

                // Talent grant
                if (fx.talent) {
                    const doc = await findInPackType("talents", fx.talent);
                    if (doc) {
                        itemsToCreate.push(doc.toObject());
                    } else {
                        console.warn(`dh2e | Divination talent "${fx.talent}" not found in compendium`);
                    }
                }

                // Skill grant
                if (fx.skill) {
                    const doc = await findInPackType("skills", fx.skill);
                    if (doc) {
                        itemsToCreate.push(doc.toObject());
                    } else {
                        console.warn(`dh2e | Divination skill "${fx.skill}" not found in compendium`);
                    }
                }
            }
        }

        // 6. Collect aptitudes (deduplicate)
        if (aptitudes.length > 0) {
            updates["system.aptitudes"] = [...new Set(aptitudes)];
        }

        // 7. Apply advancement purchases from wizard
        if (purchases.length > 0) {
            updates["system.xp.spent"] = xpSpent;

            for (const p of purchases) {
                if (p.category === "characteristic" && p.nextLevel !== undefined) {
                    updates[`system.characteristics.${p.key}.advances`] = p.nextLevel;
                }
            }
        }

        // Apply flat updates
        await this.#actor.update(updates);

        // Grant starting Imperial Thrones if enabled
        {
            const g = game as any;
            const grantThrones = g.settings?.get(SYSTEM_ID, "grantStartingThrones") ?? true;
            const thronesQty = g.settings?.get(SYSTEM_ID, "startingThrones") ?? 50;
            if (grantThrones && thronesQty > 0) {
                const thronesDoc = await findInPacks(["gear", "treasure"], "Imperial Thrones");
                if (thronesDoc) {
                    const data = thronesDoc.toObject();
                    data.system.quantity = thronesQty;
                    itemsToCreate.push(data);
                }
            }
        }

        // Create embedded items (origin items, skills, talents, equipment)
        if (itemsToCreate.length > 0) {
            for (const item of itemsToCreate) delete (item as any)._id;
            await this.#actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Pre-load ranged weapons and grant 2 spare magazines (or loose rounds for individual-loaders)
        {
            const STANDARD_AMMO: Record<string, string> = {
                sp: "Solid Rounds",
                las: "Charge Pack",
                bolt: "Bolt Shells",
                flame: "Promethium",
                melta: "Melta Fuel",
                plasma: "Plasma",
                shotgun: "Shotgun Shells",
                launcher: "Frag Grenades (Launcher)",
            };

            const createdWeapons = this.#actor.items.filter((i: any) =>
                i.type === "weapon" && (i.system?.magazine?.max ?? 0) > 0,
            );
            const ammoItemsToCreate: Record<string, unknown>[] = [];

            for (const w of createdWeapons) {
                const sys = (w as any).system ?? {};
                const magMax = sys.magazine?.max ?? 0;
                const wGroup = sys.weaponGroup ?? "";
                const loadType = sys.loadType ?? "magazine";
                const stdAmmoName = STANDARD_AMMO[wGroup] ?? "Rounds";

                // Pre-load the weapon
                if (sys.magazine?.value !== magMax) {
                    await w.update({
                        "system.magazine.value": magMax,
                        "system.loadedRounds": [{ name: stdAmmoName, count: magMax }],
                    });
                }

                if (loadType === "individual") {
                    // Individual-loading weapons: grant 3× magazine.max loose rounds
                    if (stdAmmoName !== "Rounds") {
                        const stdAmmo = await findInPackType("ammunition", stdAmmoName);
                        if (stdAmmo) {
                            const obj = stdAmmo.toObject();
                            delete obj._id;
                            obj.system.quantity = magMax * 3;
                            ammoItemsToCreate.push(obj);
                        }
                    }
                } else {
                    // Magazine-type weapons: grant 2 spare pre-loaded magazines
                    const ammoDocuments = await getAllDocumentsOfType("ammunition");
                    if (ammoDocuments.length > 0) {
                        // Find matching magazine (forWeapon === weapon name)
                        const magTemplate = ammoDocuments.find((a: any) => {
                            const as = a.system ?? {};
                            return (as.capacity ?? 0) > 0 && (as.forWeapon === w.name);
                        });
                        if (magTemplate) {
                            for (let n = 0; n < 1; n++) {
                                const obj = (magTemplate as any).toObject();
                                delete obj._id;
                                obj.system.loadedRounds = [{ name: stdAmmoName, count: obj.system.capacity }];
                                ammoItemsToCreate.push(obj);
                            }
                        } else if (stdAmmoName !== "Rounds") {
                            // Fallback: grant loose rounds by name if no magazine template found
                            const stdAmmo = await findInPackType("ammunition", stdAmmoName);
                            if (stdAmmo) {
                                const obj = stdAmmo.toObject();
                                delete obj._id;
                                obj.system.quantity = magMax * 2;
                                ammoItemsToCreate.push(obj);
                            }
                        }
                    }
                }
            }
            if (ammoItemsToCreate.length > 0) {
                await this.#actor.createEmbeddedDocuments("Item", ammoItemsToCreate);
            }
        }

        // Apply skill/talent purchases that need compendium items
        for (const p of purchases) {
            if (p.category === "skill" && p.compendiumUuid) {
                const item = await fromUuid(p.compendiumUuid);
                if (!item) continue;
                const data = (item as any).toObject();
                data.system.advancement = p.nextLevel ?? 1;
                await this.#actor.createEmbeddedDocuments("Item", [data]);
            } else if (p.category === "talent" && p.compendiumUuid) {
                const item = await fromUuid(p.compendiumUuid);
                if (!item) continue;
                await this.#actor.createEmbeddedDocuments("Item", [(item as any).toObject()]);
            }
        }

        // Record XP transactions for purchases
        for (const p of purchases) {
            await recordTransaction(this.#actor, {
                timestamp: Date.now(),
                category: p.category,
                label: `${p.label} — ${p.sublabel}`,
                cost: p.cost,
                matchCount: 0,
            });
            await appendLog(this.#actor, {
                timestamp: Date.now(),
                type: "xp-spend",
                label: `${p.label} — ${p.sublabel}`,
                amount: -p.cost,
                who: "Character Creation",
            });
        }

        // Register servo-skull companion if created during chargen
        const pendingCompanionId = (state as any)._pendingCompanionId;
        if (pendingCompanionId) {
            const g = game as any;
            const npcActor = g.actors?.get(pendingCompanionId);
            if (npcActor) {
                try {
                    await (this.#actor as any).addCompanion(npcActor, "follow");
                    console.log(`dh2e | Registered ${npcActor.name} as companion of ${this.#actor.name}`);
                } catch (e) {
                    console.error("dh2e | Failed to register companion:", e);
                }
            } else {
                console.warn(`dh2e | Pending companion actor ${pendingCompanionId} not found in game.actors`);
            }
        }

        ui.notifications.info(`${this.#actor.name} creation complete!`);
        this.close();
    }

    /**
     * Process Grant REs from an origin item's rules array.
     * Looks up items in compendiums and adds them to itemsToCreate.
     */
    async #processGrants(
        rules: Record<string, unknown>[],
        choices: Record<number, string | number>,
        itemsToCreate: Record<string, unknown>[],
        state: Record<string, unknown>,
    ): Promise<void> {
        const grants = getGrants(rules as any) as GrantSource[];
        // Build index for choices — keyed by position of Grant REs with options
        let choiceIdx = 0;
        for (const grant of grants) {
            const idx = choiceIdx++;
            const hasOpts = (grant.options && grant.options.length > 1) ||
                            (grant.optionSets && grant.optionSets.length > 1);

            // Skip elite advances — handled separately
            if (grant.type === "eliteAdvance") continue;

            // Companion grants — create NPC actor
            if (grant.type === "companion") {
                const companionName = grant.name ?? "";
                if (!companionName) continue;
                try {
                    const npcPackIds = getPacksOfType("npcs");
                    let skullEntry: any = null;
                    let npcPack: any = null;
                    for (const pid of npcPackIds) {
                        npcPack = game.packs.get(pid);
                        if (!npcPack) continue;
                        const npcIndex = await npcPack.getIndex();
                        skullEntry = npcIndex.find((e: any) =>
                            e.name.toLowerCase().includes(companionName.toLowerCase().replace(/monotask\s+/i, "")),
                        );
                        if (skullEntry) break;
                    }
                    if (skullEntry && npcPack) {
                        const skullDoc = await npcPack.getDocument(skullEntry._id);
                        if (skullDoc) {
                            const skullData = (skullDoc as any).toObject();
                            delete skullData._id;
                            skullData.name = `${this.#actor.name}'s ${companionName}`;
                            const createdActors = await (Actor as any).createDocuments([skullData]);
                            if (createdActors?.[0]) {
                                (state as any)._pendingCompanionId = createdActors[0].id;
                                console.log(`dh2e | Created companion: ${skullData.name}`);
                            }
                        }
                    } else {
                        console.warn(`dh2e | Companion "${companionName}" not found in NPC compendium`);
                    }
                } catch (e) {
                    console.warn("dh2e | Failed to create companion from chargen:", e);
                }
                continue;
            }

            // Determine the resolved item name(s) to grant
            let itemsToGrant: Array<{ name: string; type: string }> = [];

            if (grant.optionSets && grant.optionSets.length > 0) {
                // Multi-item choice — pick a set
                const setIdx = hasOpts ? (choices[idx] as number ?? 0) : 0;
                const chosen = grant.optionSets[setIdx] ?? grant.optionSets[0];
                // If the chosen set is a companion, handle it
                for (const item of chosen.items) {
                    if (item.type === "companion") {
                        // Recursively handle companion from optionSet
                        const companionName = item.name;
                        try {
                            const npcPackIds = getPacksOfType("npcs");
                            let entry: any = null;
                            let pack: any = null;
                            for (const pid of npcPackIds) {
                                pack = game.packs.get(pid);
                                if (!pack) continue;
                                const index = await pack.getIndex();
                                entry = index.find((e: any) =>
                                    e.name.toLowerCase().includes(companionName.toLowerCase().replace(/monotask\s+/i, "")),
                                );
                                if (entry) break;
                            }
                            if (entry && pack) {
                                const doc = await pack.getDocument(entry._id);
                                if (doc) {
                                    const data = (doc as any).toObject();
                                    delete data._id;
                                    data.name = `${this.#actor.name}'s ${companionName}`;
                                    const created = await (Actor as any).createDocuments([data]);
                                    if (created?.[0]) {
                                        (state as any)._pendingCompanionId = created[0].id;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("dh2e | Failed to create companion from optionSet:", e);
                        }
                    } else {
                        itemsToGrant.push({ name: item.name, type: item.type });
                    }
                }
            } else if (grant.options && grant.options.length > 1) {
                // Simple choice — pick one
                const chosenName = hasOpts ? (choices[idx] as string ?? grant.options[0]) : grant.options[0];
                itemsToGrant.push({ name: chosenName, type: grant.type });
            } else if (grant.name) {
                // Fixed single item
                if (grant.pick && isPickOne(grant.name)) continue;
                itemsToGrant.push({ name: grant.name, type: grant.type });
            }

            // Look up and add each item
            for (const { name, type } of itemsToGrant) {
                if (isPickOne(name)) continue;

                // Map grant type to pack type for lookup
                const packType = type === "talent" ? "talents"
                    : type === "skill" ? "skills"
                    : type === "trait" ? "traits"
                    : type === "weapon" ? "weapons"
                    : type === "armour" ? "armour"
                    : type === "gear" ? "gear"
                    : type === "cybernetic" ? "cybernetics"
                    : null;

                if (!packType) {
                    console.warn(`dh2e | Unknown grant type "${type}" for "${name}"`);
                    continue;
                }

                const doc = await findInPackType(packType as PackType, name);
                if (!doc) {
                    // Try across all equipment types as fallback
                    const fallback = await findInPacks(EQUIPMENT_TYPES, name);
                    if (fallback) {
                        const obj = fallback.toObject();
                        this.#applyGrantModifiers(obj, grant);
                        itemsToCreate.push(obj);
                    } else {
                        console.warn(`dh2e | Grant item "${name}" (${type}) not found in compendium`);
                    }
                    continue;
                }

                const obj = doc.toObject();
                this.#applyGrantModifiers(obj, grant);
                itemsToCreate.push(obj);
            }
        }
    }

    /** Apply modifiers from a Grant RE to a compendium item object */
    #applyGrantModifiers(obj: any, grant: GrantSource): void {
        // Skill advancement
        if (grant.type === "skill") {
            obj.system.advancement = grant.advancement ?? 1;
        }
        // Trait rating
        if (grant.type === "trait" && grant.rating) {
            obj.system.rating = grant.rating;
            obj.system.hasRating = true;
        }
        // Quantity
        if (grant.quantity && grant.quantity > 1 && obj.system?.quantity !== undefined) {
            obj.system.quantity = grant.quantity;
        }
        // Equipped flag
        if (grant.equipped && (obj.type === "weapon" || obj.type === "armour")) {
            obj.system.equipped = true;
        }
        // Cybernetic installed flag
        if (grant.type === "cybernetic" && grant.installed) {
            obj.system.installed = true;
            // Set maintenance date so it doesn't start in total failure
            const warband = (game as any).dh2e?.warband;
            const warbandDate = warband?.system?.chronicle?.currentDate ?? null;
            if (warbandDate) {
                obj.system.lastMaintenanceDate = warbandDate;
            }
        }
    }

    /** Open the wizard for an actor */
    static open(actor: Actor): CreationWizard {
        const wizard = new CreationWizard(actor);
        wizard.render(true);
        return wizard;
    }
}

export { CreationWizard, DIVINATION_EFFECTS, splitOrChoices, parseEquipment, findInPacks };
export type { DivinationEffect, DivinationChoiceGroup, DivinationSessionEffect };
