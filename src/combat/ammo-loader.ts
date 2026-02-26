import { loadMagazine, totalLoaded } from "./ammo.ts";

/**
 * Show a dialog for loading loose rounds into a magazine.
 * Supports mixed ammo: player chooses ammo types and quantities.
 */
async function showMagazineLoader(actor: any, magazine: any): Promise<void> {
    const sys = magazine.system ?? {};
    const capacity = sys.capacity ?? 0;
    const currentRounds = sys.loadedRounds ?? [];
    const currentLoaded = totalLoaded(currentRounds);
    const remaining = capacity - currentLoaded;

    if (remaining <= 0) {
        ui.notifications.info(game.i18n?.localize("DH2E.Ammo.MagazineFull") ?? "Magazine is full.");
        return;
    }

    const magGroup = sys.weaponGroup ?? "";

    // Find compatible loose ammo (not magazines)
    const looseAmmo = actor.items.filter((i: any) => {
        if (i.type !== "ammunition") return false;
        if (i.id === magazine.id) return false;
        if ((i.system?.capacity ?? 0) > 0) return false;
        if ((i.system?.quantity ?? 0) <= 0) return false;
        const aGroup = i.system?.weaponGroup ?? "";
        return aGroup === magGroup || aGroup === "";
    });

    if (looseAmmo.length === 0) {
        ui.notifications.warn(game.i18n?.localize("DH2E.Ammo.NoLooseAmmo") ?? "No compatible loose ammunition in inventory.");
        return;
    }

    // Build form content with number inputs for each ammo type
    const rows = looseAmmo.map((ammo: any, i: number) => {
        const as = ammo.system ?? {};
        const qty = as.quantity ?? 0;
        const maxLoad = Math.min(qty, remaining);
        const mods: string[] = [];
        if (as.damageModifier) mods.push(`Dmg ${as.damageModifier > 0 ? "+" : ""}${as.damageModifier}`);
        if (as.penetrationModifier) mods.push(`Pen ${as.penetrationModifier > 0 ? "+" : ""}${as.penetrationModifier}`);
        if (as.qualities?.length) mods.push(as.qualities.join(", "));
        const modStr = mods.length > 0 ? `<span style="font-size:0.75em; color:#aaa;"> (${mods.join(", ")})</span>` : "";

        return `<div class="load-row" style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0;">
            <span style="flex:1;"><strong>${ammo.name}</strong> (×${qty} available)${modStr}</span>
            <input type="number" name="load-${i}" value="0" min="0" max="${maxLoad}" style="width:4rem; text-align:center;" data-idx="${i}" />
        </div>`;
    }).join("");

    const currentStr = currentRounds.length > 0
        ? currentRounds.map((r: any) => `${r.name} ×${r.count}`).join(", ")
        : "Empty";

    const dialogContent = `<form class="dh2e ammo-loader">
        <p><strong>${magazine.name}</strong> — ${currentLoaded}/${capacity} loaded</p>
        <p style="font-size:0.8em; color:#aaa;">Currently: ${currentStr}</p>
        <p>Remaining capacity: <strong>${remaining}</strong> rounds</p>
        <hr/>
        ${rows}
    </form>`;

    const result = await fd.Dialog.wait({
        title: game.i18n?.format("DH2E.Ammo.LoadMagazineTitle", { magazine: magazine.name })
            ?? `Load ${magazine.name}`,
        content: dialogContent,
        buttons: {
            load: {
                icon: '<i class="fa-solid fa-arrow-down"></i>',
                label: game.i18n?.localize("DH2E.Ammo.LoadButton") ?? "Load",
                callback: (html: HTMLElement | JQuery) => {
                    const el = html instanceof HTMLElement ? html : html[0];
                    const inputs = el.querySelectorAll<HTMLInputElement>("input[type='number']");
                    const loads: Array<{ idx: number; count: number }> = [];
                    inputs.forEach((input) => {
                        const idx = parseInt(input.dataset.idx ?? "0");
                        const count = parseInt(input.value) || 0;
                        if (count > 0) loads.push({ idx, count });
                    });
                    return loads;
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: () => null,
            },
        },
        default: "load",
    });

    if (!result || (result as any[]).length === 0) return;

    const loads = (result as Array<{ idx: number; count: number }>).map((l) => ({
        ammoItem: looseAmmo[l.idx],
        count: l.count,
    })).filter((l) => l.ammoItem && l.count > 0);

    // Validate total doesn't exceed remaining
    const totalRequested = loads.reduce((sum, l) => sum + l.count, 0);
    if (totalRequested > remaining) {
        ui.notifications.warn(`Cannot load ${totalRequested} rounds — only ${remaining} capacity remaining.`);
        return;
    }

    const loadResult = await loadMagazine(actor, magazine, loads);
    if (loadResult) {
        ui.notifications.info(`Loaded ${loadResult.loaded} round(s) into ${magazine.name}.`);
    }
}

export { showMagazineLoader };
