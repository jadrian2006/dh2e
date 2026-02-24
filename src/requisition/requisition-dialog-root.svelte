<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    let availability = $state(ctx.defaultAvailability ?? "common");
    let extraModifier = $state(0);

    const selectedTier = $derived(
        (ctx.availOptions ?? []).find((t: any) => t.key === availability),
    );

    function confirm() {
        ctx.onConfirm?.(availability, extraModifier);
    }

    function cancel() {
        ctx.onCancel?.();
    }
</script>

<div class="requisition-dialog">
    <div class="item-header">
        <h3>{ctx.itemName}</h3>
    </div>

    <div class="field-row">
        <label for="avail-select">Availability</label>
        <select id="avail-select" bind:value={availability}>
            {#each ctx.availOptions ?? [] as tier}
                <option value={tier.key}>{tier.label}</option>
            {/each}
        </select>
    </div>

    {#if selectedTier}
        <div class="avail-modifier">
            <span>Modifier: {selectedTier.modifier >= 0 ? "+" : ""}{selectedTier.modifier}</span>
        </div>
    {/if}

    <div class="field-row">
        <label for="extra-mod">Situational Modifier</label>
        <input id="extra-mod" type="number" bind:value={extraModifier} step="5" />
    </div>

    <div class="dialog-buttons">
        <button class="btn-confirm" onclick={confirm}>
            <i class="fa-solid fa-coins"></i> Requisition
        </button>
        <button class="btn-cancel" onclick={cancel}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .requisition-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .item-header h3 {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #b49545);
        text-align: center;
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);

        label {
            flex: 0 0 auto;
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
            min-width: 8rem;
        }

        select, input {
            flex: 1;
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }
    }

    .avail-modifier {
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold-muted, #7a6a3e);
    }

    .dialog-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: flex-end;
    }

    .btn-confirm {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-gold-muted, #7a6a3e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }
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
