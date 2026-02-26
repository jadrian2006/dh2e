/**
 * Homebrew Compendium — a world-level compendium pack for GM-created items.
 *
 * GMs can copy existing compendium items here for modification, or create
 * new items from scratch. Each item has a public/private visibility flag.
 * Public items appear seamlessly in player searches; private items are
 * completely hidden from non-GM users.
 */

import { invalidateCompendiumIndex } from "../ui/compendium-browser/index-builder.ts";

export const HOMEBREW_PACK_NAME = "dh2e-homebrew";
export const HOMEBREW_PACK_COLLECTION = `world.${HOMEBREW_PACK_NAME}`;

let _pack: any | null = null;

/**
 * Ensure the homebrew world compendium pack exists.
 * Called during the ready hook (GM only).
 */
export async function ensureHomebrewPack(): Promise<any | null> {
    const g = game as any;
    if (!g.user?.isGM) return null;

    // Check if it already exists
    const existing = g.packs?.get(HOMEBREW_PACK_COLLECTION);
    if (existing) {
        _pack = existing;
        return existing;
    }

    // Create the world-level compendium
    try {
        const data = {
            name: HOMEBREW_PACK_NAME,
            label: g.i18n?.localize("DH2E.Homebrew.PackLabel") ?? "DH2E Homebrew",
            type: "Item" as const,
            system: SYSTEM_ID,
            package: "world",
        };

        // V13 API — CompendiumCollection.createCompendium
        let pack: any = null;
        if (typeof (CompendiumCollection as any).createCompendium === "function") {
            pack = await (CompendiumCollection as any).createCompendium(data);
        } else if (typeof (CompendiumCollection as any).create === "function") {
            pack = await (CompendiumCollection as any).create(data);
        }

        if (pack) {
            _pack = pack;
            console.log("DH2E | Created homebrew compendium pack");
            return pack;
        }
    } catch (e) {
        console.error("DH2E | Failed to create homebrew compendium:", e);
    }

    return null;
}

/** Get the cached homebrew pack reference */
export function getHomebrewPack(): any | null {
    if (_pack) return _pack;
    _pack = (game as any).packs?.get(HOMEBREW_PACK_COLLECTION) ?? null;
    return _pack;
}

/**
 * Copy an existing compendium item into the homebrew pack.
 * The copy is independent and can be freely modified.
 */
export async function copyToHomebrew(sourceUuid: string): Promise<any | null> {
    const g = game as any;
    if (!g.user?.isGM) return null;

    const pack = getHomebrewPack();
    if (!pack) {
        ui.notifications.error("Homebrew compendium not found.");
        return null;
    }

    const source = await fromUuid(sourceUuid);
    if (!source) {
        ui.notifications.error("Source item not found.");
        return null;
    }

    const data = (source as any).toObject();
    delete data._id;

    // Set homebrew flags
    data.flags = data.flags ?? {};
    data.flags[SYSTEM_ID] = {
        ...(data.flags[SYSTEM_ID] ?? {}),
        homebrewVisibility: "public",
        copiedFrom: sourceUuid,
    };

    const created = await (Item as any).create(data, { pack: HOMEBREW_PACK_COLLECTION });
    if (created) {
        invalidateCompendiumIndex();
        ui.notifications.info(
            g.i18n?.format("DH2E.Homebrew.CopiedItem", { name: data.name }) ?? `Copied "${data.name}" to Homebrew.`,
        );
    }

    return created;
}

/**
 * Create a new blank homebrew item and open its sheet.
 */
export async function createHomebrewItem(type: string, name: string): Promise<any | null> {
    const g = game as any;
    if (!g.user?.isGM) return null;

    const pack = getHomebrewPack();
    if (!pack) {
        ui.notifications.error("Homebrew compendium not found.");
        return null;
    }

    const data: any = {
        name,
        type,
        flags: {
            [SYSTEM_ID]: {
                homebrewVisibility: "public",
            },
        },
    };

    const created = await (Item as any).create(data, { pack: HOMEBREW_PACK_COLLECTION });
    if (created) {
        invalidateCompendiumIndex();
        ui.notifications.info(
            g.i18n?.format("DH2E.Homebrew.Created", { name }) ?? `Created homebrew item: ${name}`,
        );
        created.sheet?.render(true);
    }

    return created;
}

/** Toggle an item's visibility between "public" and "private" */
export async function toggleHomebrewVisibility(itemId: string): Promise<void> {
    const g = game as any;
    const pack = getHomebrewPack();
    if (!pack) return;

    const doc = await pack.getDocument(itemId);
    if (!doc) return;

    const current = (doc as any).flags?.[SYSTEM_ID]?.homebrewVisibility ?? "public";
    const next = current === "public" ? "private" : "public";

    await (doc as any).update({
        [`flags.${SYSTEM_ID}.homebrewVisibility`]: next,
    });

    invalidateCompendiumIndex();

    const visLabel = next === "public"
        ? g.i18n?.localize("DH2E.Homebrew.Public") ?? "Public"
        : g.i18n?.localize("DH2E.Homebrew.Private") ?? "Private (GM Only)";

    ui.notifications.info(
        g.i18n?.format("DH2E.Homebrew.VisibilityChanged", {
            name: (doc as any).name,
            visibility: visLabel,
        }) ?? `${(doc as any).name} is now ${visLabel}.`,
    );
}

/** Check if a pack is the homebrew pack */
export function isHomebrewPack(pack: any): boolean {
    return pack?.collection === HOMEBREW_PACK_COLLECTION;
}
