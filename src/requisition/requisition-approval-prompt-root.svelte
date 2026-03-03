<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const payload = $derived(ctx.payload);
    const itemDisplayData: {
        itemName: string;
        availability: string;
        craftsmanship: string;
        availLabel: string;
        availMod: number;
        craftLabel: string;
        craftMod: number;
        targetNumber: number;
        success: boolean;
        degrees: number;
        itemInfluenceLost: boolean;
        itemRollResult: number;
        modifications: { uuid: string; name: string; availability: string; modifier: number }[];
    }[] = $derived(ctx.itemDisplayData ?? []);

    /** Strip modifier suffix like " (+0)" or " (-30)" from availability labels */
    function cleanAvailLabel(label: string): string {
        return label.replace(/\s*\([+-]?\d+\)\s*$/, '').trim();
    }

    // Per-item checkbox state (all checked by default)
    let checkedItems: boolean[] = $state(
        Array.from({ length: (ctx.itemDisplayData ?? []).length }, () => true),
    );

    let delivery: "immediate" | "delayed" = $state("immediate");
    let delayAmount = $state(1);
    let delayUnit: "minutes" | "hours" | "days" = $state("hours");

    const delayMs = $derived.by(() => {
        const multipliers = { minutes: 60000, hours: 3600000, days: 86400000 };
        return delayAmount * multipliers[delayUnit];
    });

    const approvedCount = $derived(checkedItems.filter(Boolean).length);
    const allChecked = $derived(approvedCount === itemDisplayData.length);
    const noneChecked = $derived(approvedCount === 0);

    function toggleAll() {
        const newVal = !allChecked;
        checkedItems = checkedItems.map(() => newVal);
    }

    function formatMod(val: number): string {
        return val >= 0 ? `+${val}` : `${val}`;
    }

    /** Resolve availability label for a modification from config */
    function getModAvailLabel(key: string): string {
        const availConfig = CONFIG.DH2E?.availabilityTiers?.[key] as { label: string } | undefined;
        return availConfig ? (game.i18n?.localize(availConfig.label) ?? key) : key;
    }

    function approve() {
        const indices = checkedItems.map((checked, i) => checked ? i : -1).filter(i => i >= 0);
        ctx.onApprove?.(indices, delivery, delivery === "delayed" ? delayMs : 0);
    }

    function deny() {
        ctx.onDeny?.();
    }
</script>

