<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const LOOTABLE_TYPES = new Set(["weapon", "armour", "gear", "ammunition"]);
    const TYPE_ORDER = ["weapon", "armour", "gear", "ammunition"];

    /** Filter to lootable types that aren't hidden */
    const lootableItems = $derived.by(() => {
        const all: any[] = [];
        for (const items of Object.values(ctx.items ?? {})) {
            for (const item of items as any[]) {
                if (!LOOTABLE_TYPES.has(item.type)) continue;
                if (item.getFlag?.("dh2e", "hidden")) continue;
                all.push(item);
            }
        }
        return all;
    });

    /** Group lootable items by type */
    const grouped = $derived.by(() => {
        const groups: Record<string, any[]> = {};
        for (const type of TYPE_ORDER) groups[type] = [];
        for (const item of lootableItems) {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        }
        return Object.entries(groups).filter(([, arr]) => arr.length > 0);
    });

    /** Color for craftsmanship badge */
    function craftColor(tier: string): string {
        switch (tier) {
            case "poor": return "var(--dh2e-danger, #c0392b)";
            case "good": return "var(--dh2e-info, #5dade2)";
            case "best": return "var(--dh2e-gold, #c8a84e)";
            default: return "var(--dh2e-text-secondary, #a0a0a8)";
        }
    }

    function onDragStart(e: DragEvent, item: any) {
        e.dataTransfer?.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: item.uuid,
        }));
    }
</script>

<div class="loot-view">
    <!-- Deceased banner -->
    <div class="deceased-banner">
        <i class="fa-solid fa-skull"></i>
        <span>{game.i18n.localize("DH2E.Loot.Deceased")}</span>
        <i class="fa-solid fa-skull"></i>
    </div>

    {#if lootableItems.length === 0}
        <p class="empty-state">{game.i18n.localize("DH2E.Loot.NoLootableItems")}</p>
    {:else}
        <p class="drag-hint">{game.i18n.localize("DH2E.Loot.DragHint")}</p>

        <div class="item-list">
            {#each grouped as [type, typeItems] (type)}
                <div class="group-header">
                    {game.i18n.localize(`DH2E.ItemType.${type.charAt(0).toUpperCase()}${type.slice(1)}`)}
                </div>
                {#each typeItems as item (item.id)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="item-row"
                        class:equipped={item.system?.equipped}
                        draggable="true"
                        ondragstart={(e) => onDragStart(e, item)}
                    >
                        <img class="item-icon" src={item.img} alt="" />
                        <span class="item-name">{item.name}</span>
                        {#if (item.system?.quantity ?? 1) > 1}
                            <span class="item-qty">x{item.system.quantity}</span>
                        {/if}
                        {#if item.system?.craftsmanship && item.system.craftsmanship !== "common"}
                            <span class="craft-badge" style="color: {craftColor(item.system.craftsmanship)}">
                                {game.i18n.localize(`DH2E.Craftsmanship.${item.system.craftsmanship.charAt(0).toUpperCase()}${item.system.craftsmanship.slice(1)}`)}
                            </span>
                        {/if}
                        {#if item.system?.equipped}
                            <span class="equipped-tag">E</span>
                        {/if}
                        <i class="fa-solid fa-grip-vertical drag-handle"></i>
                    </div>
                {/each}
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .loot-view {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .deceased-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: rgba(192, 57, 43, 0.15);
        border: 1px solid var(--dh2e-danger, #c0392b);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-danger, #c0392b);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .empty-state {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: var(--dh2e-space-lg, 1rem);
        font-style: italic;
    }

    .drag-hint {
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin: 0;
    }

    .item-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow-y: auto;
        flex: 1;
    }

    .group-header {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        padding: var(--dh2e-space-xs, 0.25rem) 0;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: grab;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        &.equipped {
            border-left: 2px solid var(--dh2e-gold, #c8a84e);
        }

        &:active {
            cursor: grabbing;
        }
    }

    .item-icon {
        width: 24px;
        height: 24px;
        border: none;
        flex-shrink: 0;
    }

    .item-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-qty {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .craft-badge {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .equipped-tag {
        font-size: 0.6rem;
        color: var(--dh2e-gold, #c8a84e);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: 2px;
        padding: 0 2px;
        line-height: 1;
    }

    .drag-handle {
        color: var(--dh2e-border, #4a4a55);
        font-size: 0.65rem;
        flex-shrink: 0;
    }
</style>
