import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import {
    loadXPCostData,
    countAptitudeMatches,
    getCharacteristicCost,
    getSkillCost,
    getTalentCost,
    getCharacteristicAptitudes,
    getSkillAptitudes,
} from "./aptitudes.ts";
import { recordTransaction } from "./xp-ledger.ts";
import { appendLog } from "@actor/log.ts";
import { checkPrerequisites, hasEliteAdvance } from "./prerequisites.ts";
import { executeElitePurchase, type EliteAdvanceDef } from "./elite-purchase.ts";
import type { AdvanceOption, XPCostData, XPTransaction } from "./types.ts";
import ShopRoot from "./shop-root.svelte";

const CHAR_KEYS: CharacteristicAbbrev[] = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];

const CHAR_LABELS: Record<string, string> = {
    ws: "Weapon Skill", bs: "Ballistic Skill", s: "Strength", t: "Toughness",
    ag: "Agility", int: "Intelligence", per: "Perception", wp: "Willpower", fel: "Fellowship",
};

const CHAR_ADVANCE_NAMES = ["Simple", "Intermediate", "Trained", "Expert"];
const SKILL_RANK_NAMES = ["Known", "Trained (+10)", "Experienced (+20)", "Veteran (+30)"];

class AdvancementShop extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    /** Cached elite advance definitions */
    static #eliteAdvanceData: EliteAdvanceDef[] = [];
    static #eliteDataLoaded = false;
    /** Map of open shop instances by actor ID for socket callbacks */
    static #instances = new Map<string, AdvancementShop>();

    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-advancement-shop",
        classes: ["dh2e", "dialog", "advancement-shop"],
        position: { width: 700, height: 640 },
        window: { resizable: true, minimizable: true },
    });

    protected override root = ShopRoot;

    #actor: AcolyteDH2e;
    /** Tracks advance keys with pending GM approval */
    #pendingApprovals = new Set<string>();
    /** Cached costs for re-use in approval handler */
    #cachedCosts: XPCostData | null = null;

    constructor(actor: AcolyteDH2e) {
        super({});
        this.#actor = actor;
    }

    override get title(): string {
        return `${this.#actor.name} — Advancement`;
    }

    /** Elite advance definitions — embedded directly in the system */
    static readonly ELITE_ADVANCES: EliteAdvanceDef[] = [
        {
            id: "psyker",
            name: "Psyker",
            cost: 300,
            prerequisites: { characteristics: { wp: 40 }, notEliteAdvance: "untouchable" },
            instant: { aptitudes: ["Psyker"], talents: ["Psy Rating"], unsanctionedCorruption: "1d10+3" },
            description: "The character's mind has been opened to the Warp, granting them terrifying psychic abilities. They gain the Psyker aptitude and Psy Rating 1. Unsanctioned psykers gain 1d10+3 Corruption Points.",
        },
        {
            id: "untouchable",
            name: "Untouchable",
            cost: 300,
            prerequisites: { notEliteAdvance: "psyker" },
            instant: { talents: ["Resistance (Psychic Powers)"] },
            description: "The character is a psychic blank — an anathema to the Warp. They are immune to direct psychic effects and gain Resistance (Psychic Powers).",
        },
        {
            id: "inquisitor",
            name: "Inquisitor",
            cost: 1000,
            prerequisites: { influence: 75 },
            instant: { aptitudes: ["Leadership"], talents: ["Peer (Inquisition)"] },
            description: "The character has been elevated to the rank of Inquisitor. They gain the Leadership aptitude and the Peer (Inquisition) talent.",
        },
    ];

    /** Load elite advance definitions */
    static async #loadEliteAdvances(): Promise<void> {
        if (AdvancementShop.#eliteDataLoaded) return;
        AdvancementShop.#eliteAdvanceData = AdvancementShop.ELITE_ADVANCES;
        AdvancementShop.#eliteDataLoaded = true;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const costs = await loadXPCostData();
        this.#cachedCosts = costs;
        await AdvancementShop.#loadEliteAdvances();
        const options = this.#buildOptions(costs);
        const system = this.#actor.system;

        return {
            ctx: {
                actorName: this.#actor.name,
                xpTotal: system.xp.total,
                xpSpent: system.xp.spent,
                xpAvailable: system.xp.available,
                aptitudes: system.aptitudes ?? [],
                options,
                purchase: (opt: AdvanceOption) => this.#purchase(opt, costs),
                openItem: async (opt: AdvanceOption) => {
                    if (opt.sourceItemId) {
                        this.#actor.items.get(opt.sourceItemId)?.sheet?.render(true);
                    } else if (opt.compendiumUuid) {
                        const item = await fromUuid(opt.compendiumUuid);
                        (item as any)?.sheet?.render(true);
                    }
                },
            },
        };
    }

    #buildOptions(costs: XPCostData): AdvanceOption[] {
        const actor = this.#actor;
        const system = actor.system;
        const charApts = system.aptitudes ?? [];
        const xpAvailable = system.xp.available;
        const options: AdvanceOption[] = [];

        // --- Characteristics ---
        for (const key of CHAR_KEYS) {
            const char = system.characteristics[key];
            const advances = char.advances;
            if (advances >= 4) {
                options.push({
                    category: "characteristic",
                    label: CHAR_LABELS[key],
                    sublabel: "MAX",
                    key,
                    cost: 0,
                    matchCount: 0,
                    aptitudes: getCharacteristicAptitudes(costs, key),
                    currentLevel: advances,
                    nextLevel: advances,
                    maxLevel: 4,
                    affordable: false,
                    alreadyMaxed: true,
                    prereqsMet: true,
                    prereqsUnmet: [],
                });
                continue;
            }
            const aptPair = getCharacteristicAptitudes(costs, key);
            const matchCount = countAptitudeMatches(charApts, aptPair);
            const cost = getCharacteristicCost(costs, advances, matchCount);
            options.push({
                category: "characteristic",
                label: CHAR_LABELS[key],
                sublabel: `${CHAR_ADVANCE_NAMES[advances]} (${advances + 1}${this.#ordinalSuffix(advances + 1)})`,
                key,
                cost,
                matchCount,
                aptitudes: aptPair,
                currentLevel: advances,
                nextLevel: advances + 1,
                maxLevel: 4,
                affordable: xpAvailable >= cost,
                alreadyMaxed: false,
                prereqsMet: true,
                prereqsUnmet: [],
            });
        }

        // --- Skills (embedded on actor) ---
        for (const item of actor.items) {
            if (item.type !== "skill") continue;
            const sys = item.system as any;
            const advancement: number = sys.advancement ?? 0;
            const linkedChar: string = sys.linkedCharacteristic ?? "int";
            const skillApt: string = sys.aptitude ?? "General";
            const spec: string = sys.specialization ?? "";
            const skillName = spec ? `${item.name} (${spec})` : item.name;

            if (advancement >= 4) {
                options.push({
                    category: "skill",
                    label: skillName,
                    sublabel: "MAX",
                    key: item.id,
                    cost: 0,
                    matchCount: 0,
                    aptitudes: getSkillAptitudes(costs, skillApt, linkedChar),
                    currentLevel: advancement,
                    nextLevel: advancement,
                    maxLevel: 4,
                    affordable: false,
                    alreadyMaxed: true,
                    prereqsMet: true,
                    prereqsUnmet: [],
                    sourceItemId: item.id,
                });
                continue;
            }
            const aptPair = getSkillAptitudes(costs, skillApt, linkedChar);
            const matchCount = countAptitudeMatches(charApts, aptPair);
            const cost = getSkillCost(costs, advancement, matchCount);
            options.push({
                category: "skill",
                label: skillName,
                sublabel: `${SKILL_RANK_NAMES[advancement]} (${advancement + 1}${this.#ordinalSuffix(advancement + 1)})`,
                key: item.id,
                cost,
                matchCount,
                aptitudes: aptPair,
                currentLevel: advancement,
                nextLevel: advancement + 1,
                maxLevel: 4,
                affordable: xpAvailable >= cost,
                alreadyMaxed: false,
                prereqsMet: true,
                prereqsUnmet: [],
                sourceItemId: item.id,
            });
        }

        // --- Skills (compendium — not yet on actor) ---
        const ownedSkillKeys = new Set<string>();
        for (const item of actor.items) {
            if (item.type !== "skill") continue;
            const sys = item.system as any;
            const spec = sys.specialization ?? "";
            ownedSkillKeys.add(spec ? `${item.name}|||${spec}` : item.name);
        }

        const skillPack = game.packs?.get("dh2e-data.skills");
        if (skillPack) {
            for (const entry of skillPack.index) {
                const meta = entry as any;
                const sys = meta.system ?? {};
                const spec: string = sys.specialization ?? "";
                const matchKey = spec ? `${meta.name}|||${spec}` : meta.name;
                if (ownedSkillKeys.has(matchKey)) continue;

                const linkedChar: string = sys.linkedCharacteristic ?? "int";
                const skillApt: string = sys.aptitude ?? "General";
                const skillName = spec ? `${meta.name} (${spec})` : meta.name;
                const aptPair = getSkillAptitudes(costs, skillApt, linkedChar);
                const matchCount = countAptitudeMatches(charApts, aptPair);
                const cost = getSkillCost(costs, 0, matchCount);

                options.push({
                    category: "skill",
                    label: skillName,
                    sublabel: "Known (1st)",
                    key: meta._id,
                    cost,
                    matchCount,
                    aptitudes: aptPair,
                    currentLevel: 0,
                    nextLevel: 1,
                    maxLevel: 4,
                    affordable: xpAvailable >= cost,
                    alreadyMaxed: false,
                    prereqsMet: true,
                    prereqsUnmet: [],
                    compendiumUuid: `Compendium.dh2e-data.skills.${meta._id}`,
                });
            }
        }

        // --- Talents (compendium — exclude owned) ---
        const ownedTalentNames = new Set<string>();
        for (const item of actor.items) {
            if (item.type === "talent") ownedTalentNames.add(item.name);
        }

        const talentPack = game.packs?.get("dh2e-data.talents");
        if (talentPack) {
            for (const entry of talentPack.index) {
                const meta = entry as any;
                if (ownedTalentNames.has(meta.name)) continue;

                const sys = meta.system ?? {};
                const tier: number = sys.tier ?? 1;
                const talentApts: string[] = sys.aptitudes ?? [];
                const aptPair: [string, string] = [
                    talentApts[0] ?? "General",
                    talentApts[1] ?? "General",
                ];
                const matchCount = countAptitudeMatches(charApts, aptPair);
                const cost = getTalentCost(costs, tier, matchCount);

                const prereqStr: string = sys.prerequisites ?? "";
                const prereqResult = checkPrerequisites(actor, prereqStr);
                options.push({
                    category: "talent",
                    label: meta.name,
                    sublabel: `Tier ${tier}`,
                    key: meta._id,
                    cost,
                    matchCount,
                    aptitudes: aptPair,
                    currentLevel: 0,
                    nextLevel: 1,
                    maxLevel: 1,
                    affordable: xpAvailable >= cost,
                    alreadyMaxed: false,
                    prerequisites: prereqStr,
                    prereqsMet: prereqResult.met,
                    prereqsUnmet: prereqResult.unmet,
                    compendiumUuid: `Compendium.dh2e-data.talents.${meta._id}`,
                });
            }
        }

        // --- Elite Advances ---
        const ownedElites: string[] = (system as any).eliteAdvances ?? [];
        const requireApproval = game.settings.get(SYSTEM_ID, "requireEliteApproval") as boolean;

        for (const adv of AdvancementShop.#eliteAdvanceData) {
            const alreadyOwned = ownedElites.includes(adv.id);
            if (alreadyOwned) continue;

            // Check prerequisites
            const unmet: string[] = [];
            if (adv.prerequisites.characteristics) {
                for (const [key, min] of Object.entries(adv.prerequisites.characteristics)) {
                    const charKey = key as keyof typeof system.characteristics;
                    if (system.characteristics[charKey]?.value < (min as number)) {
                        const label = CHAR_LABELS[charKey] ?? key.toUpperCase();
                        unmet.push(`${label} ${min}`);
                    }
                }
            }
            if (adv.prerequisites.notEliteAdvance) {
                if (ownedElites.includes(adv.prerequisites.notEliteAdvance)) {
                    unmet.push(`Not ${adv.prerequisites.notEliteAdvance}`);
                }
            }
            if (adv.prerequisites.influence) {
                if ((system as any).influence < adv.prerequisites.influence) {
                    unmet.push(`Influence ${adv.prerequisites.influence}`);
                }
            }

            const optKey = `elite-${adv.id}`;
            options.push({
                category: "elite",
                label: adv.name,
                sublabel: `Elite Advance`,
                key: optKey,
                cost: adv.cost,
                matchCount: 0,
                aptitudes: ["General", "General"],
                currentLevel: 0,
                nextLevel: 1,
                maxLevel: 1,
                affordable: xpAvailable >= adv.cost,
                alreadyMaxed: false,
                prerequisites: unmet.length > 0 ? unmet.join(", ") : undefined,
                prereqsMet: unmet.length === 0,
                prereqsUnmet: unmet,
                needsApproval: requireApproval && !(game as any).user?.isGM,
                pendingApproval: this.#pendingApprovals.has(optKey),
            });
        }

        // --- Psy Rating Advances (if psyker) ---
        if (ownedElites.includes("psyker")) {
            const psyTalent = actor.items.find(
                (i: Item) => i.type === "talent" && i.name.toLowerCase() === "psy rating",
            );
            const currentPR = (psyTalent as any)?.system?.tier ?? 1;
            const maxPR = 10;
            if (currentPR < maxPR) {
                const nextPR = currentPR + 1;
                const prCost = 200 * nextPR;
                options.push({
                    category: "elite",
                    label: `Psy Rating ${nextPR}`,
                    sublabel: `${prCost} XP`,
                    key: `psy-rating-${nextPR}`,
                    cost: prCost,
                    matchCount: 0,
                    aptitudes: ["General", "General"],
                    currentLevel: currentPR,
                    nextLevel: nextPR,
                    maxLevel: maxPR,
                    affordable: xpAvailable >= prCost,
                    alreadyMaxed: false,
                    prereqsMet: true,
                    prereqsUnmet: [],
                    sourceItemId: psyTalent?.id,
                });
            }
        }

        // Sort: characteristics first (by name), then skills (alpha), then talents (tier → name), then elite
        options.sort((a, b) => {
            const catOrder: Record<string, number> = { characteristic: 0, skill: 1, talent: 2, elite: 3 };
            if (catOrder[a.category] !== catOrder[b.category]) {
                return catOrder[a.category] - catOrder[b.category];
            }
            if (a.category === "talent" && b.category === "talent") {
                const tierA = a.sublabel.match(/\d+/)?.[0] ?? "1";
                const tierB = b.sublabel.match(/\d+/)?.[0] ?? "1";
                if (tierA !== tierB) return Number(tierA) - Number(tierB);
            }
            return a.label.localeCompare(b.label);
        });

        return options;
    }

    async #purchase(opt: AdvanceOption, costs: XPCostData): Promise<void> {
        const actor = this.#actor;
        const system = actor.system;

        // Elite advance with approval required — redirect to request flow
        if (opt.needsApproval && !opt.pendingApproval && opt.category === "elite" && opt.key.startsWith("elite-")) {
            this.#requestEliteApproval(opt);
            return;
        }

        if (system.xp.available < opt.cost) {
            ui.notifications.warn("Not enough XP!");
            return;
        }

        const txn: XPTransaction = {
            timestamp: Date.now(),
            category: opt.category,
            label: `${opt.label} — ${opt.sublabel}`,
            cost: opt.cost,
            matchCount: opt.matchCount,
        };

        if (opt.category === "characteristic") {
            const charKey = opt.key as CharacteristicAbbrev;
            await actor.update({
                [`system.characteristics.${charKey}.advances`]: opt.nextLevel,
                "system.xp.spent": system.xp.spent + opt.cost,
            });
        } else if (opt.category === "skill" && opt.sourceItemId) {
            const skillItem = actor.items.get(opt.sourceItemId);
            if (!skillItem) return;
            await skillItem.update({ "system.advancement": opt.nextLevel });
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        } else if (opt.category === "skill" && opt.compendiumUuid) {
            const item = await fromUuid(opt.compendiumUuid);
            if (!item) return;
            const data = (item as any).toObject();
            data.system.advancement = 1;
            await actor.createEmbeddedDocuments("Item", [data]);
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        } else if (opt.category === "talent" && opt.compendiumUuid) {
            const item = await fromUuid(opt.compendiumUuid);
            if (!item) return;
            await actor.createEmbeddedDocuments("Item", [(item as any).toObject()]);
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        } else if (opt.category === "elite" && opt.key.startsWith("elite-")) {
            const advId = opt.key.replace("elite-", "");
            const advDef = AdvancementShop.#eliteAdvanceData.find((a) => a.id === advId);
            if (!advDef) return;
            await executeElitePurchase(actor, advDef, opt.cost);
            ui.notifications.info(`Purchased ${opt.label} for ${opt.cost} XP`);
            this.render();
            return; // executeElitePurchase already records txn + log
        } else if (opt.category === "elite" && opt.key.startsWith("psy-rating-")) {
            if (!opt.sourceItemId) return;
            const psyTalent = actor.items.get(opt.sourceItemId);
            if (!psyTalent) return;
            await psyTalent.update({ "system.tier": opt.nextLevel });
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        }

        await recordTransaction(actor, txn);
        await appendLog(actor, {
            timestamp: txn.timestamp,
            type: "xp-spend",
            label: `${opt.label} — ${opt.sublabel}`,
            amount: -opt.cost,
            who: (game as any).user?.name,
        });
        ui.notifications.info(`Purchased ${opt.label} for ${opt.cost} XP`);
        this.render();
    }

    /** Send an elite advance approval request to the GM via socket */
    #requestEliteApproval(opt: AdvanceOption): void {
        const g = game as any;
        const gmOnline = g.users?.find((u: any) => u.isGM && u.active);
        if (!gmOnline) {
            ui.notifications.warn(game.i18n.localize("DH2E.EliteApproval.GMOffline"));
            return;
        }

        // Mark as pending
        this.#pendingApprovals.add(opt.key);

        // Register this instance for callbacks
        AdvancementShop.#instances.set(this.#actor.id, this);

        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "eliteApprovalRequest",
            payload: {
                actorId: this.#actor.id,
                actorName: this.#actor.name,
                userId: g.user?.id,
                userName: g.user?.name,
                advanceKey: opt.key,
                advanceName: opt.label,
                cost: opt.cost,
                prerequisites: opt.prerequisites,
            },
        });

        this.render();
    }

    /** Handle GM approval — execute the purchase */
    static async handleApprovalGranted(payload: {
        actorId: string;
        advanceKey: string;
        userId: string;
    }): Promise<void> {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        const actor = g.actors?.get(payload.actorId) as AcolyteDH2e | undefined;
        if (!actor) return;

        const advId = payload.advanceKey.replace("elite-", "");
        await AdvancementShop.#loadEliteAdvances();
        const advDef = AdvancementShop.#eliteAdvanceData.find((a) => a.id === advId);
        if (!advDef) return;

        // Check XP still available
        if (actor.system.xp.available < advDef.cost) {
            ui.notifications.warn("Not enough XP!");
            return;
        }

        await executeElitePurchase(actor, advDef, advDef.cost);
        ui.notifications.info(
            game.i18n.format("DH2E.EliteApproval.Approved", {
                name: advDef.name,
                actor: actor.name,
            }),
        );

        // Clean up pending state on open shop
        const shop = AdvancementShop.#instances.get(payload.actorId);
        if (shop) {
            shop.#pendingApprovals.delete(payload.advanceKey);
            shop.render();
        }
    }

    /** Handle GM denial — show notification, clear pending */
    static handleApprovalDenied(payload: {
        actorId: string;
        advanceKey: string;
        advanceName: string;
        userId: string;
        reason?: string;
    }): void {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        if (payload.reason) {
            ui.notifications.warn(
                game.i18n.format("DH2E.EliteApproval.DeniedReason", {
                    name: payload.advanceName,
                    reason: payload.reason,
                }),
            );
        } else {
            ui.notifications.warn(
                game.i18n.format("DH2E.EliteApproval.Denied", { name: payload.advanceName }),
            );
        }

        const shop = AdvancementShop.#instances.get(payload.actorId);
        if (shop) {
            shop.#pendingApprovals.delete(payload.advanceKey);
            shop.render();
        }
    }

    override close(options?: any): Promise<void> {
        AdvancementShop.#instances.delete(this.#actor.id);
        return super.close(options);
    }

    #ordinalSuffix(n: number): string {
        if (n === 1) return "st";
        if (n === 2) return "nd";
        if (n === 3) return "rd";
        return "th";
    }

    /** Factory: open the Advancement Shop for an actor */
    static open(actor: AcolyteDH2e): void {
        new AdvancementShop(actor).render(true);
    }
}

export { AdvancementShop };
