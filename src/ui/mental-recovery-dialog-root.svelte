<script lang="ts">
    import type { RecoveryRequest } from "./mental-recovery-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let insanityCount = $state(0);
    let corruptionCount = $state(0);

    const insanityTotal = $derived(insanityCount * (ctx.insanityCostPerPoint ?? 100));
    const corruptionTotal = $derived(corruptionCount * (ctx.corruptionCostPerPoint ?? 100));

    const canConfirmInsanity = $derived(
        insanityCount > 0 && insanityCount <= (ctx.insanity ?? 0) && insanityTotal <= (ctx.xpAvailable ?? 0),
    );
    const canConfirmCorruption = $derived(
        corruptionCount > 0 && corruptionCount <= (ctx.corruption ?? 0) && corruptionTotal <= (ctx.xpAvailable ?? 0),
    );

    function confirmInsanity() {
        if (!canConfirmInsanity) return;
        const request: RecoveryRequest = {
            stat: "insanity",
            count: insanityCount,
            perPointCost: ctx.insanityCostPerPoint,
            totalCost: insanityTotal,
        };
        ctx.onConfirm?.(request);
    }

    function confirmCorruption() {
        if (!canConfirmCorruption) return;
        const request: RecoveryRequest = {
            stat: "corruption",
            count: corruptionCount,
            perPointCost: ctx.corruptionCostPerPoint,
            totalCost: corruptionTotal,
        };
        ctx.onConfirm?.(request);
    }
</script>

<div class="recovery-dialog">
    <div class="recovery-header">
        <span class="header-name">{ctx.actorName}</span>
        <span class="header-xp">{ctx.xpAvailable} XP available</span>
    </div>

    <!-- Insanity Removal -->
    <div class="recovery-section">
        <h4 class="section-label">Insanity ({ctx.insanity} points)</h4>
        {#if ctx.insanity <= 0}
            <p class="section-empty">No insanity to remove.</p>
        {:else}
            <div class="recovery-row">
                <label class="recovery-input-label">
                    Remove
                    <input
                        class="recovery-input"
                        type="number"
                        min="0"
                        max={ctx.insanity}
                        bind:value={insanityCount}
                    />
                    points
                </label>
                <span class="cost-label">
                    @ {ctx.insanityCostPerPoint} XP each
                    {#if ctx.hasSerenity}
                        <span class="discount-label">(Serenity of the Green)</span>
                    {/if}
                </span>
            </div>
            <div class="recovery-confirm-row">
                <span class="total-cost" class:insufficient={insanityTotal > (ctx.xpAvailable ?? 0)}>
                    Total: {insanityTotal} XP
                </span>
                <button class="confirm-btn" onclick={confirmInsanity} disabled={!canConfirmInsanity}>
                    Confirm
                </button>
            </div>
        {/if}
    </div>

    <!-- Corruption Removal -->
    {#if ctx.corruptionRemovalEnabled}
        <div class="recovery-section corruption-section">
            <h4 class="section-label">Corruption ({ctx.corruption} points)</h4>
            {#if ctx.corruption <= 0}
                <p class="section-empty">No corruption to remove.</p>
            {:else}
                <div class="recovery-row">
                    <label class="recovery-input-label">
                        Remove
                        <input
                            class="recovery-input"
                            type="number"
                            min="0"
                            max={ctx.corruption}
                            bind:value={corruptionCount}
                        />
                        points
                    </label>
                    <span class="cost-label">
                        @ {ctx.corruptionCostPerPoint} XP each
                        {#if ctx.hasSerenity}
                            <span class="discount-label">(Serenity of the Green)</span>
                        {/if}
                    </span>
                </div>
                <div class="recovery-confirm-row">
                    <span class="total-cost" class:insufficient={corruptionTotal > (ctx.xpAvailable ?? 0)}>
                        Total: {corruptionTotal} XP
                    </span>
                    <button class="confirm-btn" onclick={confirmCorruption} disabled={!canConfirmCorruption}>
                        Confirm
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <button class="cancel-btn" onclick={() => ctx.onCancel?.()}>Cancel</button>
</div>

<style lang="scss">
    .recovery-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .recovery-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-light, #e8dcc8);
        border: 2px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-md, 6px);
    }

    .header-name {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-text-dark, #2c2420);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .header-xp {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--dh2e-gold-dark, #9c7a28);
    }

    .recovery-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35);
    }

    .corruption-section {
        border-color: rgba(168, 48, 48, 0.3);
    }

    .section-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
    }

    .section-empty {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }

    .recovery-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .recovery-input-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .recovery-input {
        width: 3.5rem;
        text-align: center;
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-dark, #1e1e24);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .cost-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .discount-label {
        color: var(--dh2e-green, #5a8a5a);
        font-style: italic;
    }

    .recovery-confirm-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--dh2e-space-xs, 0.25rem);
    }

    .total-cost {
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);

        &.insufficient {
            color: var(--dh2e-red-bright, #d44);
        }
    }

    .confirm-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        font-weight: 600;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &:hover:not(:disabled) {
            background: rgba(200, 168, 78, 0.15);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    .cancel-btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        width: 100%;

        &:hover {
            border-color: var(--dh2e-text-secondary, #a0a0a8);
        }
    }
</style>
