<script lang="ts">
    import type { WeaponDragData } from "../../../macros/types.ts";
    import { canFire, getCompatibleAmmo, getCompatibleMagazines, reloadWeapon, parseReloadCost } from "@combat/ammo.ts";

    let {
        weapons = [],
        actor,
    }: {
        weapons: any[];
        actor: any;
    } = $props();

    function ammoColor(magValue: number, magMax: number): string {
        if (magValue <= 0) return "var(--dh2e-danger, #c0392b)";
        const pct = magValue / magMax;
        if (pct > 0.5) return "var(--dh2e-success, #27ae60)";
        if (pct > 0.25) return "var(--dh2e-warning, #d4a017)";
        return "var(--dh2e-danger, #c0392b)";
    }

    function isDisabled(weapon: any, fireMode: string): boolean {
        const sys = weapon.system ?? {};
        if ((sys.magazine?.max ?? 0) === 0) return false;
        return !canFire(weapon, fireMode as any);
    }

    function showReload(weapon: any): boolean {
        const sys = weapon.system ?? {};
        const magMax = sys.magazine?.max ?? 0;
        if (magMax === 0) return false;
        if ((sys.magazine?.value ?? 0) >= magMax) return false;
        const loadType = sys.loadType ?? "magazine";
        if (loadType === "individual") {
            return getCompatibleAmmo(actor, weapon).length > 0;
        }
        // Magazine-type: check for loaded magazines or loose ammo as fallback
        return getCompatibleMagazines(actor, weapon).length > 0 || getCompatibleAmmo(actor, weapon).length > 0;
    }

    function reloadTooltip(weapon: any): string {
        const sys = weapon.system ?? {};
        const cost = parseReloadCost(sys.reload ?? "");
        const actionLabel = cost.actionType === "half" ? "Half Action" : "Full Action";
        const countLabel = cost.count > 1 ? ` × ${cost.count}` : "";
        return `Reload: ${actionLabel}${countLabel}`;
    }

    async function attackWith(weapon: any, fireMode: string) {
        const { AttackResolver } = await import("@combat/attack.ts");
        await AttackResolver.resolve({ actor, weapon, fireMode: fireMode as any });
    }

    async function onReload(weapon: any) {
        const sys = weapon.system ?? {};
        const loadType = sys.loadType ?? "magazine";

        if (loadType === "individual") {
            // Individual loading — use loose ammo picker
            const compatible = getCompatibleAmmo(actor, weapon);
            if (compatible.length === 0) {
                ui.notifications.warn(game.i18n?.localize("DH2E.Ammo.NoAmmo") ?? "No compatible ammunition in inventory.");
                return;
            }
            if (compatible.length > 1) {
                const { showAmmoPicker } = await import("@combat/ammo-picker.ts");
                await showAmmoPicker(actor, weapon, compatible);
            } else {
                const { reloadIndividual } = await import("@combat/ammo.ts");
                const result = await reloadIndividual(actor, weapon, compatible[0]);
                if (result) {
                    ui.notifications.info(game.i18n?.format(result.partial ? "DH2E.Ammo.ReloadPartial" : "DH2E.Ammo.ReloadComplete", {
                        actor: actor.name,
                        weapon: weapon.name,
                        loaded: String(result.loaded),
                        needed: String((sys.magazine?.max ?? 0) - result.newMagValue + result.loaded),
                        ammo: result.ammoName,
                    }) ?? `${actor.name} reloads ${weapon.name} (${result.loaded} rounds of ${result.ammoName})`);
                }
            }
        } else {
            // Magazine swap
            const magazines = getCompatibleMagazines(actor, weapon);
            const looseAmmo = getCompatibleAmmo(actor, weapon);

            if (magazines.length === 0 && looseAmmo.length === 0) {
                ui.notifications.warn(game.i18n?.localize("DH2E.Ammo.NoMagazines") ?? "No loaded magazines available.");
                return;
            }

            const { showAmmoPicker } = await import("@combat/ammo-picker.ts");
            await showAmmoPicker(actor, weapon, looseAmmo);
        }
    }

    function onDragStart(e: DragEvent, weapon: any) {
        const data: WeaponDragData = {
            type: "Weapon",
            weaponId: weapon.id ?? weapon._id ?? "",
            weaponName: weapon.name,
        };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }
