import { reloadWeapon, parseReloadCost } from "./ammo.ts";

/**
 * Show an ammo picker dialog when multiple compatible ammo types are available.
 * If only one type, skips the dialog and reloads directly.
 */
async function showAmmoPicker(actor: any, weapon: any, compatible: any[]): Promise<void> {
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

    const result = await reloadWeapon(actor, weapon, selectedAmmo);
    if (!result) return;

    // Post reload chat card
    const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
    const msgKey = result.partial ? "DH2E.Ammo.ReloadPartial" : "DH2E.Ammo.ReloadComplete";
    const reloadCost = parseReloadCost(weapon.system?.reload ?? "");
    const actionLabel = reloadCost.actionType === "half" ? "Half Action" : "Full Action";
    const costStr = reloadCost.count > 1 ? ` (${reloadCost.count}× ${actionLabel})` : ` (${actionLabel})`;

    await fd.ChatMessage.create({
        content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format(msgKey, {
            actor: actor.name,
            weapon: weapon.name,
            loaded: String(result.loaded),
            needed: String((weapon.system?.clip?.max ?? 0) - result.newClipValue + result.loaded),
            ammo: result.ammoName,
        }) ?? `${actor.name} reloads ${weapon.name} (${result.loaded} rounds of ${result.ammoName})`}${costStr}</em></div>`,
        speaker,
    });
}

export { showAmmoPicker };
