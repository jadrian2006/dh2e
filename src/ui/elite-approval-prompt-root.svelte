<script lang="ts">
    import type { EliteApprovalPayload } from "./elite-approval-prompt.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const payload: EliteApprovalPayload = $derived(ctx.payload);
</script>

<div class="elite-approval-prompt">
    <p class="request-header">
        <i class="fa-solid fa-shield-halved"></i>
        {game.i18n.localize("DH2E.EliteApproval.PromptTitle")}
    </p>

    <p class="request-body">
        {game.i18n.format("DH2E.EliteApproval.PromptBody", {
            player: payload.userName,
            advance: payload.advanceName,
            actor: payload.actorName,
            cost: String(payload.cost),
        })}
    </p>

    {#if payload.prerequisites}
        <p class="prereqs-summary">
            <i class="fa-solid fa-lock fa-xs"></i>
            {payload.prerequisites}
        </p>
    {/if}

    <div class="button-row">
        <button class="approve-btn" onclick={() => ctx.onApprove?.()}>
            <i class="fa-solid fa-check"></i>
            Approve
        </button>
        <button class="deny-btn" onclick={() => ctx.onDeny?.()}>
            <i class="fa-solid fa-xmark"></i>
            Deny
        </button>
    </div>
</div>

<style lang="scss">
    .elite-approval-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-md, 0.75rem);
        text-align: center;
    }

    .request-header {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;

        i {
            color: rgba(168, 78, 200, 0.7);
            margin-right: 4px;
        }
    }

    .request-body {
        font-size: var(--dh2e-text-sm, 0.85rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        margin: 0;
        line-height: 1.4;
    }

    .prereqs-summary {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;

        i { margin-right: 3px; }
    }

    .button-row {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        margin-top: var(--dh2e-space-sm, 0.5rem);
        width: 100%;
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
