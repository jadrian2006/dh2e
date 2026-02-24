<script lang="ts">
    import type { GrantType, GrantableItem } from "./gm-grant-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let selectedActorId: string = $state("");
    let grantType: GrantType = $state("elite");
    let searchText = $state("");
    let flavorText = $state("");
    let items: GrantableItem[] = $state([]);
    let loading = $state(false);
    let selectedItemId: string = $state("");

    const actors: { id: string; name: string }[] = $derived(ctx.actors ?? []);

    const filtered = $derived(() => {
        const term = searchText.toLowerCase().trim();
        if (!term) return items;
        return items.filter(
            (i) => i.name.toLowerCase().includes(term) || i.sublabel.toLowerCase().includes(term),
        );
    });

    async function loadItems() {
        if (!selectedActorId) {
            items = [];
            return;
        }
        loading = true;
        selectedItemId = "";
        try {
            items = await ctx.getItems(selectedActorId, grantType);
        } catch {
            items = [];
        }
        loading = false;
    }

    // Reload items when actor or type changes
    $effect(() => {
        // Access reactive deps
        const _a = selectedActorId;
        const _t = grantType;
        loadItems();
    });

    function selectItem(id: string) {
        selectedItemId = id;
    }

    async function grant() {
        if (!selectedActorId || !selectedItemId) return;
        await ctx.doGrant(selectedActorId, grantType, selectedItemId, flavorText);
        selectedItemId = "";
        flavorText = "";
    }

    function typeLabel(t: GrantType): string {
        const map: Record<GrantType, string> = {
            elite: "DH2E.GMGrant.TypeElite",
            talent: "DH2E.GMGrant.TypeTalent",
            skill: "DH2E.GMGrant.TypeSkill",
        };
        return game.i18n.localize(map[t]);
    }
</script>

<div class="grant-container">
    <!-- Actor selector -->
    <div class="field-row">
        <label class="field-label">{game.i18n.localize("DH2E.GMGrant.SelectActor")}</label>
        <select class="field-select" bind:value={selectedActorId}>
            <option value="">—</option>
            {#each actors as actor (actor.id)}
                <option value={actor.id}>{actor.name}</option>
            {/each}
        </select>
    </div>

    <!-- Grant type selector -->
    <div class="type-tabs">
        {#each (["elite", "talent", "skill"] as GrantType[]) as t}
            <button
                class="type-tab"
                class:active={grantType === t}
                onclick={() => { grantType = t; }}
            >
                {typeLabel(t)}
            </button>
        {/each}
    </div>

    <!-- Search -->
    <input
        type="text"
        class="search-input"
        placeholder={game.i18n.localize("DH2E.GMGrant.Search")}
        bind:value={searchText}
    />

    <!-- Item list -->
    <div class="item-list">
        {#if loading}
            <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>
        {:else if !selectedActorId}
            <div class="empty-state">{game.i18n.localize("DH2E.GMGrant.SelectActor")}</div>
        {:else if filtered().length === 0}
            <div class="empty-state">No items available.</div>
        {:else}
            {#each filtered() as item (item.id)}
                <button
                    class="item-row"
                    class:selected={selectedItemId === item.id}
                    onclick={() => selectItem(item.id)}
                >
                    <span class="item-name">{item.name}</span>
                    <span class="item-sublabel">{item.sublabel}</span>
                </button>
            {/each}
        {/if}
    </div>

    <!-- Flavor text -->
    <div class="field-row flavor-row">
        <label class="field-label">{game.i18n.localize("DH2E.GMGrant.FlavorLabel")}</label>
        <textarea
            class="flavor-input"
            placeholder={game.i18n.localize("DH2E.GMGrant.FlavorPlaceholder")}
            bind:value={flavorText}
            rows="2"
        ></textarea>
    </div>

    <!-- Grant button -->
    <button
        class="grant-btn"
        disabled={!selectedActorId || !selectedItemId}
        onclick={grant}
    >
        <i class="fa-solid fa-gift"></i>
        {game.i18n.localize("DH2E.GMGrant.GrantButton")}
    </button>
</div>

<style lang="scss">
    .grant-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-sm);
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .field-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .field-select {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-primary);

        &:focus { border-color: var(--dh2e-gold-muted); outline: none; }
    }

    .type-tabs {
        display: flex;
        gap: 2px;
    }
    .type-tab {
        flex: 1;
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.03em;

        &:hover { border-color: var(--dh2e-gold-muted); color: var(--dh2e-text-primary); }
        &.active {
            background: var(--dh2e-gold-dark);
            border-color: var(--dh2e-gold);
            color: var(--dh2e-bg-darkest);
            font-weight: 700;
        }
    }

    .search-input {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-primary);

        &::placeholder { color: var(--dh2e-text-secondary); opacity: 0.6; }
        &:focus { border-color: var(--dh2e-gold-muted); outline: none; }
    }

    .item-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-height: 100px;
    }
    .item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        cursor: pointer;
        text-align: left;

        &:hover { border-color: var(--dh2e-gold-muted); }
        &.selected {
            border-color: var(--dh2e-gold);
            background: rgba(200, 168, 78, 0.1);
        }
    }
    .item-name {
        font-size: var(--dh2e-text-sm);
        font-weight: 600;
        color: var(--dh2e-text-primary);
    }
    .item-sublabel {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
    }

    .flavor-row {
        margin-top: auto;
    }
    .flavor-input {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-primary);
        font-family: var(--dh2e-font-header, serif);
        font-style: italic;
        resize: vertical;

        &::placeholder { color: var(--dh2e-text-secondary); opacity: 0.5; }
        &:focus { border-color: var(--dh2e-gold-muted); outline: none; }
    }

    .grant-btn {
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        background: var(--dh2e-gold-dark);
        color: var(--dh2e-bg-darkest);
        border: 1px solid var(--dh2e-gold);
        border-radius: var(--dh2e-radius-sm);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        font-size: var(--dh2e-text-sm);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        i { margin-right: 6px; }
        &:hover:not(:disabled) { background: var(--dh2e-gold); }
        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: var(--dh2e-bg-mid);
            color: var(--dh2e-text-secondary);
            border-color: var(--dh2e-border);
        }
    }

    .empty-state {
        padding: var(--dh2e-space-lg);
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
    }
</style>
