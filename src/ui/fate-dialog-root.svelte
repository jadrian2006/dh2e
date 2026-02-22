<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    let confirmBurn = $state(false);
    let burnAction = $state("");

    function spend(action: string) {
        if (ctx.fateValue <= 0) return;
        ctx.onAction?.(action, false);
    }

    function initBurn(action: string) {
        burnAction = action;
        confirmBurn = true;
    }

    function confirmBurnAction() {
        ctx.onAction?.(burnAction, true);
    }

    function cancelBurn() {
        confirmBurn = false;
        burnAction = "";
    }
</script>

<div class="fate-dialog">
    <div class="fate-header">
        <span class="fate-label">Fate Points</span>
        <span class="fate-display">{ctx.fateValue} / {ctx.fateMax}</span>
    </div>

    {#if !confirmBurn}
        <div class="fate-section">
            <h4 class="section-label">Spend (costs 1 Fate)</h4>
            <button class="fate-btn spend" onclick={() => spend("reroll")} disabled={ctx.fateValue <= 0}>
                <span class="btn-label">Re-roll</span>
                <span class="btn-desc">Re-roll a failed test</span>
            </button>
            <button class="fate-btn spend" onclick={() => spend("plus10")} disabled={ctx.fateValue <= 0}>
                <span class="btn-label">+10 Bonus</span>
                <span class="btn-desc">Add +10 to your next test</span>
            </button>
            <button class="fate-btn spend" onclick={() => spend("halfWounds")} disabled={ctx.fateValue <= 0}>
                <span class="btn-label">Halve Damage</span>
                <span class="btn-desc">Halve wounds from a single hit</span>
            </button>
        </div>

        <div class="fate-section burn-section">
            <h4 class="section-label burn-label">Burn (permanent!)</h4>
            <button class="fate-btn burn" onclick={() => initBurn("survive")} disabled={ctx.fateMax <= 0}>
                <span class="btn-label">Survive</span>
                <span class="btn-desc">Escape certain death</span>
            </button>
            <button class="fate-btn burn" onclick={() => initBurn("autoPass")} disabled={ctx.fateMax <= 0}>
                <span class="btn-label">Auto-Pass</span>
                <span class="btn-desc">Automatically succeed (1 DoS)</span>
            </button>
        </div>

        <button class="cancel-btn" onclick={() => ctx.onCancel?.()}>Cancel</button>
    {:else}
        <div class="confirm-burn">
            <p class="burn-warning">This will permanently reduce your maximum Fate Points by 1. This cannot be undone.</p>
            <div class="confirm-buttons">
                <button class="fate-btn burn confirm" onclick={confirmBurnAction}>
                    Burn Fate Point
                </button>
                <button class="cancel-btn" onclick={cancelBurn}>Go Back</button>
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .fate-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .fate-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-light, #e8dcc8);
        border: 2px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-md, 6px);
    }

    .fate-label {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-text-dark, #2c2420);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .fate-display {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--dh2e-gold-dark, #9c7a28);
    }

    .section-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-xs, 0.25rem);

        &.burn-label { color: var(--dh2e-red-bright, #d44); }
    }

    .fate-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .fate-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);
        width: 100%;
        text-align: left;

        &.spend {
            background: var(--dh2e-bg-mid, #2e2e35);
            &:hover:not(:disabled) {
                border-color: var(--dh2e-gold, #c8a84e);
                background: rgba(200, 168, 78, 0.1);
            }
        }

        &.burn {
            background: rgba(168, 48, 48, 0.1);
            border-color: rgba(168, 48, 48, 0.3);
            &:hover:not(:disabled) {
                border-color: var(--dh2e-red-bright, #d44);
                background: rgba(168, 48, 48, 0.2);
            }
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    .btn-label {
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .btn-desc {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .confirm-burn {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .burn-warning {
        color: var(--dh2e-red-bright, #d44);
        font-weight: 600;
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
        border: 2px solid var(--dh2e-red-bright, #d44);
        border-radius: var(--dh2e-radius-md, 6px);
        background: rgba(168, 48, 48, 0.1);
    }

    .confirm-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .confirm {
        flex: 1;
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
