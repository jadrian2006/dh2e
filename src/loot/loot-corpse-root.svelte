<script lang="ts">
    import type { LootableItem } from "./loot-corpse-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const items: LootableItem[] = $derived(ctx.items ?? []);
    const targets: { id: string; name: string }[] = $derived(ctx.targets ?? []);

    let selected: Record<string, boolean> = $state({});
    let targetActorId = $state(targets[0]?.id ?? "");

    const selectedIds = $derived(
        Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    );
    const canLoot = $derived(selectedIds.length > 0 && targetActorId !== "");

    function selectAll() {
        const sel: Record<string, boolean> = {};
        for (const item of items) sel[item.id] = true;
        selected = sel;
    }

    function selectNone() {
        selected = {};
    }

    function doLoot() {
        if (!canLoot) return;
        ctx.onLoot?.(selectedIds, targetActorId);
    }

    /** Color for craftsmanship badge */
    function craftColor(tier: string): string {
        switch (tier) {
            case "poor": return "var(--dh2e-danger, #c0392b)";
            case "good": return "var(--dh2e-info, #5dade2)";
            case "best": return "var(--dh2e-gold, #c8a84e)";
            default: return "var(--dh2e-text-secondary, #a0a0a8)";
        }
    }

    /** Grouped items by type */
    const grouped = $derived.by(() => {
        const groups: Record<string, LootableItem[]> = {};
        const order = ["weapon", "armour", "gear", "ammunition"];
        for (const type of order) groups[type] = [];
        for (const item of items) {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        }
        return Object.entries(groups).filter(([, arr]) => arr.length > 0);
    });
</script>

<div class="loot-corpse-dialog">
    {#if items.length === 0}
        <p class="no-items">{game.i18n.localize("DH2E.Loot.NoItems")}</p>
    {:else}
        <!-- Target selector -->
        <div class="field-row">
            <label class="field-label" for="loot-target">{game.i18n.localize("DH2E.Loot.TransferTo")}</label>
            <select id="loot-target" bind:value={targetActorId}>
                {#each targets as t (t.id)}
                    <option value={t.id}>{t.name}</option>
                {/each}
            </select>
        </div>

        <!-- Quick select -->
        <div class="quick-select">
            <button class="link-btn" onclick={selectAll}>{game.i18n.localize("DH2E.Loot.LootAll")}</button>
            <span class="separator">|</span>
            <button class="link-btn" onclick={selectNone}>None</button>
            <span class="count">{selectedIds.length}/{items.length}</span>
        </div>

        <!-- Item list grouped by type -->
        <div class="item-list">
            {#each grouped as [type, typeItems] (type)}
                <div class="group-header">{game.i18n.localize(`DH2E.ItemType.${type.charAt(0).toUpperCase()}${type.slice(1)}`)}</div>
                {#each typeItems as item (item.id)}
                    <label class="item-row" class:equipped={item.equipped}>
                        <input
                            type="checkbox"
                            checked={selected[item.id] ?? false}
                            onchange={(e) => { selected[item.id] = e.currentTarget.checked; }}
                        />
                        <img class="item-icon" src={item.img} alt="" />
                        <span class="item-name">{item.name}</span>
                        {#if item.quantity > 1}
                            <span class="item-qty">x{item.quantity}</span>
                        {/if}
                        <span class="craft-badge" style="color: {craftColor(item.craftsmanship)}">
                            {game.i18n.localize(`DH2E.Craftsmanship.${item.craftsmanship.charAt(0).toUpperCase()}${item.craftsmanship.slice(1)}`)}
                        </span>
                        {#if item.equipped}
                            <span class="equipped-tag">E</span>
                        {/if}
                    </label>
                {/each}
            {/each}
        </div>

        <!-- Loot button -->
        <button class="loot-btn" disabled={!canLoot} onclick={doLoot}>
            {game.i18n.localize("DH2E.Loot.Claim")} ({selectedIds.length})
        </button>
    {/if}
</div>

<style lang="scss">
    .loot-corpse-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .no-items {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: var(--dh2e-space-lg, 1rem);
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
    }

    select {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .quick-select {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
    }

    .link-btn {
        background: none;
        border: none;
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        font-size: inherit;
        padding: 0;
        text-decoration: underline;

        &:hover {
            color: var(--dh2e-gold-light, #e8c86e);
        }
    }

    .separator {
        color: var(--dh2e-border, #4a4a55);
    }

    .count {
        margin-left: auto;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .item-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        max-height: 320px;
        overflow-y: auto;
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
        cursor: pointer;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        &.equipped {
            border-left: 2px solid var(--dh2e-gold, #c8a84e);
        }
    }

    .item-icon {
        width: 20px;
        height: 20px;
        border: none;
    }

    .item-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
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

    .loot-btn {
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #0d0d12);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        &:hover:not(:disabled) {
            background: var(--dh2e-gold, #c8a84e);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }
</style>
