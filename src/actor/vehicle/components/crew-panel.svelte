<script lang="ts">
    let {
        positions = [],
        editable = false,
        actor,
    }: {
        positions: any[];
        editable: boolean;
        actor: any;
    } = $props();

    const roleIcons: Record<string, string> = {
        driver: "fa-solid fa-steering-wheel",
        gunner: "fa-solid fa-crosshairs",
        commander: "fa-solid fa-chess-king",
        passenger: "fa-solid fa-user",
    };

    async function removeCrew(index: number) {
        await actor.removeCrew(index);
    }

    async function addPosition() {
        const current = actor.system.crewPositions ?? [];
        await actor.update({
            "system.crewPositions": [...current, {
                role: "passenger",
                label: `Position ${current.length + 1}`,
                actorId: "",
                actorName: "",
            }],
        });
    }

    async function removePosition(index: number) {
        const current = [...(actor.system.crewPositions ?? [])];
        current.splice(index, 1);
        await actor.update({ "system.crewPositions": current });
    }

    async function updateRole(index: number, role: string) {
        const current = [...(actor.system.crewPositions ?? [])];
        current[index] = { ...current[index], role };
        await actor.update({ "system.crewPositions": current });
    }
</script>

<div class="crew-panel">
    <div class="crew-header">
        <h3 class="section-title">Crew</h3>
        {#if editable}
            <button class="add-btn" onclick={addPosition} title="Add Position">
                <i class="fas fa-plus"></i>
            </button>
        {/if}
    </div>

    {#each positions as pos, i}
        <div class="crew-row">
            <i class={roleIcons[pos.role] ?? "fa-solid fa-user"}></i>
            {#if editable}
                <select class="role-select" value={pos.role}
                    onchange={(e) => updateRole(i, (e.target as HTMLSelectElement).value)}>
                    <option value="driver">Driver</option>
                    <option value="gunner">Gunner</option>
                    <option value="commander">Commander</option>
                    <option value="passenger">Passenger</option>
                </select>
            {:else}
                <span class="role-label">{pos.role}</span>
            {/if}
            <span class="crew-name">{pos.actorName || "— Empty —"}</span>
            {#if editable && pos.actorId}
                <button class="icon-btn" onclick={() => removeCrew(i)} title="Remove Crew">
                    <i class="fas fa-user-minus"></i>
                </button>
            {/if}
            {#if editable}
                <button class="icon-btn del" onclick={() => removePosition(i)} title="Remove Position">
                    <i class="fas fa-trash"></i>
                </button>
            {/if}
        </div>
    {:else}
        <p class="empty-msg">No crew positions. Click + to add.</p>
    {/each}
</div>

<style lang="scss">
    .crew-panel { display: flex; flex-direction: column; gap: var(--dh2e-space-xs, 0.25rem); }
    .crew-header { display: flex; align-items: center; gap: var(--dh2e-space-sm, 0.5rem); }
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
    .crew-row {
        display: flex; align-items: center; gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        i { width: 1rem; text-align: center; color: var(--dh2e-gold-muted, #8a7a3e); font-size: 0.7rem; }
    }
    .role-select { font-size: var(--dh2e-text-xs, 0.7rem); }
    .role-label { font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8); text-transform: capitalize; }
    .crew-name {
        flex: 1; font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8);
    }
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
