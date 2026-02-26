import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import WizardRoot from "./wizard-root.svelte";
import type { CreationData, HomeworldOption, BackgroundOption, RoleOption, DivinationResult, WizardPurchase } from "./types.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import { recordTransaction } from "../advancement/xp-ledger.ts";
import { appendLog } from "@actor/log.ts";
import { getSetting } from "../ui/settings/settings.ts";
import { getCompendiumTable } from "@util/index.ts";

const DATA_BASE = "modules/dh2e-data/data/creation";
const CHAR_KEYS = new Set<string>(["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"]);
const EQUIPMENT_PACKS = ["dh2e-data.weapons", "dh2e-data.armour", "dh2e-data.gear"];
const ORIGIN_PACKS = {
    homeworlds: "dh2e-data.homeworlds",
    backgrounds: "dh2e-data.backgrounds",
    roles: "dh2e-data.roles",
};

/**
 * Structured divination effects for automated application.
 * For "or" choices, the first option is auto-selected.
 * Narrative-only effects (session triggers, special rules) are omitted — the
 * divination text is always stored in details for reference.
 */
const DIVINATION_EFFECTS: Record<string, {
    characteristics?: Record<string, number>;
    talent?: string;
    skill?: string;
    fate?: number;
}> = {
    "Trust in your fear.":
        { characteristics: { per: 5 } },
    "Humans must die so that humanity can endure.":
        { talent: "Jaded" },
    "The pain of the bullet is ecstasy compared to damnation.":
        { characteristics: { ag: -3 } },
    "Be a boon to your allies and the bane of your enemies.":
        { talent: "Hatred" },
    "The wise learn from the deaths of others.":
        { characteristics: { ag: 3, ws: -3 } },
    "Kill the alien before it can speak its lies.":
        { talent: "Quick Draw" },
    "Truth is subjective.":
        { characteristics: { per: 3 } },
    "Thought begets Heresy.":
        { characteristics: { int: -3 } },
    "Heresy begets Retribution.":
        { characteristics: { fel: 3, t: -3 } },
    "If a job is worth doing, it is worth dying for.":
        { characteristics: { t: 3, fel: -3 } },
    "Violence solves everything.":
        { characteristics: { ws: 3, ag: -3 } },
    "Ignorance is a wisdom of its own.":
        { characteristics: { per: -3 } },
    "Only the insane have strength enough to prosper.":
        { characteristics: { wp: 3 } },
    "A suspicious mind is a healthy mind.":
        { characteristics: { per: 2 } },
    "Suffering is an unrelenting instructor.":
        { characteristics: { t: -3 } },
    "The only true fear is dying without your duty done.":
        { talent: "Resistance (Cold)" },
    "Innocence is an illusion.":
        { talent: "Keen Intuition" },
    "To war is human.":
        { skill: "Dodge" },
    "There is no substitute for zeal.":
        { talent: "Clues from the Crowds" },
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

/** Find an item in a compendium pack by name (case-insensitive) */
async function findInPack(packId: string, name: string): Promise<any | null> {
    const pack = game.packs.get(packId);
    if (!pack) return null;
    const index = await pack.getIndex();
    const lc = name.toLowerCase();
    const entry = index.find((e: any) => e.name.toLowerCase() === lc);
    if (!entry) return null;
    return pack.getDocument(entry._id);
}

/** Search multiple packs for an item by name */
async function findInPacks(packIds: string[], name: string): Promise<any | null> {
    for (const id of packIds) {
        const doc = await findInPack(id, name);
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
 * Loads option data from the dh2e-data module when available.
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

        // Try compendium packs first
        const hwPack = game.packs?.get(ORIGIN_PACKS.homeworlds);
        const bgPack = game.packs?.get(ORIGIN_PACKS.backgrounds);
        const rlPack = game.packs?.get(ORIGIN_PACKS.roles);

        if (hwPack) {
            const docs = await hwPack.getDocuments();
            homeworlds = docs.map((doc: any) => {
                const sys = doc.system ?? {};
                return {
                    name: doc.name,
                    description: sys.description ?? "",
                    characteristicBonuses: sys.characteristicBonuses ?? { positive: [], negative: [] },
                    fate: sys.fate ?? { threshold: 2, blessing: 1 },
                    wounds: parseInt(sys.woundsFormula) || 8,
                    woundsFormula: sys.woundsFormula ?? "8+1d5",
                    aptitude: sys.aptitude ?? "",
                    homeSkill: sys.homeSkill ?? "",
                    bonus: sys.bonus ?? "",
                    bonusDescription: sys.bonusDescription ?? "",
                    _itemData: doc.toObject(),
                } as HomeworldOption;
            });
        }

        if (bgPack) {
            const docs = await bgPack.getDocuments();
            backgrounds = docs.map((doc: any) => {
                const sys = doc.system ?? {};
                return {
                    name: doc.name,
                    description: sys.description ?? "",
                    skills: sys.skills ?? [],
                    talents: sys.talents ?? [],
                    equipment: sys.equipment ?? [],
                    aptitude: sys.aptitude ?? "",
                    bonus: sys.bonus ?? "",
                    bonusDescription: sys.bonusDescription ?? "",
                    _itemData: doc.toObject(),
                } as BackgroundOption;
            });
        }

        if (rlPack) {
            const docs = await rlPack.getDocuments();
            roles = docs.map((doc: any) => {
                const sys = doc.system ?? {};
                return {
                    name: doc.name,
                    description: sys.description ?? "",
                    aptitudes: sys.aptitudes ?? [],
                    talent: sys.talent ?? "",
                    eliteAdvances: sys.eliteAdvances ?? undefined,
                    bonus: sys.bonus ?? "",
                    bonusDescription: sys.bonusDescription ?? "",
                    _itemData: doc.toObject(),
                } as RoleOption;
            });
        }

        // Fall back to JSON files if compendiums not available
        if (homeworlds.length === 0 || backgrounds.length === 0 || roles.length === 0) {
            try {
                const [hwJson, bgJson, rlJson] = await Promise.all([
                    homeworlds.length === 0 ? fu.fetchJsonWithTimeout(`${DATA_BASE}/homeworlds.json`) : Promise.resolve(null),
                    backgrounds.length === 0 ? fu.fetchJsonWithTimeout(`${DATA_BASE}/backgrounds.json`) : Promise.resolve(null),
                    roles.length === 0 ? fu.fetchJsonWithTimeout(`${DATA_BASE}/roles.json`) : Promise.resolve(null),
                ]);
                if (hwJson) homeworlds = hwJson as HomeworldOption[];
                if (bgJson) backgrounds = bgJson as BackgroundOption[];
                if (rlJson) roles = rlJson as RoleOption[];
            } catch {
                // No data available — wizard will show manual input
            }
        }

        // Try compendium table first for divinations
        const divTable = await getCompendiumTable("divinations");
        if (divTable) {
            divinations = [...(divTable as any).results]
                .sort((a: any, b: any) => a.range[0] - b.range[0])
                .map((r: any) => ({
                    roll: r.range as [number, number],
                    text: r.text,
                    effect: r.flags?.dh2e?.effect ?? "",
                }));
        }

        // Fallback to JSON
        if (divinations.length === 0) {
            try {
                divinations = await fu.fetchJsonWithTimeout(`${DATA_BASE}/divinations.json`) as DivinationResult[];
            } catch {
                divinations = [];
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
        const homeworld = state.homeworld as HomeworldOption | null;
        const background = state.background as BackgroundOption | null;
        const role = state.role as RoleOption | null;
        const divination = state.divination as DivinationResult | null;
        const woundsRoll = state.woundsRoll as number | null;
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
            // Influence: handle "inf" bonus/penalty (not a characteristic)
            let influence = 25;
            for (const key of homeworld.characteristicBonuses.positive) {
                if (!CHAR_KEYS.has(key)) { if (key === "inf") influence += 5; }
            }
            for (const key of homeworld.characteristicBonuses.negative) {
                if (!CHAR_KEYS.has(key)) { if (key === "inf") influence -= 5; }
            }
            updates["system.influence"] = influence;

            updates["system.fate.max"] = homeworld.fate.threshold;
            updates["system.fate.value"] = homeworld.fate.threshold;

            // Use rolled wounds if available, otherwise fall back to flat value
            const woundsValue = woundsRoll ?? homeworld.wounds;
            updates["system.wounds.max"] = woundsValue;
            updates["system.wounds.value"] = woundsValue;

            updates["system.details.homeworld"] = homeworld.name;
            if (homeworld.aptitude) aptitudes.push(homeworld.aptitude);

            // Embed origin item
            if (homeworld._itemData) {
                const itemData = { ...homeworld._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }
        }

        // 3. Background — skills, talents, equipment
        if (background) {
            updates["system.details.background"] = background.name;
            if (background.aptitude) aptitudes.push(resolveOr(background.aptitude));

            // Embed origin item
            if (background._itemData) {
                const itemData = { ...background._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }

            // Skills
            for (const raw of background.skills) {
                if (isPickOne(raw)) continue;
                const name = resolveOr(raw);
                if (isPickOne(name)) continue;
                const doc = await findInPack("dh2e-data.skills", name);
                if (doc) {
                    itemsToCreate.push(doc.toObject());
                } else {
                    console.warn(`dh2e | Skill "${name}" not found in compendium`);
                }
            }

            // Talents
            for (const raw of background.talents) {
                const name = resolveOr(raw);
                if (isPickOne(name)) continue;
                const doc = await findInPack("dh2e-data.talents", name);
                if (doc) {
                    itemsToCreate.push(doc.toObject());
                } else {
                    console.warn(`dh2e | Talent "${name}" not found in compendium`);
                }
            }

            // Equipment
            const gearChoices = (state.gearChoices ?? {}) as Record<number, string>;
            for (let i = 0; i < background.equipment.length; i++) {
                const raw = background.equipment[i];
                const resolved = gearChoices[i] ?? resolveOr(raw);
                const { name, quantity } = parseEquipment(resolved);
                const doc = await findInPacks(EQUIPMENT_PACKS, name);
                if (doc) {
                    const obj = doc.toObject();
                    if (quantity > 1 && obj.system?.quantity !== undefined) {
                        obj.system.quantity = quantity;
                    }
                    itemsToCreate.push(obj);
                } else {
                    console.warn(`dh2e | Equipment "${name}" not found in compendium`);
                }
            }
        }

        // 4. Role — aptitudes + talent
        if (role) {
            updates["system.details.role"] = role.name;
            for (const apt of role.aptitudes) aptitudes.push(resolveOr(apt));

            // Embed origin item
            if (role._itemData) {
                const itemData = { ...role._itemData };
                delete (itemData as any)._id;
                itemsToCreate.push(itemData);
            }

            if (role.talent) {
                // Try each "or" option until one is found (handles "Resistance (pick one) or Takedown")
                const options = role.talent.split(/,?\s+or\s+/);
                let found = false;
                for (const opt of options) {
                    const name = opt.trim();
                    if (isPickOne(name)) continue;
                    const resolved = resolveOr(name);
                    const doc = await findInPack("dh2e-data.talents", resolved);
                    if (doc) {
                        itemsToCreate.push(doc.toObject());
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.warn(`dh2e | Role talent "${role.talent}" not found in compendium`);
                }
            }
        }

        // 4b. Elite Advances from role
        if (role?.eliteAdvances?.length) {
            const eliteAdvanceIds: string[] = [];
            for (const advId of role.eliteAdvances) {
                if (advId === "psyker") {
                    // Grant Psyker aptitude
                    aptitudes.push("Psyker");
                    // Grant Psy Rating talent (tier 1)
                    const prDoc = await findInPack("dh2e-data.talents", "Psy Rating");
                    if (prDoc) {
                        const prData = prDoc.toObject();
                        prData.system.tier = 1;
                        itemsToCreate.push(prData);
                    } else {
                        console.warn("dh2e | Psy Rating talent not found in compendium");
                    }
                    eliteAdvanceIds.push("psyker");

                    // Unsanctioned psyker corruption — if background is NOT Adeptus Astra Telepathica
                    const bgName = background?.name ?? "";
                    const isSanctioned = bgName === "Adeptus Astra Telepathica";
                    if (!isSanctioned) {
                        // Roll 1d10+3 corruption and apply during creation
                        const corruptionRoll = new foundry.dice.Roll("1d10+3");
                        await corruptionRoll.evaluate();
                        const corruptionGain = corruptionRoll.total ?? 6;
                        const currentCorruption = (updates["system.corruption"] as number) ?? 0;
                        updates["system.corruption"] = currentCorruption + corruptionGain;

                        // Post a chat message about unsanctioned corruption
                        const speaker = fd.ChatMessage.getSpeaker?.({ actor: this.#actor }) ?? { alias: this.#actor.name };
                        await fd.ChatMessage.create({
                            content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.EliteAdvance.UnsanctionedCorruption", { amount: String(corruptionGain) }) ?? `Unsanctioned psyker — gained ${corruptionGain} Corruption Points!`}</em></div>`,
                            speaker,
                        });
                    }
                }
            }
            if (eliteAdvanceIds.length > 0) {
                updates["system.eliteAdvances"] = eliteAdvanceIds;
            }
        }

        // 5. Divination — text + stat effects + talent/skill grants
        if (divination) {
            updates["system.details.divination"] = divination.text;

            const fx = DIVINATION_EFFECTS[divination.text];
            if (fx) {
                // Characteristic adjustments
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
                    const doc = await findInPack("dh2e-data.talents", fx.talent);
                    if (doc) {
                        itemsToCreate.push(doc.toObject());
                    } else {
                        console.warn(`dh2e | Divination talent "${fx.talent}" not found in compendium`);
                    }
                }

                // Skill grant
                if (fx.skill) {
                    const doc = await findInPack("dh2e-data.skills", fx.skill);
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
                const thronesPack = g.packs?.get("dh2e-data.gear");
                if (thronesPack) {
                    const docs = await thronesPack.getDocuments();
                    const thronesItem = docs.find((d: any) => d.name === "Imperial Thrones");
                    if (thronesItem) {
                        const data = (thronesItem as any).toObject();
                        data.system.quantity = thronesQty;
                        itemsToCreate.push(data);
                    }
                }
            }
        }

        // Create embedded items (origin items, skills, talents, equipment)
        if (itemsToCreate.length > 0) {
            for (const item of itemsToCreate) delete (item as any)._id;
            await this.#actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Pre-load ranged weapons and grant one spare magazine of standard ammo
        {
            const createdWeapons = this.#actor.items.filter((i: any) =>
                i.type === "weapon" && (i.system?.clip?.max ?? 0) > 0,
            );
            const ammoItemsToCreate: Record<string, unknown>[] = [];
            for (const w of createdWeapons) {
                const sys = (w as any).system ?? {};
                const clipMax = sys.clip?.max ?? 0;
                // Pre-load the weapon (set clip.value = clip.max)
                if (sys.clip?.value !== clipMax) {
                    await w.update({ "system.clip.value": clipMax });
                }
                // Grant standard ammo matching the weapon's group
                const wGroup = sys.weaponGroup ?? "";
                if (wGroup) {
                    const ammoPack = game.packs?.get("dh2e-data.ammunition");
                    if (ammoPack) {
                        const ammoIndex = await ammoPack.getIndex();
                        const ammoDocuments = await ammoPack.getDocuments();
                        // Find standard (non-specialty) ammo for this group
                        const stdAmmo = ammoDocuments.find((a: any) => {
                            const as = a.system ?? {};
                            return as.weaponGroup === wGroup && as.damageModifier === 0 && as.penetrationModifier === 0;
                        });
                        if (stdAmmo) {
                            const obj = (stdAmmo as any).toObject();
                            delete obj._id;
                            obj.system.quantity = clipMax; // 1 spare magazine
                            ammoItemsToCreate.push(obj);
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

        ui.notifications.info(`${this.#actor.name} creation complete!`);
        this.close();
    }

    /** Open the wizard for an actor */
    static open(actor: Actor): CreationWizard {
        const wizard = new CreationWizard(actor);
        wizard.render(true);
        return wizard;
    }
}

export { CreationWizard, DIVINATION_EFFECTS, splitOrChoices, parseEquipment, findInPacks };
