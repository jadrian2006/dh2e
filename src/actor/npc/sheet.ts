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

    /** Whether native drop listeners have been attached */
    #dropListenersBound = false;

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

        // Resize to smaller window in loot mode
        if (lootMode) {
            this.setPosition({ width: 420, height: 500 });
        }

        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system,
                editable: this.isEditable,
                lootMode,
                compactMode: this.#compactMode,
                setCompactMode: (mode: boolean) => { this.#compactMode = mode; },
                items: {
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
                },
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
