<script lang="ts">
    import type { RequisitionRequestPayload, RequisitionRequestItem } from "./requisition-request-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    // --- Cart state ---
    interface CartItem {
        id: string;
        name: string;
        uuid?: string;
        type?: string;
        availability: string;
        craftsmanship: string;
        img?: string;
    }

    let cartItems: CartItem[] = $state([]);

    // --- Staging area for next item to add ---
    let mode: "compendium" | "custom" = $state("compendium");
    let searchQuery = $state("");
    let selectedItem: { name: string; uuid: string; type: string; availability: string; img: string } | null = $state(null);
    let customItemName = $state("");
    let availability = $state("common");
    let craftsmanship = $state("common");

    // --- Shared fields ---
    let modifications = $state("");

    // --- Roll state ---
    let rollResult: {
        rollResult: number;
        targetNumber: number;
        success: boolean;
        degrees: number;
        influenceLost: boolean;
    } | null = $state(null);
    let rolling = $state(false);

    // --- Derived: filtered compendium items ---
    const filteredItems = $derived(() => {
        const items = ctx.compendiumItems ?? [];
        if (!searchQuery.trim()) return items.slice(0, 50);
        const q = searchQuery.toLowerCase();
        return items.filter((i: any) =>
            i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q),
        ).slice(0, 50);
    });

    // --- Derived: staging item name ---
    const stagingName = $derived(mode === "compendium" ? (selectedItem?.name ?? "") : customItemName);
    const canAdd = $derived(stagingName.length > 0);

    // --- Derived: per-item penalty helper ---
    function getItemMod(item: CartItem): number {
        const availConfig = (ctx.availOptions ?? []).find((t: any) => t.key === item.availability);
        const craftConfig = (ctx.craftOptions ?? []).find((t: any) => t.key === item.craftsmanship);
        return (availConfig?.modifier ?? 0) + (craftConfig?.modifier ?? 0);
    }

    function getAvailLabel(key: string): string {
        return (ctx.availOptions ?? []).find((t: any) => t.key === key)?.label ?? key;
    }

    function getCraftLabel(key: string): string {
        return (ctx.craftOptions ?? []).find((t: any) => t.key === key)?.label ?? key;
    }

    // --- Derived: batch cost breakdown ---
    const worstMod = $derived(
        cartItems.length > 0
            ? Math.min(...cartItems.map(i => getItemMod(i)))
            : 0,
    );
    const influence = $derived(ctx.influence ?? 25);
    const targetNumber = $derived(Math.max(1, Math.min(100, influence + worstMod)));

    // --- Derived: can roll / can send ---
    const canRoll = $derived(cartItems.length > 0 && !rolling && rollResult === null);
    const canSend = $derived(rollResult !== null);

    // --- Actions ---
    function selectCompendiumItem(item: any) {
        selectedItem = item;
        const availKey = (item.availability ?? "common").toLowerCase();
        const match = (ctx.availOptions ?? []).find((t: any) => t.key === availKey);
        if (match) availability = match.key;
    }

    function addToCart() {
        if (!canAdd) return;
        const item: CartItem = {
            id: fu.randomID(),
            name: stagingName,
            uuid: selectedItem?.uuid,
            type: selectedItem?.type,
            availability,
            craftsmanship,
            img: selectedItem?.img,
        };
        cartItems = [...cartItems, item];

        // Reset staging
        selectedItem = null;
        customItemName = "";
        searchQuery = "";
        availability = "common";
        craftsmanship = "common";

        // Clear roll result since cart changed
        rollResult = null;
    }

    function removeFromCart(id: string) {
        cartItems = cartItems.filter(i => i.id !== id);
        rollResult = null;
    }

    async function doRoll() {
        if (!canRoll) return;
        rolling = true;
        rollResult = null;
        try {
            const result = await ctx.onRoll?.({
                items: cartItems.map(i => ({
                    name: i.name,
                    uuid: i.uuid,
                    type: i.type,
                    availability: i.availability,
                    craftsmanship: i.craftsmanship,
                    img: i.img,
                })),
                modifications,
            });
            if (result) rollResult = result;
        } finally {
            rolling = false;
        }
    }

    async function sendToGM() {
        if (!rollResult || !ctx.actor) return;

        // Resolve full item data for each cart item
        const items: RequisitionRequestItem[] = [];
        for (const ci of cartItems) {
            let itemData: object = {};
            if (ci.uuid) {
                try {
                    const doc = await fromUuid(ci.uuid);
                    if (doc) itemData = (doc as any).toObject();
                } catch { /* use empty */ }
            }
            items.push({
                itemData,
                itemName: ci.name,
                craftsmanship: ci.craftsmanship,
                availability: ci.availability,
            });
        }

        const g = game as any;
        const payload: RequisitionRequestPayload = {
            items,
            modifications,
            requestedBy: g.user?.name ?? "Unknown",
            requestedFor: ctx.actor?.uuid ?? "",
            actorName: ctx.actor?.name ?? "Unknown",
            rollResult: rollResult.rollResult,
            targetNumber: rollResult.targetNumber,
            success: rollResult.success,
            degrees: rollResult.degrees,
            influenceLost: rollResult.influenceLost,
            userId: g.user?.id ?? "",
        };

        ctx.onSendToGM?.(payload);
    }

    function formatMod(val: number): string {
        return val >= 0 ? `+${val}` : `${val}`;
    }