</script>

<div class="weapon-tray">
    {#each weapons as weapon}
        {@const sys = weapon.system ?? {}}
        {@const magMax = sys.magazine?.max ?? 0}
        {@const magValue = sys.magazine?.value ?? 0}
        <div class="weapon-btn-group" draggable="true" ondragstart={(e) => onDragStart(e, weapon)}>
            <button
                class="weapon-btn"
                class:disabled={isDisabled(weapon, "single")}
                onclick={() => !isDisabled(weapon, "single") && attackWith(weapon, "single")}
                title="{weapon.name} — Single"
            >
                <i class="fa-solid fa-crosshairs"></i>
                <span class="weapon-label">{weapon.name}</span>
            </button>
            {#if sys.rof?.semi > 0}
                <button
                    class="fire-mode-btn"
                    class:disabled={isDisabled(weapon, "semi")}
                    onclick={() => !isDisabled(weapon, "semi") && attackWith(weapon, "semi")}
                    title="Semi-Auto ({sys.rof.semi} rounds)"
                >S</button>
            {/if}
            {#if sys.rof?.full > 0}
                <button
                    class="fire-mode-btn"
                    class:disabled={isDisabled(weapon, "full")}
                    onclick={() => !isDisabled(weapon, "full") && attackWith(weapon, "full")}
                    title="Full Auto ({sys.rof.full} rounds)"
                >F</button>
            {/if}
            {#if magMax > 0}
                <span class="ammo-count" class:ammo-empty={magValue <= 0} class:ammo-flash={magValue <= 0} style="color: {ammoColor(magValue, magMax)}">
                    {#if magValue <= 0}
                        EMPTY
                    {:else}
                        {magValue}/{magMax}
                    {/if}
                </span>
            {/if}
            {#if showReload(weapon)}
                <button class="reload-btn" onclick={() => onReload(weapon)} title={reloadTooltip(weapon)}>
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
            {/if}
        </div>
    {:else}
        <span class="empty-tray">No equipped weapons</span>
    {/each}
</div>

<style lang="scss">
    .weapon-tray { display: flex; gap: var(--dh2e-space-xs, 0.25rem); align-items: center; flex-wrap: wrap; }
    .weapon-btn-group { display: flex; align-items: center; gap: 2px; cursor: grab; }
    .weapon-btn {
        display: flex; align-items: center; gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        &:hover:not(.disabled) { border-color: var(--dh2e-gold, #c8a84e); background: var(--dh2e-gold-dark, #9c7a28); color: #111; }
        &.disabled { opacity: 0.3; cursor: not-allowed; }
        i { font-size: 0.65rem; color: var(--dh2e-gold-muted, #8a7a3e); }
    }
    .weapon-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
    .fire-mode-btn {
        width: 1.3rem; height: 1.3rem;
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 2px;
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.6rem; font-weight: 700; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        &:hover:not(.disabled) { border-color: var(--dh2e-gold-muted, #8a7a3e); color: var(--dh2e-gold, #c8a84e); }
        &.disabled { opacity: 0.3; cursor: not-allowed; }
    }
    .ammo-count { font-size: 0.55rem; font-weight: 700; }
    .ammo-flash { animation: ammo-blink 0.8s ease-in-out infinite; }
    @keyframes ammo-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
    .reload-btn {
        width: 1.3rem; height: 1.3rem;
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 2px;
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.55rem; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        &:hover { border-color: var(--dh2e-gold-muted, #8a7a3e); color: var(--dh2e-gold, #c8a84e); }
    }
    .empty-tray { font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8); font-style: italic; }
</style>
