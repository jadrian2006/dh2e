<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    type Category = "all" | "weapons" | "armour" | "gear" | "ammunition" | "cybernetics";
    let category: Category = $state("all");

    const allItems = $derived(() => {
        const items = ctx.inventoryItems ?? {};
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

    const members = $derived(ctx.memberCards ?? []);
    let assignDropdown: string | null = $state(null);

    function getItemIcon(type: string): string {
        switch (type) {
            case "weapon": return "fa-solid fa-crosshairs";
            case "armour": return "fa-solid fa-shield-halved";
            case "gear": return "fa-solid fa-box-open";
            case "ammunition": return "fa-solid fa-burst";
            case "cybernetic": return "fa-solid fa-microchip";
            default: return "fa-solid fa-circle";
        }
    }

    function toggleAssignDropdown(itemId: string) {
        assignDropdown = assignDropdown === itemId ? null : itemId;
    }

    function assignTo(item: any, memberUuid: string) {
        assignDropdown = null;
        ctx.assignItemTo?.(item, memberUuid);
    }
</script>

<div class="inventory-tab">
    <div class="inventory-header">
        <div class="category-filter" role="tablist" aria-label="Inventory category filter">
            <button class="filter-btn" class:active={category === "all"} onclick={() => category = "all"} role="tab" aria-selected={category === "all"}>All</button>
            <button class="filter-btn" class:active={category === "weapons"} onclick={() => category = "weapons"} role="tab" aria-selected={category === "weapons"}>Weapons</button>
            <button class="filter-btn" class:active={category === "armour"} onclick={() => category = "armour"} role="tab" aria-selected={category === "armour"}>Armour</button>
            <button class="filter-btn" class:active={category === "gear"} onclick={() => category = "gear"} role="tab" aria-selected={category === "gear"}>Gear</button>
            <button class="filter-btn" class:active={category === "ammunition"} onclick={() => category = "ammunition"} role="tab" aria-selected={category === "ammunition"}>Ammo</button>
            <button class="filter-btn" class:active={category === "cybernetics"} onclick={() => category = "cybernetics"} role="tab" aria-selected={category === "cybernetics"}>Cybernetics</button>
        </div>
    </div>

    <div class="item-list">
        {#each allItems() as item (item.id)}
            <div class="item-row">
                <i class="item-icon {getItemIcon(item.type)}"></i>
                <div class="item-info">
                    <span class="item-name">{item.name}</span>
                    <span class="item-type">{item.type}</span>
                </div>
                {#if item.system?.quantity !== undefined}
                    <span class="item-qty">x{item.system.quantity ?? 1}</span>
                {/if}
                {#if ctx.canEditInventory}
                    <div class="item-actions">
                        <button class="assign-btn" onclick={() => toggleAssignDropdown(item.id)} title="Assign to member">
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        <button class="edit-btn" onclick={() => ctx.openItem?.(item)} title="Edit">&#9998;</button>
                        <button class="delete-btn" onclick={() => ctx.deleteItem?.(item)} title="Delete">&times;</button>
                    </div>
                    {#if assignDropdown === item.id && members.length > 0}
                        <div class="assign-dropdown">
                            {#each members as card}
                                <button class="assign-option" onclick={() => assignTo(item, card.uuid)}>
                                    <img src={card.img} alt="" class="assign-avatar" />
                                    {card.name}
                                </button>
                            {/each}
                        </div>
                    {/if}
                {/if}
            </div>
        {:else}
            <p class="empty-msg">
                <i class="fa-solid fa-box-open"></i>
                {game.i18n?.localize("DH2E.Warband.Inventory.Empty") ?? "No items in warband inventory. Drag items here to add them."}
            </p>
        {/each}
    </div>
</div>

<style lang="scss">
    .inventory-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .inventory-header {
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
        position: relative;

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
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

    .item-actions {
        display: flex;
        gap: 2px;
    }

    .assign-btn, .edit-btn, .delete-btn {
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

    .assign-btn {
        font-size: 0.75rem;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }

    .delete-btn:hover { color: var(--dh2e-red-bright, #d44); }

    .assign-dropdown {
        position: absolute;
        right: 0;
        top: 100%;
        z-index: 10;
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        min-width: 10rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .assign-option {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: transparent;
        border: none;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        width: 100%;
        text-align: left;

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
    }

    .assign-avatar {
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        object-fit: cover;
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }
</style>
