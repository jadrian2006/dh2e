<script lang="ts">
    import type { RollRequestPayload } from "./roll-request-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const payload: RollRequestPayload = $derived(ctx.payload);
    const hasThreshold = $derived((payload.dosThreshold ?? 0) > 0);
    const hasModifier = $derived((payload.modifier ?? 0) !== 0);

    function modifierLabel(value: number): string {
        return value > 0 ? `+${value}` : `${value}`;
    }
</script>

<div class="roll-request-prompt">
    <p class="gm-requests">{game.i18n.localize("DH2E.Request.Prompt.GMRequests")}</p>

    <h3 class="test-label">{payload.testLabel}</h3>

    {#if hasThreshold}
        <p class="threshold-info">
            {game.i18n.format("DH2E.Request.Prompt.NeedDoS", { count: String(payload.dosThreshold) })}
        </p>
    {/if}

    {#if hasModifier}
        <p class="modifier-info">
            {game.i18n.localize("DH2E.Request.Modifier")}: {modifierLabel(payload.modifier!)}
        </p>
    {/if}

    <div class="button-row">
        <button class="roll-btn" onclick={() => ctx.onRoll?.()}>
            {game.i18n.localize("DH2E.Request.Prompt.Roll")}
        </button>
        <button class="decline-btn" onclick={() => ctx.onDecline?.()}>
            {game.i18n.localize("DH2E.Request.Prompt.Decline")}
        </button>
    </div>
</div>

<style lang="scss">
    .roll-request-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-md, 0.75rem);
        text-align: center;
    }

    .gm-requests {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
    }

    .test-label {
        font-family: var(--dh2e-font-header, serif);
        font-size: 1.1rem;
        color: var(--dh2e-gold, #c8a84e);
        margin: 0;
    }

    .threshold-info {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
        margin: 0;
    }

    .modifier-info {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin: 0;
    }

    .button-row {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        margin-top: var(--dh2e-space-sm, 0.5rem);
        width: 100%;
    }

    .roll-btn {
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

        &:hover {
            background: var(--dh2e-gold, #c8a84e);
        }
    }

    .decline-btn {
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

        &:hover {
            background: var(--dh2e-bg-dark, #1a1a1f);
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }
</style>
