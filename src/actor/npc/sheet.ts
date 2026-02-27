import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { getSetting } from "../../ui/settings/settings.ts";
import SheetRoot from "./sheet-root.svelte";

/** NPC sheet — same as Acolyte with GM toggle for compact/full view */
class NpcSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "npc"],
        position: { width: 720, height: 800 },
        window: {
            resizable: true,
        },
    });

    protected override root = SheetRoot;

    /** Track compact mode — initialized from setting, persists across remounts */
    #compactMode: boolean | null = null;

    /** Active tab — persists across Svelte remounts */
    #activeTab: string = "summary";

    /** Whether initial resize for compact mode has been applied */
    #initialResizeDone = false;

    /** Whether native drop listeners have been attached */
    #dropListenersBound = false;

    /** Deferred position — applied in _onRender when the element exists */
    #pendingSize: { width: number; height: number } | null = null;

    override get title(): string {
        return this.document.name;
    }

    /** Players cannot edit defeated NPCs — loot mode is read-only */
    override get isEditable(): boolean {
        const actor = this.document as any;
        if (!game.user?.isGM && actor.system?.defeated === true) return false;
        return super.isEditable;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const actor = this.document as any;
        const system = actor.system;

        // Initialize compact mode from setting on first render
        if (this.#compactMode === null) {
            this.#compactMode = getSetting<boolean>("compactNpcSheet");
        }

        const isGM = game.user?.isGM ?? false;
        const isDefeated = system?.defeated === true;
        const lootMode = !isGM && isDefeated;

        // Compute items before sizing
        const items = {
            weapons: actor.items.filter((i: Item) => i.type === "weapon"),
            armour: actor.items.filter((i: Item) => i.type === "armour"),
            gear: actor.items.filter((i: Item) => i.type === "gear"),
            skills: actor.items.filter((i: Item) => i.type === "skill"),
            talents: actor.items.filter((i: Item) => i.type === "talent"),
            powers: actor.items.filter((i: Item) => i.type === "power"),
            conditions: actor.items.filter((i: Item) => i.type === "condition"),
            traits: actor.items.filter((i: Item) => i.type === "trait"),
            criticalInjuries: actor.items.filter((i: Item) => i.type === "critical-injury"),
            malignancies: actor.items.filter((i: Item) => i.type === "malignancy"),
            mentalDisorders: actor.items.filter((i: Item) => i.type === "mental-disorder"),
            cybernetics: actor.items.filter((i: Item) => i.type === "cybernetic"),
            ammunition: actor.items.filter((i: Item) => i.type === "ammunition"),
        };

        // Compute desired initial size (applied in _onRender when element exists)
        if (!lootMode && !this.#initialResizeDone) {
            this.#initialResizeDone = true;
            if (this.#compactMode) {
                this.#pendingSize = { width: 500, height: 500 };
            } else {
                const totalItems = items.weapons.length + items.armour.length
                    + items.skills.length + items.talents.length
                    + items.traits.length + items.powers.length
                    + items.gear.length + items.cybernetics.length;
                const computed = 320 + Math.max(totalItems, 3) * 28;
                const height = Math.min(800, Math.max(450, computed));
                this.#pendingSize = { width: 720, height };
            }
        } else if (lootMode) {
            this.#pendingSize = { width: 420, height: 500 };
        }

        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system,
                editable: this.isEditable,
                isGM: (game as any).user?.isGM ?? false,
                lootMode,
                compactMode: this.#compactMode,
                activeTab: this.#activeTab,
                setActiveTab: (tab: string) => { this.#activeTab = tab; },
                setCompactMode: (mode: boolean) => {
                    this.#compactMode = mode;
                    if (mode) this.setPosition({ width: 500, height: 500 });
                    else this.setPosition({ width: 720, height: 800 });
                },
                items,
            },
        };
    }

    protected override _onRender(
        context: Record<string, unknown>,
        options: fa.ApplicationRenderOptions,
    ): void {
        super._onRender(context, options);

        // Apply deferred sizing now that the element exists
        if (this.#pendingSize) {
            this.setPosition(this.#pendingSize);
            this.#pendingSize = null;
        }

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
            try {
                data = JSON.parse(rawData);
            } catch {
                return;
            }
        }

        if (!data || data.type !== "Item") return;

        const actor = this.document;

        let item: any = null;
        if (data.uuid) {
            item = await fromUuid(data.uuid as string);
        } else {
            try {
                item = await (Item as any).implementation.fromDropData(data);
            } catch {
                console.warn("DH2E | Failed to resolve dropped item", data);
                return;
            }
        }
        if (!item) return;

        const itemData = item.toObject();
        await actor.createEmbeddedDocuments("Item", [itemData]);
    }
}

export { NpcSheetDH2e };
