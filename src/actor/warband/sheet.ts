import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { getSetting } from "../../ui/settings/settings.ts";
import type { WarbandDH2e } from "./document.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { ObjectiveDH2e } from "@item/objective/document.ts";
import type { PendingRequisition, ChronicleEntry, ObjectiveDeadline, ReinforcementEntry } from "./data.ts";
import { ImperialDateUtil } from "../../integrations/imperial-calendar/imperial-date.ts";
import SheetRoot from "./sheet-root.svelte";

/** Item types that can be stored in warband inventory */
const INVENTORY_TYPES = new Set(["weapon", "armour", "gear", "ammunition", "cybernetic"]);

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

        // Inquisitor data
        const inquisitor = actor.inquisitor;

        // Objectives (embedded items of type "objective")
        const objectives = actor.items.filter((i: Item) => i.type === "objective");

        // Permission: GM or Inquisitor controller can assign objectives
        const g = game as any;
        const isGM = g.user?.isGM ?? false;
        const canAssignObjectives = isGM || actor.isInquisitorController();

        // Compute inventory editing permission based on setting
        const accessSetting = getSetting<string>("warbandInventoryAccess");
        let canEditInventory = false;
        if (accessSetting === "all") {
            canEditInventory = true;
        } else if (accessSetting === "inquisitorGM") {
            canEditInventory = isGM || actor.isInquisitorController();
        } else {
            canEditInventory = isGM;
        }

        // Inventory items grouped by type
        const inventoryItems: Record<string, any[]> = {
            weapons: [],
            armour: [],
            gear: [],
            ammunition: [],
            cybernetics: [],
        };
        for (const item of actor.items) {
            if (item.type === "weapon") inventoryItems.weapons.push(item);
            else if (item.type === "armour") inventoryItems.armour.push(item);
            else if (item.type === "gear") inventoryItems.gear.push(item);
            else if (item.type === "ammunition") inventoryItems.ammunition.push(item);
            else if (item.type === "cybernetic") inventoryItems.cybernetics.push(item);
        }

        // Pending requisitions
        const pendingRequisitions = (actor.system?.pendingRequisitions ?? []) as PendingRequisition[];
        const now = Date.now();
        const pendingItems = pendingRequisitions
            .filter((r: PendingRequisition) => r.status !== "delivered")
            .map((r: PendingRequisition) => ({
                ...r,
                timeRemaining: r.readyAt > 0 && r.readyAt > now
                    ? r.readyAt - now
                    : 0,
            }));

        // Chronicle data
        const chronicleSrc = (actor as any).system?.chronicle ?? {};
        const currentDate = chronicleSrc.currentDate;
        const chronicleEntries: ChronicleEntry[] = chronicleSrc.entries ?? [];
        const chronicleDeadlines: ObjectiveDeadline[] = chronicleSrc.deadlines ?? [];

        const chronicle = {
            formattedDate: currentDate ? ImperialDateUtil.format(currentDate) : "0.000.815.M41",
            entries: chronicleEntries
                .sort((a: ChronicleEntry, b: ChronicleEntry) => b.timestamp - a.timestamp)
                .map((e: ChronicleEntry) => ({
                    ...e,
                    formattedDate: ImperialDateUtil.format(e.date),
                })),
            deadlines: chronicleDeadlines.map((d: ObjectiveDeadline) => ({
                ...d,
                formattedDeadline: ImperialDateUtil.format(d.deadline),
                daysRemaining: currentDate ? ImperialDateUtil.daysRemaining(currentDate, d.deadline) : 0,
                overdue: currentDate ? ImperialDateUtil.isOverdue(currentDate, d.deadline) : false,
            })),
        };

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
                // Inquisitor
                inquisitor,
                removeInquisitor: () => actor.removeInquisitor(),
                openInquisitorSheet: () => inquisitor?.sheet?.render(true),
                // Objectives
                objectives,
                canAssignObjectives,
                addObjective: () => this.#openAssignDialog(),
                changeObjectiveStatus: (obj: any, status: string) => this.#changeObjectiveStatus(obj, status),
                deleteObjective: (obj: any) => this.#deleteObjective(obj),
                openObjective: (obj: any) => obj.sheet?.render(true),
                // Inventory
                canEditInventory,
                inventoryItems,
                assignItemTo: (item: any, memberUuid: string) => this.#assignItemTo(item, memberUuid),
                deleteItem: (item: any) => this.#deleteItem(item),
                openItem: (item: any) => item.sheet?.render(true),
                // Pending requisitions
                isGM,
                pendingItems,
                deliverRequisition: (id: string, target: "player" | "warband") =>
                    (actor as any).deliverRequisition(id, target),
                // Reinforcements
                reinforcementCards: (actor.system?.resolvedReinforcements ?? []).map((rc: any) => ({
                    actorId: rc.actorId,
                    name: rc.actor?.name ?? rc.name ?? "Unknown",
                    img: rc.actor?.img ?? "",
                    controllerName: rc.controllerName ?? "",
                    notes: rc.notes ?? "",
                })),
                assignRCController: (actorId: string, userId: string) =>
                    (actor as any).assignRCController(actorId, userId),
                removeReinforcement: (actorId: string) =>
                    (actor as any).removeReinforcement(actorId),
                // Chronicle
                chronicle,
                onAdvanceDay: (days: number) => actor.advanceImperialDate(days),
                onSetDate: () => this.#showSetDateDialog(),
                onAddEntry: () => this.#addChronicleEntry(),
                onEditEntry: (id: string) => this.#editChronicleEntry(id),
                onDeleteEntry: (id: string) => actor.removeChronicleEntry(id),
                onSetDeadline: () => this.#setDeadline(),
                onRemoveDeadline: (objId: string) => actor.removeObjectiveDeadline(objId),
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
        if (!data) return;

        const warband = this.document as unknown as WarbandDH2e;

        // Handle Item drops — add to warband inventory
        if (data.type === "Item") {
            let droppedItem: any = null;
            if (data.uuid) {
                droppedItem = await fromUuid(data.uuid as string);
            }
            if (!droppedItem || !INVENTORY_TYPES.has(droppedItem.type)) return;

            // Check we're not on the inquisitor section
            const target = event.target as HTMLElement;
            if (target?.closest?.("[data-drop-target='inquisitor']")) return;

            // Create the item as an embedded document on the warband
            const itemData = droppedItem.toObject();
            await warband.createEmbeddedDocuments("Item", [itemData]);
            return;
        }

        // Handle Actor drops
        if (data.type !== "Actor") return;

        let droppedActor: any = null;
        if (data.uuid) {
            droppedActor = await fromUuid(data.uuid as string);
        }
        if (!droppedActor) return;

        // Check if dropped on the inquisitor section
        const target = event.target as HTMLElement;
        const inqSection = target?.closest?.("[data-drop-target='inquisitor']");
        if (inqSection) {
            if (droppedActor.type === "acolyte" || droppedActor.type === "npc") {
                await warband.setInquisitor(droppedActor);
                return;
            }
        }

        // Check if dropped on the reinforcements section
        const rcSection = target?.closest?.("[data-drop-target='reinforcements']");
        if (rcSection) {
            if (droppedActor.type === "npc") {
                await warband.addReinforcement(droppedActor);
                return;
            }
        }

        // Default: add as member (acolyte only)
        if (droppedActor.type !== "acolyte") return;
        await warband.addMembers(droppedActor);
    }

    async #openAssignDialog(): Promise<void> {
        const { ObjectiveAssignDialog } = await import("./objective-assign-dialog.ts");
        ObjectiveAssignDialog.open(this.document as unknown as WarbandDH2e);
    }

    async #changeObjectiveStatus(obj: any, status: string): Promise<void> {
        const objective = obj as ObjectiveDH2e;
        if (status === "completed") await objective.complete();
        else if (status === "failed") await objective.fail();
        else if (status === "active") await objective.reactivate();
    }

    async #deleteObjective(obj: any): Promise<void> {
        const warband = this.document as unknown as WarbandDH2e;
        await warband.deleteEmbeddedDocuments("Item", [obj.id]);
    }

    /** Transfer an item from warband inventory to a member actor */
    async #assignItemTo(item: any, memberUuid: string): Promise<void> {
        const targetActor = fromUuidSync(memberUuid) as any;
        if (!targetActor) return;

        const itemData = item.toObject();
        await targetActor.createEmbeddedDocuments("Item", [itemData]);

        const warband = this.document as unknown as WarbandDH2e;
        await warband.deleteEmbeddedDocuments("Item", [item.id]);
    }

    /** Delete an item from warband inventory */
    async #deleteItem(item: any): Promise<void> {
        const warband = this.document as unknown as WarbandDH2e;
        await warband.deleteEmbeddedDocuments("Item", [item.id]);
    }

    /** Show set-date dialog */
    async #showSetDateDialog(): Promise<void> {
        const warband = this.document as unknown as WarbandDH2e;
        const currentDate = (warband as any).system?.chronicle?.currentDate;
        if (!currentDate) return;

        const result = await new Promise<{ check: number; year: number; day: number; millennium: number } | null>((resolve) => {
            new fa.api.DialogV2({
                window: { title: game.i18n.localize("DH2E.Chronicle.SetDate"), icon: "fa-solid fa-calendar" },
                content: `
                    <form class="dh2e" style="display:flex;flex-direction:column;gap:8px;padding:8px 0;">
                        <div class="form-group" style="display:flex;gap:8px;">
                            <div style="flex:1;">
                                <label>Check (0-9)</label>
                                <input type="number" name="check" value="${currentDate.check}" min="0" max="9" />
                            </div>
                            <div style="flex:1;">
                                <label>Day (1-365)</label>
                                <input type="number" name="day" value="${currentDate.day}" min="1" max="365" />
                            </div>
                        </div>
                        <div class="form-group" style="display:flex;gap:8px;">
                            <div style="flex:1;">
                                <label>Year (1-999)</label>
                                <input type="number" name="year" value="${currentDate.year}" min="1" max="999" />
                            </div>
                            <div style="flex:1;">
                                <label>Millennium</label>
                                <input type="number" name="millennium" value="${currentDate.millennium}" min="1" max="99" />
                            </div>
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        action: "set",
                        label: game.i18n.localize("DH2E.Chronicle.SetDate"),
                        icon: "fa-solid fa-check",
                        default: true,
                        callback: (_event: any, _button: any, dialog: HTMLElement) => {
                            const form = dialog.querySelector("form");
                            if (!form) { resolve(null); return; }
                            const fd = new FormData(form);
                            resolve({
                                check: Math.max(0, Math.min(9, parseInt(fd.get("check") as string) || 0)),
                                year: Math.max(1, Math.min(999, parseInt(fd.get("year") as string) || 815)),
                                day: Math.max(1, Math.min(365, parseInt(fd.get("day") as string) || 1)),
                                millennium: Math.max(1, parseInt(fd.get("millennium") as string) || 41),
                            });
                        },
                    },
                    { action: "cancel", label: game.i18n.localize("DH2E.Roll.Dialog.Cancel"), callback: () => resolve(null) },
                ],
                position: { width: 380 },
            }).render(true);
        });

        if (result) {
            await warband.setImperialDate(result);
        }
    }

    /** Add a chronicle entry via dialog */
    async #addChronicleEntry(): Promise<void> {
        const { ChronicleEntryDialog } = await import("./chronicle-entry-dialog.ts");
        await ChronicleEntryDialog.create(this.document as unknown as WarbandDH2e);
    }

    /** Edit a chronicle entry via dialog */
    async #editChronicleEntry(entryId: string): Promise<void> {
        const { ChronicleEntryDialog } = await import("./chronicle-entry-dialog.ts");
        await ChronicleEntryDialog.edit(this.document as unknown as WarbandDH2e, entryId);
    }

    /** Set a deadline on an objective */
    async #setDeadline(): Promise<void> {
        const { DeadlineDialog } = await import("./deadline-dialog.ts");
        await DeadlineDialog.open(this.document as unknown as WarbandDH2e);
    }

}

export { WarbandSheetDH2e };
