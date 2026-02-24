<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    type Category = "all" | "weapons" | "armour" | "gear" | "ammunition" | "cybernetics";
    let category: Category = $state("all");

    const allItems = $derived(() => {
        const items = ctx.items ?? {};
        switch (category) {
            case "weapons": return items.weapons ?? [];
            case "armour": return items.armour ?? [];
            case "gear": return items.gear ?? [];
            case "ammunition": return items.ammunition ?? [];
            case "cybernetics": return items.cybernetics ?? [];
            default: return [
                ...(items.weapons ?? []),
                ...(items.armour ?? []),
                ...(items.gear ?? []),
                ...(items.ammunition ?? []),
                ...(items.cybernetics ?? []),
            ];
        }
    });

    const totalWeight = $derived(() => {
        return allItems().reduce((sum: number, item: any) => {
            const sys = item.system ?? {};
            const weight = sys.weight ?? 0;
            const qty = sys.quantity ?? 1;
            return sum + weight * qty;
        }, 0);
    });

    const encumbrance = $derived(ctx.encumbrance ?? { current: 0, carry: 0, lift: 0, push: 0, overloaded: false, overencumbered: false });
    const encPct = $derived(encumbrance.carry > 0 ? Math.min(100, (encumbrance.current / encumbrance.carry) * 100) : 0);
    const encClass = $derived(encumbrance.overencumbered ? "over-encumbered" : encumbrance.overloaded ? "overloaded" : "normal");

    async function toggleEquipped(item: any) {
        const sys = item.system ?? {};
        await item.update({ "system.equipped": !sys.equipped });
    }

    async function toggleInstalled(item: any) {
        const sys = item.system ?? {};
        await item.update({ "system.installed": !sys.installed });
    }

    async function deleteItem(item: any) {
        await item.delete();
    }

    function editItem(item: any) {
        item.sheet?.render(true);
    }

    function toggleFavorite(item: any) {
        const current = item.getFlag?.("dh2e", "favorite");
        if (current) item.unsetFlag("dh2e", "favorite");
        else item.setFlag("dh2e", "favorite", true);
    }

    function getItemIcon(type: string): string {
        switch (type) {
            case "weapon": return "fa-solid fa-crosshairs";
            case "armour": return "fa-solid fa-shield-halved";
            case "gear": return "fa-solid fa-box-open";
            case "talent": return "fa-solid fa-star";
            case "condition": return "fa-solid fa-bolt";
            case "power": return "fa-solid fa-hat-wizard";
            case "ammunition": return "fa-solid fa-burst";
            case "cybernetic": return "fa-solid fa-microchip";
            default: return "fa-solid fa-circle";
        }
    }
</script>

