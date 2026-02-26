import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { getSetting } from "../ui/settings/settings.ts";
import LootCorpseRoot from "./loot-corpse-root.svelte";

interface LootableItem {
    id: string;
    name: string;
    img: string;
    type: string;
    craftsmanship: string;
    quantity: number;
    equipped: boolean;
}

/**
 * Dialog for looting items from a defeated NPC.
 * Triggered from token context menu or NPC sheet header.
 */
class LootCorpseDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-loot-corpse",
        classes: ["dh2e", "dialog", "loot-corpse-dialog"],
        position: { width: 420, height: "auto" as const },
        window: { resizable: true, minimizable: false },
    });

    protected override root = LootCorpseRoot;

    #npc: Actor;

    constructor(npc: Actor, options?: Partial<ApplicationConfiguration>) {
        super(options ?? {});
        this.#npc = npc;
    }

    override get title(): string {
        return `${game.i18n.localize("DH2E.Loot.LootCorpse")} — ${this.#npc.name}`;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const items = this.#getItems();
        const targets = this.#getTargetActors();

        return {
            ctx: {
                npcName: this.#npc.name,
                items,
                targets,
                onLoot: (selectedIds: string[], targetActorId: string) =>
                    this.#lootItems(selectedIds, targetActorId),
            },
        };
    }

    /** Collect lootable items from the NPC */
    #getItems(): LootableItem[] {
        const lootableTypes = new Set(["weapon", "armour", "gear", "ammunition"]);
        const items: LootableItem[] = [];

        for (const item of this.#npc.items) {
            if (!lootableTypes.has(item.type)) continue;
            const sys = item.system as any;
            items.push({
                id: item.id!,
                name: item.name!,
                img: item.img ?? "icons/svg/item-bag.svg",
                type: item.type,
                craftsmanship: sys.craftsmanship ?? "common",
                quantity: sys.quantity ?? 1,
                equipped: sys.equipped ?? false,
            });
        }

        return items;
    }

    /** Get possible target actors for loot transfer */
    #getTargetActors(): { id: string; name: string }[] {
        const g = game as any;
        const targets: { id: string; name: string }[] = [];

        // Add player characters
        for (const user of g.users ?? []) {
            if (user.isGM || !user.character) continue;
            targets.push({ id: user.character.id, name: user.character.name });
        }

        // Add warband inventory option
        const warband = g.dh2e?.warband;
        if (warband) {
            targets.push({ id: warband.id, name: `${warband.name} (${game.i18n.localize("DH2E.Warband.Tab.Inventory")})` });
        }

        return targets;
    }

    /** Transfer selected items from NPC to target actor */
    async #lootItems(selectedIds: string[], targetActorId: string): Promise<void> {
        const g = game as any;
        const targetActor = g.actors?.get(targetActorId);
        if (!targetActor || selectedIds.length === 0) return;

        // Collect item data
        const itemDatas: object[] = [];
        for (const id of selectedIds) {
            const item = this.#npc.items.get(id);
            if (!item) continue;
            const data = item.toObject();
            // Unequip transferred items
            if ((data as any).system?.equipped !== undefined) {
                (data as any).system.equipped = false;
            }
            itemDatas.push(data);
        }

        // Create on target
        await targetActor.createEmbeddedDocuments("Item", itemDatas);

        // Remove from NPC
        await this.#npc.deleteEmbeddedDocuments("Item", selectedIds);

        // Post chat card
        await ChatMessage.create({
            content: `<div class="dh2e loot-transfer-chat">
                <p>${game.i18n.format("DH2E.Loot.TransferComplete", {
                    actor: targetActor.name,
                    count: String(selectedIds.length),
                    source: this.#npc.name!,
                })}</p>
            </div>`,
            speaker: ChatMessage.getSpeaker({ alias: targetActor.name! }),
        });

        ui.notifications.info(
            game.i18n.format("DH2E.Loot.TransferComplete", {
                actor: targetActor.name!,
                count: String(selectedIds.length),
                source: this.#npc.name!,
            }),
        );

        this.close();
    }

    /** Open loot dialog for an NPC. Checks permissions. */
    static open(npc: Actor): void {
        const g = game as any;
        const isGM = g.user?.isGM;
        const playerLooting = getSetting<boolean>("playerLooting");

        if (!isGM && !playerLooting) {
            ui.notifications.warn("Only the GM can loot defeated NPCs.");
            return;
        }

        if (!(npc.system as any).defeated) {
            ui.notifications.warn("This NPC has not been defeated.");
            return;
        }

        new LootCorpseDialog(npc).render(true);
    }
}

export { LootCorpseDialog };
export type { LootableItem };