</script>

<div class="requisition-request">
    <!-- Mode toggle -->
    <div class="mode-toggle">
        <button class="mode-btn" class:active={mode === "compendium"} onclick={() => mode = "compendium"}>
            <i class="fa-solid fa-book"></i> From Compendium
        </button>
        <button class="mode-btn" class:active={mode === "custom"} onclick={() => mode = "custom"}>
            <i class="fa-solid fa-pen"></i> Custom
        </button>
    </div>

    <!-- Item selection (staging area) -->
    {#if mode === "compendium"}
        <div class="item-search">
            <input
                type="text"
                placeholder={game.i18n?.localize("DH2E.Requisition.SearchCompendium") ?? "Search items..."}
                bind:value={searchQuery}
            />
            {#if selectedItem}
                <div class="selected-item">
                    <i class="fa-solid fa-check"></i>
                    <span>{selectedItem.name}</span>
                    <button class="clear-btn" onclick={() => selectedItem = null}>&times;</button>
                </div>
            {/if}
            <div class="item-results">
                {#each filteredItems() as item (item.uuid)}
                    <button
                        class="result-row"
                        class:selected={selectedItem?.uuid === item.uuid}
                        onclick={() => selectCompendiumItem(item)}
                    >
                        <span class="result-name">{item.name}</span>
                        <span class="result-type">{item.type}</span>
                    </button>
                {:else}
                    <p class="no-results">No items found.</p>
                {/each}
            </div>
        </div>
    {:else}
        <div class="custom-item">
            <label for="custom-name">{game.i18n?.localize("DH2E.Requisition.ItemName") ?? "Item Name"}</label>
            <input id="custom-name" type="text" bind:value={customItemName} />
        </div>
    {/if}

    <!-- Per-item options (staging) -->
    <div class="options-section">
        <div class="field-row">
            <label for="avail-select">{game.i18n?.localize("DH2E.Requisition.Availability") ?? "Availability"}</label>
            <select id="avail-select" bind:value={availability}>
                {#each ctx.availOptions ?? [] as tier}
                    <option value={tier.key}>{tier.label}</option>
                {/each}
            </select>
        </div>

        <div class="field-row">
            <label for="craft-select">{game.i18n?.localize("DH2E.Requisition.Craftsmanship") ?? "Craftsmanship"}</label>
            <select id="craft-select" bind:value={craftsmanship}>
                {#each ctx.craftOptions ?? [] as tier}
                    <option value={tier.key}>{tier.label} ({formatMod(tier.modifier)})</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- Add to Cart button -->
    <button class="btn-add-cart" onclick={addToCart} disabled={!canAdd}>
        <i class="fa-solid fa-cart-plus"></i>
        {game.i18n?.localize("DH2E.Requisition.AddToCart") ?? "Add to Cart"}
    </button>

    <!-- Cart list -->
    {#if cartItems.length > 0}
        <div class="cart-section">
            <h4 class="cart-header">
                <i class="fa-solid fa-cart-shopping"></i>
                {game.i18n?.localize("DH2E.Requisition.Cart") ?? "Cart"} ({cartItems.length})
            </h4>
            <div class="cart-list">
                {#each cartItems as item (item.id)}
                    <div class="cart-row">
                        <span class="cart-item-name">{item.name}</span>
                        <span class="avail-tag avail-{item.availability}">{getAvailLabel(item.availability)}</span>
                        <span class="craft-badge craft-{item.craftsmanship}">{getCraftLabel(item.craftsmanship)}</span>
                        <span class="cart-item-mod">{formatMod(getItemMod(item))}</span>
                        <button class="cart-remove" onclick={() => removeFromCart(item.id)}>&times;</button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Modifications (batch-level) -->
    {#if cartItems.length > 0}
        <div class="options-section">
            <div class="field-row">
                <label for="modifications">{game.i18n?.localize("DH2E.Requisition.Modifications") ?? "Notes"}</label>
                <textarea
                    id="modifications"
                    bind:value={modifications}
                    placeholder={game.i18n?.localize("DH2E.Requisition.ModificationsHint") ?? "Free-text notes..."}
                    rows="2"
                ></textarea>
            </div>
        </div>
    {/if}

    <!-- Cost Breakdown -->
    {#if cartItems.length > 0}
        <div class="cost-breakdown">
            <h4>{game.i18n?.localize("DH2E.Requisition.CostBreakdown") ?? "Cost Breakdown"}</h4>
            <div class="cost-row">
                <span>{game.i18n?.localize("DH2E.Requisition.WorstPenalty") ?? "Worst Item Penalty"}</span>
                <span class="cost-value total-mod">{formatMod(worstMod)}</span>
            </div>
            <div class="cost-row">
                <span>{game.i18n?.localize("DH2E.Requisition.CharacterInfluence") ?? "Character Influence"}</span>
                <span class="cost-value">{influence}</span>
            </div>
            <div class="cost-row target-row">
                <span>{game.i18n?.localize("DH2E.Requisition.TargetNumber") ?? "Target Number"}</span>
                <span class="cost-value target-number">{targetNumber}</span>
            </div>
        </div>
    {/if}

    <!-- Roll result -->
    {#if rollResult}
        <div class="roll-result" class:success={rollResult.success} class:failure={!rollResult.success}>
            <div class="roll-header">
                <span class="roll-value">Roll: {rollResult.rollResult} vs {rollResult.targetNumber}</span>
                <span class="roll-outcome">
                    {rollResult.success ? "Success" : "Failure"}
                    ({rollResult.degrees} {rollResult.success ? "DoS" : "DoF"})
                </span>
            </div>
            {#if rollResult.influenceLost}
                <p class="influence-lost">
                    <i class="fa-solid fa-arrow-down"></i>
                    {game.i18n?.localize("DH2E.Requisition.InfluenceLost") ?? "Lost 1 Influence (3+ DoF)"}
                </p>
            {/if}
        </div>
    {/if}

    <!-- Action buttons -->
    <div class="dialog-buttons">
        {#if !rollResult}
            <button class="btn-roll" onclick={doRoll} disabled={!canRoll}>
                <i class="fa-solid fa-dice-d20"></i>
                {game.i18n?.localize("DH2E.Requisition.Roll") ?? "Roll Requisition"}
            </button>
        {:else}
            <button class="btn-send" onclick={sendToGM} disabled={!canSend}>
                <i class="fa-solid fa-paper-plane"></i>
                {game.i18n?.localize("DH2E.Requisition.SendRequest") ?? "Send to GM"}
            </button>
        {/if}
        <button class="btn-cancel" onclick={() => ctx.close?.()}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .requisition-request {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .mode-toggle {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .mode-btn {
        flex: 1;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        cursor: pointer;

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .item-search {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);

        input {
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }
    }

    .selected-item {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: rgba(200, 168, 78, 0.15);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);

        i { color: var(--dh2e-gold, #c8a84e); }
    }

    .clear-btn {
        margin-left: auto;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 1rem;
        padding: 0 0.25rem;
        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .item-results {
        max-height: 8rem;
        overflow-y: auto;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .result-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-align: left;

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.selected { background: rgba(200, 168, 78, 0.15); }
    }

    .result-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: capitalize;
    }

    .no-results {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        margin: 0;
    }

    .custom-item {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);

        label {
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
        }

        input {
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }
    }

    .options-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);

        label {
            flex: 0 0 auto;
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
            min-width: 7rem;
        }

        select, input, textarea {
            flex: 1;
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }

        textarea {
            resize: vertical;
            font-family: inherit;
            font-size: var(--dh2e-text-sm, 0.8rem);
        }
    }

    .btn-add-cart {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px dashed var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
        cursor: pointer;
        font-weight: 600;

        &:hover { background: rgba(200, 168, 78, 0.15); }
        &:disabled { opacity: 0.4; cursor: not-allowed; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .cart-section {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .cart-header {
        margin: 0;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);

        i { margin-right: 4px; }
    }

    .cart-list {
        max-height: 10rem;
        overflow-y: auto;
    }

    .cart-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:last-child { border-bottom: none; }
    }

    .cart-item-name {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .avail-tag {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 1px 4px;
        border-radius: 2px;
        color: var(--dh2e-text-secondary, #a0a0a8);
        background: var(--dh2e-bg-mid, #2e2e35);
    }

    .craft-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1px 6px;
        border-radius: 2px;
        font-weight: 700;

        &.craft-poor { background: #4a3020; color: #c88050; }
        &.craft-common { background: #303040; color: #a0a0b0; }
        &.craft-good { background: #203040; color: #60a0c0; }
        &.craft-best { background: #3a3020; color: var(--dh2e-gold, #c8a84e); }
    }

    .cart-item-mod {
        font-size: 0.7rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
    }

    .cart-remove {
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0 2px;
        line-height: 1;

        &:hover { color: #d66; }
    }

    .cost-breakdown {
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: rgba(200, 168, 78, 0.05);

        h4 {
            margin: 0 0 var(--dh2e-space-xs, 0.25rem);
            font-family: var(--dh2e-font-header, serif);
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-gold, #c8a84e);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    }

    .cost-row {
        display: flex;
        justify-content: space-between;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: 1px 0;
    }

    .cost-value {
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .total-mod {
        color: var(--dh2e-gold-muted, #7a6a3e);
    }

    .target-row {
        border-top: 1px solid var(--dh2e-gold-dark, #9c7a28);
        margin-top: var(--dh2e-space-xxs, 0.125rem);
        padding-top: var(--dh2e-space-xs, 0.25rem);
    }

    .target-number {
        font-size: 1.1rem;
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
    }

    .roll-result {
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
        text-align: center;

        &.success {
            background: rgba(80, 180, 80, 0.15);
            border: 1px solid rgba(80, 180, 80, 0.4);
        }
        &.failure {
            background: rgba(200, 60, 60, 0.15);
            border: 1px solid rgba(200, 60, 60, 0.4);
        }
    }

    .roll-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .roll-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .roll-outcome {
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);

        .success & { color: #6c6; }
        .failure & { color: #d66; }
    }

    .influence-lost {
        margin: var(--dh2e-space-xs, 0.25rem) 0 0;
        font-size: 0.75rem;
        color: #d66;

        i { margin-right: 3px; }
    }

    .dialog-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .btn-roll, .btn-send {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-gold-muted, #7a6a3e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .btn-send {
        background: rgba(80, 180, 80, 0.3);
        border-color: rgba(80, 180, 80, 0.6);

        &:hover { background: rgba(80, 180, 80, 0.5); color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .btn-cancel {
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
    }
</style>
