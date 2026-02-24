<script lang="ts">
    let {
        weapons = [],
        items = [],
        editable = false,
        actor,
    }: {
        weapons: any[];
        items: any[];
        editable: boolean;
        actor: any;
    } = $props();

    const arcLabels: Record<string, string> = {
        front: "Front", turret: "Turret", left: "Left", right: "Right", rear: "Rear", all: "All",
    };

    async function addSlot() {
        const current = actor.system.mountedWeapons ?? [];
        await actor.update({
            "system.mountedWeapons": [...current, {
                weaponId: "",
                weaponName: "Empty Slot",
                fireArc: "turret",
                crewPosition: 0,
            }],
        });
    }

    async function removeSlot(index: number) {
        const current = [...(actor.system.mountedWeapons ?? [])];
        current.splice(index, 1);
        await actor.update({ "system.mountedWeapons": current });
    }

    async function updateSlotArc(index: number, arc: string) {
        const current = [...(actor.system.mountedWeapons ?? [])];
        current[index] = { ...current[index], fireArc: arc };
        await actor.update({ "system.mountedWeapons": current });
    }

    async function assignWeapon(index: number, weaponId: string) {
        const current = [...(actor.system.mountedWeapons ?? [])];
        const weapon = items.find((w: any) => w.id === weaponId);
        current[index] = {
            ...current[index],
            weaponId,
            weaponName: weapon?.name ?? "Unknown",
        };
        await actor.update({ "system.mountedWeapons": current });
    }

    function editWeapon(item: any) { item.sheet?.render(true); }
</script>

<div class="mounted-weapons">
    <div class="mw-header">
        <h3 class="section-title">Mounted Weapons</h3>
        {#if editable}
            <button class="add-btn" onclick={addSlot} title="Add Weapon Slot">
                <i class="fas fa-plus"></i>
            </button>
        {/if}
    </div>

    {#each weapons as slot, i}
        <div class="weapon-row">
            <i class="fa-solid fa-crosshairs weapon-icon"></i>
            <span class="weapon-name">{slot.weaponName || "Empty"}</span>
            {#if editable}
                <select class="arc-select" value={slot.fireArc ?? "turret"}
                    onchange={(e) => updateSlotArc(i, (e.target as HTMLSelectElement).value)}>
                    {#each Object.entries(arcLabels) as [key, label]}
                        <option value={key}>{label}</option>
                    {/each}
                </select>
                <select class="weapon-select"
                    value={slot.weaponId ?? ""}
                    onchange={(e) => assignWeapon(i, (e.target as HTMLSelectElement).value)}>
                    <option value="">— Select —</option>
                    {#each items as item}
                        <option value={item.id}>{item.name}</option>
                    {/each}
                </select>
                <button class="icon-btn del" onclick={() => removeSlot(i)} title="Remove Slot">
                    <i class="fas fa-trash"></i>
                </button>
            {:else}
                <span class="arc-label">{arcLabels[slot.fireArc] ?? slot.fireArc}</span>
            {/if}
        </div>
    {:else}
        <p class="empty-msg">No mounted weapons. Click + to add slots, then drag weapons.</p>
    {/each}
</div>

<style lang="scss">
    .mounted-weapons { display: flex; flex-direction: column; gap: var(--dh2e-space-xs, 0.25rem); }
    .mw-header { display: flex; align-items: center; gap: var(--dh2e-space-sm, 0.5rem); }
    .section-title {
        flex: 1;
        font-family: var(--dh2e-font-header, serif); font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e); margin: 0;
    }
    .add-btn {
        width: 1.5rem; height: 1.5rem;
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35); color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer; font-size: 0.65rem;
        display: flex; align-items: center; justify-content: center;
        &:hover { background: var(--dh2e-gold-dark, #9c7a28); color: var(--dh2e-bg-darkest, #111114); }
    }
    .weapon-row {
        display: flex; align-items: center; gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
    }
    .weapon-icon { width: 1rem; text-align: center; color: var(--dh2e-gold-muted, #8a7a3e); font-size: 0.7rem; }
    .weapon-name { flex: 1; font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8); }
    .arc-select, .weapon-select { font-size: var(--dh2e-text-xs, 0.7rem); }
    .arc-label { font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8); }
    .icon-btn {
        width: 1.2rem; height: 1.2rem; border: none; background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8); cursor: pointer; font-size: 0.65rem;
        display: flex; align-items: center; justify-content: center;
        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
        &.del:hover { color: var(--dh2e-red-bright, #d44); }
    }
    .empty-msg {
        font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic; text-align: center; padding: var(--dh2e-space-sm, 0.5rem);
    }
</style>