<div class="requisition-approval">
    <!-- Request header -->
    <div class="request-header">
        <i class="fa-solid fa-coins"></i>
        <span class="header-label">Requisition Request</span>
    </div>

    <div class="request-info">
        <p class="info-line"><strong>{payload.requestedBy}</strong> requests for <strong>{payload.actorName}</strong></p>
    </div>

    <!-- Item list with checkboxes -->
    <div class="items-section">
        <div class="items-header">
            <label class="select-all-label">
                <input type="checkbox" checked={allChecked} onchange={toggleAll} />
                <span>{game.i18n?.localize("DH2E.Requisition.SelectAll") ?? "Select All"}</span>
            </label>
            <span class="items-count">{approvedCount}/{itemDisplayData.length}</span>
        </div>
        <div class="items-list">
            {#each itemDisplayData as item, i (i)}
                <label class="item-row" class:unchecked={!checkedItems[i]} class:success={item.success} class:failure={!item.success}>
                    <input type="checkbox" bind:checked={checkedItems[i]} />
                    <span class="item-name">{item.itemName}</span>
                    <span class="avail-tag">{cleanAvailLabel(item.availLabel)}</span>
                    <span class="craft-badge craft-{item.craftsmanship}">{cleanAvailLabel(item.craftLabel)}</span>
                    <span class="item-tn">TN:{item.targetNumber}</span>
                    {#if payload.rollMode === "individual" && item.itemRollResult}
                        <span class="item-roll">{item.itemRollResult}</span>
                    {/if}
                    <span class="item-result" class:pass={item.success} class:fail={!item.success}>
                        {item.success ? "+" : "-"}{item.degrees}
                    </span>
                    {#if item.itemInfluenceLost}
                        <i class="fa-solid fa-arrow-down item-inf-loss" title="Influence Lost"></i>
                    {/if}
                </label>
                {#if (item.modifications ?? []).length > 0}
                    {#each item.modifications as mod (mod.uuid)}
                        <div class="item-mod-row" class:unchecked={!checkedItems[i]}>
                            <span class="item-mod-indent">+</span>
                            <span class="item-mod-name">{mod.name}</span>
                            <span class="avail-tag sm">{cleanAvailLabel(getModAvailLabel(mod.availability))}</span>
                            <span class="item-mod-mod">{formatMod(mod.modifier)}</span>
                        </div>
                    {/each}
                {/if}
            {/each}
        </div>
    </div>

    <!-- Notes -->
    {#if payload.notes}
        <div class="modifications">
            <i class="fa-solid fa-pen fa-xs"></i>
            {payload.notes}
        </div>
    {/if}

    <!-- Roll summary -->
    <div class="cost-breakdown">
        {#if payload.rollMode === "bulk" || !payload.rollMode}
            <div class="cost-row roll-row">
                <span>{game.i18n?.localize("DH2E.Requisition.RawRoll") ?? "Raw Roll"}</span>
                <span class="cost-value roll-d100">{payload.rollResult}</span>
            </div>
        {:else}
            <div class="cost-row">
                <span>{game.i18n?.localize("DH2E.Requisition.RollMode") ?? "Roll Mode"}</span>
                <span class="cost-value">{game.i18n?.localize("DH2E.Requisition.IndividualRoll") ?? "Individual"}</span>
            </div>
        {/if}
        {#if payload.influenceLost}
            <div class="cost-row influence-lost">
                <span>Influence Lost</span>
                <span class="cost-value">Yes (3+ DoF)</span>
            </div>
        {/if}
    </div>

    <!-- Delivery options -->
    <div class="delivery-section">
        <label class="delivery-label">Delivery</label>
        <div class="delivery-options">
            <label class="radio-label">
                <input type="radio" bind:group={delivery} value="immediate" />
                {game.i18n?.localize("DH2E.Requisition.Immediate") ?? "Immediate"}
            </label>
            <label class="radio-label">
                <input type="radio" bind:group={delivery} value="delayed" />
                {game.i18n?.localize("DH2E.Requisition.Delayed") ?? "Delayed"}
            </label>
        </div>
        {#if delivery === "delayed"}
            <div class="delay-input">
                <input type="number" bind:value={delayAmount} min="1" max="999" />
                <select bind:value={delayUnit}>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                </select>
            </div>
        {/if}
    </div>

    <!-- Action buttons -->
    <div class="button-row">
        <button class="approve-btn" onclick={approve} disabled={noneChecked}>
            <i class="fa-solid fa-check"></i>
            {#if approvedCount < itemDisplayData.length && approvedCount > 0}
                {game.i18n?.localize("DH2E.Requisition.ApproveSelected") ?? "Approve"} ({approvedCount})
            {:else}
                {game.i18n?.localize("DH2E.Requisition.Approve") ?? "Approve"}
            {/if}
        </button>
        <button class="deny-btn" onclick={deny}>
            <i class="fa-solid fa-xmark"></i>
            {game.i18n?.localize("DH2E.Requisition.Deny") ?? "Deny All"}
        </button>
    </div>
</div>

<style lang="scss">
    .requisition-approval {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .request-header {
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;

        i {
            color: var(--dh2e-gold-muted, #7a6a3e);
            margin-right: 4px;
        }
    }

    .request-info {
        text-align: center;

        p {
            margin: 0;
            font-size: var(--dh2e-text-sm, 0.85rem);
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }

    .items-section {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .items-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .select-all-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .items-count {
        font-size: 0.7rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
    }

    .items-list {
        max-height: 12rem;
        overflow-y: auto;
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:last-child { border-bottom: none; }
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.unchecked { opacity: 0.45; }
    }

    .item-name {
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

        &.sm {
            font-size: 0.5rem;
            padding: 0 3px;
        }
    }

    .item-roll {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        min-width: 1.5rem;
        text-align: center;
    }

    .item-mod-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 0 var(--dh2e-space-sm, 0.5rem) 0 calc(var(--dh2e-space-sm, 0.5rem) + 1.25rem);
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);

        &.unchecked { opacity: 0.45; }
    }

    .item-mod-indent {
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
    }

    .item-mod-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-mod-mod {
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
        color: var(--dh2e-text-secondary, #a0a0a8);
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

    .item-tn {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
    }

    .item-result {
        font-size: 0.7rem;
        font-weight: 700;
        min-width: 1.5rem;
        text-align: right;

        &.pass { color: #6c6; }
        &.fail { color: #d66; }
    }

    .item-inf-loss {
        color: #d66;
        font-size: 0.55rem;
    }

    .item-row.success {
        border-left: 2px solid rgba(80, 180, 80, 0.4);
    }

    .item-row.failure {
        border-left: 2px solid rgba(200, 60, 60, 0.4);
    }

    .roll-d100 {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
    }

    .modifications {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;

        i { margin-right: 3px; }
    }

    .cost-breakdown {
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: rgba(200, 168, 78, 0.05);
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

    .target-row {
        border-top: 1px solid var(--dh2e-gold-dark, #9c7a28);
        margin-top: 2px;
        padding-top: var(--dh2e-space-xs, 0.25rem);
    }

    .target-number {
        font-size: 1.1rem;
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
    }

    .roll-row {
        margin-top: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) 0;

        &.success .cost-value { color: #6c6; }
        &.failure .cost-value { color: #d66; }
    }

    .influence-lost {
        .cost-value { color: #d66; font-weight: 700; }
    }

    .delivery-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .delivery-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .delivery-options {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
    }

    .delay-input {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: center;

        input {
            width: 4rem;
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem);
            text-align: center;
        }

        select {
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem);
        }
    }

    .button-row {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        margin-top: var(--dh2e-space-sm, 0.5rem);
    }

    .approve-btn {
        flex: 1;
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

        i { margin-right: 4px; }
        &:hover { background: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .deny-btn {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        i { margin-right: 4px; }
        &:hover {
            background: var(--dh2e-bg-dark, #1a1a1f);
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }
</style>
