<script lang="ts">
    import type { WeaponDragData } from "../../../macros/types.ts";

    let {
        weapons = [],
        actor,
    }: {
        weapons: any[];
        actor: any;
    } = $props();

    async function attackWith(weapon: any, fireMode: string) {
        const { AttackResolver } = await import("@combat/attack.ts");
        await AttackResolver.resolve({ actor, weapon, fireMode: fireMode as any });
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
        <div class="weapon-btn-group" draggable="true" ondragstart={(e) => onDragStart(e, weapon)}>
            <button class="weapon-btn" onclick={() => attackWith(weapon, "single")} title="{weapon.name} — Single">
                <i class="fa-solid fa-crosshairs"></i>
                <span class="weapon-label">{weapon.name}</span>
            </button>
            {#if sys.rof?.semi > 0}
                <button class="fire-mode-btn" onclick={() => attackWith(weapon, "semi")} title="Semi-Auto">S</button>
            {/if}
            {#if sys.rof?.full > 0}
                <button class="fire-mode-btn" onclick={() => attackWith(weapon, "full")} title="Full Auto">F</button>
            {/if}
            {#if sys.clip?.max > 0}
                <span class="ammo-count">{sys.clip?.value ?? 0}/{sys.clip?.max}</span>
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
        &:hover { border-color: var(--dh2e-gold, #c8a84e); background: var(--dh2e-gold-dark, #9c7a28); color: #111; }
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
        &:hover { border-color: var(--dh2e-gold-muted, #8a7a3e); color: var(--dh2e-gold, #c8a84e); }
    }
    .ammo-count { font-size: 0.55rem; color: var(--dh2e-text-secondary, #a0a0a8); }
    .empty-tray { font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8); font-style: italic; }
</style>
