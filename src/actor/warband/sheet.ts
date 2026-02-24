import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { WarbandDH2e } from "./document.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import SheetRoot from "./sheet-root.svelte";

const CHAR_KEYS: CharacteristicAbbrev[] = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];

interface MemberCard {
    actor: AcolyteDH2e;
    uuid: string;
    name: string;
    img: string;
    role: string;
    wounds: { value: number; max: number; pct: number };
    fate: { value: number; max: number };
}

interface CharCell {
    value: number;
    bonus: number;
    isHighest: boolean;
}

interface SkillRow {
    name: string;
    cells: { advancement: number; target: number; isHighest: boolean; trained: boolean }[];
}

/** Warband overview sheet — Svelte-based ApplicationV2 */
class WarbandSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "warband"],
        position: { width: 800, height: 700 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    #activeTab = "overview";
    #dropListenersBound = false;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const actor = this.document as unknown as WarbandDH2e;
        const members = actor.members;

        // Build member cards
        const memberCards: MemberCard[] = members.map(m => {
            const w = m.system.wounds;
            return {
                actor: m,
                uuid: m.uuid,
                name: m.name ?? "Unknown",
                img: m.img ?? "",
                role: m.system.details?.role ?? "",
                wounds: { value: w.value, max: w.max, pct: w.max > 0 ? (w.value / w.max) * 100 : 0 },
                fate: { value: m.system.fate.value, max: m.system.fate.max },
            };
        });

        // Build characteristic comparison
        const charComparison: Record<CharacteristicAbbrev, CharCell[]> = {} as any;
        for (const key of CHAR_KEYS) {
            const cells: CharCell[] = members.map(m => {
                const c = m.system.characteristics[key];
                return { value: c.value, bonus: c.bonus, isHighest: false };
            });
            // Flag highest
            if (cells.length > 0) {
                const maxVal = Math.max(...cells.map(c => c.value));
                for (const cell of cells) {
                    if (cell.value === maxVal && maxVal > 0) cell.isHighest = true;
                }
            }
            charComparison[key] = cells;
        }

        // Build skill comparison
        const skillMap = new Map<string, { advancement: number; target: number; trained: boolean }[]>();
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            for (const item of m.items) {
                if (item.type !== "skill") continue;
                const sys = item.system as any;
                const skillName = item.name ?? "Unknown";
                if (!skillMap.has(skillName)) {
                    // Initialize with empty entries for all prior members
                    skillMap.set(skillName, Array.from({ length: members.length }, () => ({
                        advancement: 0, target: 0, trained: false,
                    })));
                }
                const row = skillMap.get(skillName)!;
                const charKey = (sys.linkedCharacteristic ?? "ws") as CharacteristicAbbrev;
                const charValue = m.system.characteristics[charKey]?.value ?? 0;
                const advBonus = (sys.advancement ?? 0) * 10;
                row[i] = {
                    advancement: sys.advancement ?? 0,
                    target: charValue + advBonus,
                    trained: (sys.advancement ?? 0) > 0,
                };
            }
        }

        // Sort skills alphabetically and flag highest
        const skillNames = [...skillMap.keys()].sort();
        const skillComparison: SkillRow[] = skillNames.map(name => {
            const cells = skillMap.get(name)!;
            const trainedCells = cells.filter(c => c.trained);
            const maxTarget = trainedCells.length > 0 ? Math.max(...trainedCells.map(c => c.target)) : 0;
            return {
                name,
                cells: cells.map(c => ({
                    ...c,
                    isHighest: c.trained && c.target === maxTarget && maxTarget > 0,
                })),
            };
        });

        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                editable: this.isEditable,
                memberCards,
                charKeys: CHAR_KEYS,
                charComparison,
                skillComparison,
                activeTab: this.#activeTab,
                setActiveTab: (tab: string) => { this.#activeTab = tab; },
                removeMember: (uuid: string) => actor.removeMembers(uuid),
                openMemberSheet: (member: AcolyteDH2e) => member.sheet?.render(true),
            },
        };
    }

    protected override _onRender(
        context: Record<string, unknown>,
        options: fa.ApplicationRenderOptions,
    ): void {
        super._onRender(context, options);
        if (this.#dropListenersBound) return;

        const content = this.element?.querySelector(".window-content");
        if (!content) return;

        content.addEventListener("dragover", (e: Event) => {
            e.preventDefault();
            (e as DragEvent).dataTransfer!.dropEffect = "copy";
        });
        content.addEventListener("drop", (e: Event) => {
            e.preventDefault();
            this.#handleDrop(e as DragEvent);
        });
        this.#dropListenersBound = true;
    }

    async #handleDrop(event: DragEvent): Promise<void> {
        if (!this.isEditable) return;

        let data: Record<string, unknown> | null = null;
        const rawData = event.dataTransfer?.getData("text/plain");
        if (rawData) {
            try { data = JSON.parse(rawData); } catch { return; }
        }
        if (!data || data.type !== "Actor") return;

        let droppedActor: any = null;
        if (data.uuid) {
            droppedActor = await fromUuid(data.uuid as string);
        }
        if (!droppedActor || droppedActor.type !== "acolyte") return;

        const warband = this.document as unknown as WarbandDH2e;
        await warband.addMembers(droppedActor);
    }
}

export { WarbandSheetDH2e };