<div class="equipment-tab">
    <div class="equipment-header">
        <div class="category-filter" role="tablist" aria-label="Equipment category filter">
            <button class="filter-btn" class:active={category === "all"} onclick={() => category = "all"} role="tab" aria-selected={category === "all"}>All</button>
            <button class="filter-btn" class:active={category === "weapons"} onclick={() => category = "weapons"} role="tab" aria-selected={category === "weapons"}>Weapons</button>
            <button class="filter-btn" class:active={category === "armour"} onclick={() => category = "armour"} role="tab" aria-selected={category === "armour"}>Armour</button>
            <button class="filter-btn" class:active={category === "gear"} onclick={() => category = "gear"} role="tab" aria-selected={category === "gear"}>Gear</button>
            <button class="filter-btn" class:active={category === "ammunition"} onclick={() => category = "ammunition"} role="tab" aria-selected={category === "ammunition"}>Ammo</button>
            <button class="filter-btn" class:active={category === "cybernetics"} onclick={() => category = "cybernetics"} role="tab" aria-selected={category === "cybernetics"}>Cybernetics</button>
        </div>
        <span class="weight-total">Weight: {totalWeight().toFixed(1)} kg</span>
        <button class="requisition-btn" onclick={() => ctx.openRequisitionDialog?.()}>
            <i class="fa-solid fa-coins"></i> Requisition
        </button>
    </div>

    <div class="encumbrance-bar {encClass}">
        <div class="enc-fill" style="width: {encPct}%"></div>
        <span class="enc-label">
            {encumbrance.current.toFixed(1)} / {encumbrance.carry} kg
        </span>
        {#if encumbrance.overencumbered}
            <span class="enc-warning"><i class="fas fa-exclamation-triangle"></i> Cannot Move</span>
        {:else if encumbrance.overloaded}
            <span class="enc-warning"><i class="fas fa-weight-hanging"></i> Overloaded (-10 Ag, half movement)</span>
        {/if}
    </div>

    <div class="item-list">
        {#each allItems() as item}
            <div class="item-row" class:equipped={item.system?.equipped}>
                <button class="fav-star" onclick={() => toggleFavorite(item)} title="Favorite">
                    <i class={item.getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                </button>
                <i class="item-icon {getItemIcon(item.type)}"></i>
                <div class="item-info">
                    <span class="item-name">{item.name}</span>
                    <span class="item-type">{item.type}</span>
                </div>
                {#if item.system?.quantity !== undefined}
                    <span class="item-qty">x{item.system.quantity ?? 1}</span>
                {/if}
                {#if item.type === "weapon" || item.type === "armour"}
                    <button
                        class="equip-btn"
                        class:equipped={item.system?.equipped}
                        onclick={() => toggleEquipped(item)}
                        title={item.system?.equipped ? "Unequip" : "Equip"}
                    >
                        {item.system?.equipped ? "E" : "—"}
                    </button>
                {:else if item.type === "cybernetic"}
                    <button
                        class="install-btn"
                        class:installed={item.system?.installed}
                        onclick={() => toggleInstalled(item)}
                        title={item.system?.installed ? "Uninstall" : "Install"}
                    >
                        <i class={item.system?.installed ? "fa-solid fa-plug-circle-check" : "fa-solid fa-plug-circle-xmark"}></i>
                    </button>
                {/if}
                <button class="edit-btn" onclick={() => editItem(item)} title="Edit">&#9998;</button>
                <button class="delete-btn" onclick={() => deleteItem(item)} title="Delete">&times;</button>
            </div>
        {:else}
            <p class="empty-msg">No items. Drag items from the Items sidebar to add them.</p>
        {/each}
    </div>
</div>

<style lang="scss">
    .equipment-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .equipment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .category-filter {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .filter-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        cursor: pointer;

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .weight-total {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .requisition-btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-muted, #7a6a3e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .item-list {
        display: flex;
        flex-direction: column;
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.equipped { border-left: 2px solid var(--dh2e-gold, #c8a84e); }
    }

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.7rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .item-icon {
        width: 1.2rem;
        text-align: center;
        font-size: 0.75rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
    }

    .item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .item-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: capitalize;
    }

    .item-qty {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .equip-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        cursor: pointer;

        &.equipped {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
            font-weight: 700;
        }
    }

    .install-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &.installed {
            background: #1a3020;
            color: #6c6;
            border-color: #4a6a4a;
        }
    }

    .edit-btn, .delete-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .delete-btn:hover { color: var(--dh2e-red-bright, #d44); }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .encumbrance-bar {
        position: relative;
        height: 1.4rem;
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        overflow: hidden;
        display: flex;
        align-items: center;

        &.overloaded {
            border-color: var(--dh2e-gold, #c8a84e);
        }

        &.over-encumbered {
            border-color: var(--dh2e-red-bright, #d44);
        }
    }

    .enc-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: var(--dh2e-gold-dark, #9c7a28);
        opacity: 0.4;
        transition: width 0.3s ease;

        .overloaded & {
            background: var(--dh2e-gold, #c8a84e);
            opacity: 0.5;
        }

        .over-encumbered & {
            background: var(--dh2e-red-bright, #d44);
            opacity: 0.5;
        }
    }

    .enc-label {
        position: relative;
        z-index: 1;
        padding: 0 var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .enc-warning {
        position: relative;
        z-index: 1;
        margin-left: auto;
        padding-right: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-red-bright, #d44);

        i { margin-right: 0.2rem; }
    }
</style>
