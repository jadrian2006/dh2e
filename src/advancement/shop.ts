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
import { checkPrerequisites } from "./prerequisites.ts";
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
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-advancement-shop",
        classes: ["dh2e", "dialog", "advancement-shop"],
        position: { width: 700, height: 640 },
        window: { resizable: true, minimizable: true },
    });

    protected override root = ShopRoot;

    #actor: AcolyteDH2e;

    constructor(actor: AcolyteDH2e) {
        super({});
        this.#actor = actor;
    }

    override get title(): string {
        return `${this.#actor.name} — Advancement`;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const costs = await loadXPCostData();
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

        // Sort: characteristics first (by name), then skills (alpha), then talents (tier → name)
        options.sort((a, b) => {
            const catOrder = { characteristic: 0, skill: 1, talent: 2 };
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
            // Advance existing embedded skill
            const skillItem = actor.items.get(opt.sourceItemId);
            if (!skillItem) return;
            await skillItem.update({ "system.advancement": opt.nextLevel });
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        } else if (opt.category === "skill" && opt.compendiumUuid) {
            // Add new skill from compendium
            const item = await fromUuid(opt.compendiumUuid);
            if (!item) return;
            const data = (item as any).toObject();
            data.system.advancement = 1;
            await actor.createEmbeddedDocuments("Item", [data]);
            await actor.update({ "system.xp.spent": system.xp.spent + opt.cost });
        } else if (opt.category === "talent" && opt.compendiumUuid) {
            // Add talent from compendium
            const item = await fromUuid(opt.compendiumUuid);
            if (!item) return;
            await actor.createEmbeddedDocuments("Item", [(item as any).toObject()]);
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
