import { reloadWeapon, reloadMagazineSwap, reloadIndividual, parseReloadCost, getCompatibleMagazines, totalLoaded } from "./ammo.ts";

/**
 * Show an ammo/magazine picker dialog based on the weapon's loadType.
 * - Magazine-type weapons: shows available magazines with fill level
 * - Individual-type weapons: shows loose ammo types
 */
async function showAmmoPicker(actor: any, weapon: any, compatible: any[]): Promise<void> {
    const loadType = weapon.system?.loadType ?? "magazine";

    if (loadType === "individual") {
        return showLooseAmmoPicker(actor, weapon, compatible);
    }

    // For magazine-type, try magazine swap first; fall back to loose ammo if no magazines
    const magazines = getCompatibleMagazines(actor, weapon);
    if (magazines.length > 0) {
        return showMagazinePicker(actor, weapon, magazines);
    }

    // No loaded magazines — show loose ammo picker as fallback
    return showLooseAmmoPicker(actor, weapon, compatible);
}

/**
 * Show a magazine swap picker — radio list of available loaded magazines.
 */
async function showMagazinePicker(actor: any, weapon: any, magazines: any[]): Promise<void> {
    const weaponName = weapon.name;

    const content = magazines.map((mag: any, i: number) => {
        const sys = mag.system ?? {};
        const rounds = sys.loadedRounds ?? [];
        const loaded = totalLoaded(rounds);
        const capacity = sys.capacity ?? 0;
        const pct = capacity > 0 ? Math.round((loaded / capacity) * 100) : 0;

        // Build ammo type summary
        const typeStr = rounds.map((r: any) => `${r.name} ×${r.count}`).join(", ") || "Empty";

        return `<label class="ammo-option" style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0; cursor:pointer;">
            <input type="radio" name="mag-choice" value="${i}" ${i === 0 ? "checked" : ""} />
            <span style="flex:1;">
                <strong>${mag.name}</strong>
                <span style="font-size:0.8em; color:#999;">${loaded}/${capacity}</span>
                <br/><span style="font-size:0.75em; color:#aaa;">${typeStr}</span>
            </span>
            <span style="width:3rem; height:0.4rem; background:#333; border-radius:2px; overflow:hidden; display:inline-block;">
                <span style="width:${pct}%; height:100%; background:${pct > 50 ? '#27ae60' : pct > 25 ? '#d4a017' : '#c0392b'}; display:block;"></span>
            </span>
        </label>`;
    }).join("");

    const introText = game.i18n?.format("DH2E.Ammo.PickMagazine", { weapon: weaponName })
        ?? `Choose a magazine to insert into ${weaponName}:`;

    const dialogResult = await fd.Dialog.wait({
        title: game.i18n?.localize("DH2E.Ammo.SwapMagazine") ?? "Swap Magazine",
        content: `<form class="dh2e ammo-picker">
            <p>${introText}</p>
            <div class="ammo-options">${content}</div>
        </form>`,
        buttons: {
            reload: {
                icon: '<i class="fa-solid fa-arrows-rotate"></i>',
                label: game.i18n?.localize("DH2E.Ammo.SwapMagazine") ?? "Swap Magazine",
                callback: (html: HTMLElement | JQuery) => {
                    const el = html instanceof HTMLElement ? html : html[0];
                    const checked = el.querySelector<HTMLInputElement>('input[name="mag-choice"]:checked');
                    return checked ? parseInt(checked.value) : 0;
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: () => null,
            },
        },
        default: "reload",
    });

    if (dialogResult === null || dialogResult === undefined) return;

    const selectedMag = magazines[dialogResult as number];
    if (!selectedMag) return;

    const result = await reloadMagazineSwap(actor, weapon, selectedMag);
    if (!result) return;

    postReloadChat(actor, weapon, result);
}

/**
 * Show a loose ammo type picker (for individual-loading weapons or fallback).
 */
async function showLooseAmmoPicker(actor: any, weapon: any, compatible: any[]): Promise<void> {
    const weaponName = weapon.name;

    const content = compatible.map((ammo: any, i: number) => {
        const sys = ammo.system ?? {};
        const mods: string[] = [];
        if (sys.damageModifier) mods.push(`Dmg ${sys.damageModifier > 0 ? "+" : ""}${sys.damageModifier}`);
        if (sys.penetrationModifier) mods.push(`Pen ${sys.penetrationModifier > 0 ? "+" : ""}${sys.penetrationModifier}`);
        if (sys.qualities?.length) mods.push(sys.qualities.join(", "));
        const modStr = mods.length > 0 ? ` (${mods.join(", ")})` : "";

        return `<label class="ammo-option" style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0; cursor:pointer;">
            <input type="radio" name="ammo-choice" value="${i}" ${i === 0 ? "checked" : ""} />
            <span><strong>${ammo.name}</strong> ×${sys.quantity ?? 0}${modStr}</span>
        </label>`;
    }).join("");

    const introText = game.i18n?.format("DH2E.Ammo.PickerIntro", { weapon: weaponName })
        ?? `Choose ammunition to load into ${weaponName}:`;

    const dialogResult = await fd.Dialog.wait({
        title: game.i18n?.localize("DH2E.Ammo.PickerTitle") ?? "Select Ammunition",
        content: `<form class="dh2e ammo-picker">
            <p>${introText}</p>
            <div class="ammo-options">${content}</div>
        </form>`,
        buttons: {
            reload: {
                icon: '<i class="fa-solid fa-arrows-rotate"></i>',
                label: game.i18n?.localize("DH2E.Ammo.Reload") ?? "Reload",
                callback: (html: HTMLElement | JQuery) => {
                    const el = html instanceof HTMLElement ? html : html[0];
                    const checked = el.querySelector<HTMLInputElement>('input[name="ammo-choice"]:checked');
                    return checked ? parseInt(checked.value) : 0;
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: () => null,
            },
        },
        default: "reload",
    });

    if (dialogResult === null || dialogResult === undefined) return;

    const selectedAmmo = compatible[dialogResult as number];
    if (!selectedAmmo) return;

    const result = await reloadIndividual(actor, weapon, selectedAmmo);
    if (!result) return;

    postReloadChat(actor, weapon, result);
}

/** Post a reload chat card */
async function postReloadChat(actor: any, weapon: any, result: { loaded: number; ammoName: string; partial: boolean; newMagValue: number; magazineSwap: boolean }): Promise<void> {
    const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
    const magMax = weapon.system?.magazine?.max ?? 0;
    const reloadCost = parseReloadCost(weapon.system?.reload ?? "");
    const actionLabel = reloadCost.actionType === "half" ? "Half Action" : "Full Action";
    const costStr = reloadCost.count > 1 ? ` (${reloadCost.count}× ${actionLabel})` : ` (${actionLabel})`;

    let msgKey: string;
    if (result.magazineSwap) {
        msgKey = "DH2E.Ammo.MagazineSwapped";
        const msg = game.i18n?.format(msgKey, {
            actor: actor.name,
            weapon: weapon.name,
            ammo: result.ammoName,
            loaded: String(result.loaded),
            capacity: String(magMax),
        }) ?? `${actor.name} swaps magazine on ${weapon.name} (${result.ammoName}, ${result.loaded}/${magMax})`;

        await fd.ChatMessage.create({
            content: `<div class="dh2e chat-card system-note"><em>${msg}${costStr}</em></div>`,
            speaker,
        });
    } else {
        msgKey = result.partial ? "DH2E.Ammo.ReloadPartial" : "DH2E.Ammo.ReloadComplete";
        const msg = game.i18n?.format(msgKey, {
            actor: actor.name,
            weapon: weapon.name,
            loaded: String(result.loaded),
            needed: String(magMax - result.newMagValue + result.loaded),
            ammo: result.ammoName,
        }) ?? `${actor.name} reloads ${weapon.name} (${result.loaded} rounds of ${result.ammoName})`;

        await fd.ChatMessage.create({
            content: `<div class="dh2e chat-card system-note"><em>${msg}${costStr}</em></div>`,
            speaker,
        });
    }
}

export { showAmmoPicker, showMagazinePicker, showLooseAmmoPicker };
