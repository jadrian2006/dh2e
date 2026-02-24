<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const payload = $derived(ctx.payload);

    let delivery: "immediate" | "delayed" = $state("immediate");
    let delayAmount = $state(1);
    let delayUnit: "minutes" | "hours" | "days" = $state("hours");

    const delayMs = $derived(() => {
        const multipliers = { minutes: 60000, hours: 3600000, days: 86400000 };
        return delayAmount * multipliers[delayUnit];
    });

    function formatMod(val: number): string {
        return val >= 0 ? `+${val}` : `${val}`;
    }

    function approve() {
        ctx.onApprove?.(delivery, delivery === "delayed" ? delayMs() : 0);
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

    <!-- Item details -->
    <div class="item-details">
        <div class="item-name-row">
            <span class="item-name">{payload.itemName}</span>
            <span class="craft-badge craft-{payload.craftsmanship}">{ctx.craftLabel}</span>
        </div>
        {#if payload.modifications}
            <p class="modifications">
                <i class="fa-solid fa-wrench fa-xs"></i>
                {payload.modifications}
            </p>
        {/if}
    </div>

    <!-- Cost breakdown -->
    <div class="cost-breakdown">
        <div class="cost-row">
            <span>Availability</span>
            <span class="cost-value">{ctx.availLabel} ({formatMod(ctx.availMod)})</span>
        </div>
        <div class="cost-row">
            <span>Craftsmanship</span>
            <span class="cost-value">{ctx.craftLabel} ({formatMod(ctx.craftMod)})</span>
        </div>
        <div class="cost-row">
            <span>Character Influence</span>
            <span class="cost-value">{payload.targetNumber - ctx.availMod - ctx.craftMod}</span>
        </div>
        <div class="cost-row target-row">
            <span>Target Number</span>
            <span class="cost-value target-number">{payload.targetNumber}</span>
        </div>
        <div class="cost-row roll-row" class:success={payload.success} class:failure={!payload.success}>
            <span>Roll</span>
            <span class="cost-value">
                <strong>{payload.rollResult}</strong> —
                {payload.success ? "Success" : "Failure"}
                ({payload.degrees} {payload.success ? "DoS" : "DoF"})
            </span>
        </div>
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
        <button class="approve-btn" onclick={approve}>
            <i class="fa-solid fa-check"></i>
            {game.i18n?.localize("DH2E.Requisition.Approve") ?? "Approve"}
        </button>
        <button class="deny-btn" onclick={deny}>
            <i class="fa-solid fa-xmark"></i>
            {game.i18n?.localize("DH2E.Requisition.Deny") ?? "Deny"}
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

    .item-details {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .item-name-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .item-name {
        font-family: var(--dh2e-font-header, serif);
        font-size: 1rem;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .craft-badge {
        font-size: 0.65rem;
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

    .modifications {
        margin: var(--dh2e-space-xs, 0.25rem) 0 0;
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
