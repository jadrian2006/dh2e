<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    let mode = $state<"unfettered" | "pushed">("unfettered");
    let showDescription = $state(false);

    const prDisplay = $derived(
        mode === "pushed"
            ? `PR ${ctx.psyRating} x10 = +${ctx.psyRating * 10}`
            : `PR ${ctx.psyRating} x5 = +${ctx.psyRating * 5}`,
    );

    function confirm() {
        ctx.onConfirm?.(mode);
    }

    function cancel() {
        ctx.onCancel?.();
    }
</script>

<div class="focus-dialog">
    <div class="power-header">
        <h3 class="power-name">{ctx.powerName}</h3>
    </div>

    <div class="mode-select">
        <label class="mode-option" class:selected={mode === "unfettered"}>
            <input type="radio" name="mode" value="unfettered" bind:group={mode} />
            <span class="mode-label">Unfettered</span>
            <span class="mode-desc">PR x5 bonus. Phenomena on doubles.</span>
        </label>
        <label class="mode-option" class:selected={mode === "pushed"}>
            <input type="radio" name="mode" value="pushed" bind:group={mode} />
            <span class="mode-label">Pushed</span>
            <span class="mode-desc">PR x10 bonus. Always triggers Phenomena (+25).</span>
        </label>
    </div>

    <div class="pr-display">
        <span class="pr-label">Effective Bonus</span>
        <span class="pr-value">{prDisplay}</span>
    </div>

    {#if ctx.description}
        <button class="desc-toggle" onclick={() => showDescription = !showDescription}>
            {showDescription ? "Hide" : "Show"} Description
        </button>
        {#if showDescription}
            <div class="power-description">{@html ctx.description}</div>
        {/if}
    {/if}

    <div class="dialog-buttons">
        <button class="btn-confirm" onclick={confirm}>
            <i class="fa-solid fa-hat-wizard"></i> Focus Power
        </button>
        <button class="btn-cancel" onclick={cancel}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .focus-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .power-header h3 {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #b49545);
        text-align: center;
    }

    .mode-select {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .mode-option {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
        &.selected {
            background: var(--dh2e-bg-light, #3a3a45);
            border-color: var(--dh2e-gold-muted, #7a6a3e);
        }

        input[type="radio"] { accent-color: var(--dh2e-gold, #b49545); }
    }

    .mode-label {
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .mode-desc {
        width: 100%;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding-left: 1.5rem;
    }

    .pr-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .pr-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .pr-value {
        font-weight: 700;
        color: var(--dh2e-gold-bright, #c8a84e);
    }

    .desc-toggle {
        background: none;
        border: none;
        color: var(--dh2e-gold-muted, #7a6a3e);
        cursor: pointer;
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-align: left;
        padding: 0;

        &:hover { color: var(--dh2e-gold, #b49545); }
    }

    .power-description {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-dark, #1e1e22);
        border-radius: var(--dh2e-radius-sm, 3px);
        max-height: 10rem;
        overflow-y: auto;
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
