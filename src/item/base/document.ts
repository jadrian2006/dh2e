/** Item type identifiers */
export type ItemType = "weapon" | "armour" | "gear" | "skill" | "talent" | "condition" | "power" | "homeworld" | "background" | "role" | "trait" | "critical-injury" | "malignancy" | "mental-disorder" | "ammunition" | "cybernetic";

/** Base item class for all DH2E item types */
class ItemDH2e extends Item {
    /** Item type narrowing */
    get itemType(): ItemType {
        return this.type as ItemType;
    }

    /** The description of this item */
    get description(): string {
        return (this.system as Record<string, unknown>).description as string ?? "";
    }

    static override getDefaultArtwork(itemData: Record<string, unknown>): { img: ImageFilePath } {
        return {
            img: `systems/${SYSTEM_ID}/icons/default-icons/${itemData.type}.svg` as ImageFilePath,
        };
    }
}

/** Proxy that dispatches Item construction to the correct subclass by type */
const ItemProxyDH2e = new Proxy(ItemDH2e, {
    construct(
        _target,
        args: [source: PreCreate<Record<string, unknown>>, context?: DocumentConstructionContext],
    ) {
        const type = args[0]?.type as string;
        const ItemClass: typeof ItemDH2e | undefined =
            CONFIG.DH2E?.Item?.documentClasses?.[type] as typeof ItemDH2e | undefined;
        if (!ItemClass) {
            throw new Error(`DH2E | Item type "${type}" does not have a registered document class.`);
        }
        return new ItemClass(...args);
    },
});

export { ItemDH2e, ItemProxyDH2e };
