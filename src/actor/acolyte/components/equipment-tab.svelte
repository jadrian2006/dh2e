<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    type Category = "all" | "weapons" | "armour" | "gear";
    let category: Category = $state("all");

    const allItems = $derived(() => {
        const items = ctx.items ?? {};
        switch (category) {
            case "weapons": return items.weapons ?? [];
            case "armour": return items.armour ?? [];
            case "gear": return items.gear ?? [];
            default: return [
                ...(items.weapons ?? []),
                ...(items.armour ?? []),
                ...(items.gear ?? []),
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

    async function toggleEquipped(item: any) {
        const sys = item.system ?? {};
        await item.update({ "system.equipped": !sys.equipped });
    }

    async function deleteItem(item: any) {
        await item.delete();
    }

    function editItem(item: any) {
        item.sheet?.render(true);
    }

    function getItemIcon(type: string): string {
        switch (type) {
            case "weapon": return "\u2694";
            case "armour": return "\u1F6E1";
            case "gear": return "\u1F4E6";
            default: return "\u2022";
        }
    }
</script>

<div class="equipment-tab">
    <div class="equipment-header">
        <div class="category-filter">
            <button class="filter-btn" class:active={category === "all"} onclick={() => category = "all"}>All</button>
            <button class="filter-btn" class:active={category === "weapons"} onclick={() => category = "weapons"}>Weapons</button>
            <button class="filter-btn" class:active={category === "armour"} onclick={() => category = "armour"}>Armour</button>
            <button class="filter-btn" class:active={category === "gear"} onclick={() => category = "gear"}>Gear</button>
        </div>
        <span class="weight-total">Weight: {totalWeight().toFixed(1)} kg</span>
    </div>

    <div class="item-list">
        {#each allItems() as item}
            <div class="item-row" class:equipped={item.system?.equipped}>
                <span class="item-icon">{getItemIcon(item.type)}</span>
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

    .item-icon {
        width: 1.2rem;
        text-align: center;
        font-size: 0.9rem;
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
</style>
