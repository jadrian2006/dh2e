<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    let mode = $state<"unfettered" | "pushed">("unfettered");
    let selectedPR = $state<number>(ctx.psyRating);
    let showDescription = $state(false);

    const basePR: number = ctx.psyRating;
    const maxPushedPR: number = basePR + 2;

    // Unfettered: +10 per level below base PR
    // Pushed: -10 per level above base PR
    const prModifier = $derived(
        mode === "unfettered"
            ? (basePR - selectedPR) * 10
            : (basePR - selectedPR) * 10, // negative when selectedPR > basePR
    );

    const prModDisplay = $derived(
        prModifier > 0 ? `+${prModifier}` : prModifier === 0 ? "+0" : String(prModifier),
    );

    // When switching modes, reset PR to base
    $effect(() => {
        if (mode === "unfettered" && selectedPR > basePR) {
            selectedPR = basePR;
        }
        if (mode === "pushed" && selectedPR < basePR) {
            selectedPR = basePR;
        }
    });

    function confirm() {
        ctx.onConfirm?.(mode, selectedPR);
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
            <span class="mode-desc">PR 1–{basePR}. +10 per PR below max. Phenomena on doubles.</span>
        </label>
        <label class="mode-option" class:selected={mode === "pushed"}>
            <input type="radio" name="mode" value="pushed" bind:group={mode} />
            <span class="mode-label">Pushed</span>
            <span class="mode-desc">PR {basePR}–{maxPushedPR}. −10 per PR above base. Always Phenomena; doubles → Perils.</span>
        </label>
    </div>

    {#if mode === "unfettered" && basePR > 1}
        <div class="pr-selector">
            <span class="pr-selector-label">Manifest at PR</span>
            <div class="pr-buttons">
                {#each Array.from({ length: basePR }, (_, i) => i + 1) as pr}
                    <button
                        class="pr-btn"
                        class:active={selectedPR === pr}
                        onclick={() => selectedPR = pr}
                    >
                        {pr}
                    </button>
                {/each}
            </div>
        </div>
    {:else if mode === "pushed"}
        <div class="pr-selector">
            <span class="pr-selector-label">Push to PR</span>
            <div class="pr-buttons">
                {#each Array.from({ length: 3 }, (_, i) => basePR + i) as pr}
                    <button
                        class="pr-btn"
                        class:active={selectedPR === pr}
                        class:push-over={pr > basePR}
                        onclick={() => selectedPR = pr}
                    >
                        {pr}{#if pr > basePR}<span class="push-plus">+{pr - basePR}</span>{/if}
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    <div class="pr-display">
        <div class="pr-row">
            <span class="pr-label">Effective PR</span>
            <span class="pr-value">{selectedPR}</span>
        </div>
        <div class="pr-row">
            <span class="pr-label">{mode === "unfettered" ? "Reduced PR Bonus" : "Push Penalty"}</span>
            <span class="pr-value" class:bonus={prModifier > 0} class:penalty={prModifier < 0}>{prModDisplay}</span>
        </div>
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

    .pr-selector {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .pr-selector-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .pr-buttons {
        display: flex;
        gap: 4px;
    }

    .pr-btn {
        flex: 1;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-weight: 700;
        font-size: var(--dh2e-text-base, 0.85rem);
        text-align: center;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &:hover {
            border-color: var(--dh2e-gold-muted, #7a6a3e);
        }

        &.active {
            background: var(--dh2e-gold-muted, #7a6a3e);
            border-color: var(--dh2e-gold, #b49545);
            color: #1e1e22;
        }
    }

    .pr-display {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .pr-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .pr-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .pr-value {
        font-weight: 700;
        color: var(--dh2e-gold-bright, #c8a84e);

        &.bonus {
            color: var(--dh2e-success, #5ab45a);
        }

        &.penalty {
            color: var(--dh2e-danger, #c45a5a);
        }
    }

    .push-plus {
        font-size: 0.65em;
        color: var(--dh2e-danger, #c45a5a);
        margin-left: 2px;
    }

    .pr-btn.push-over {
        border-color: var(--dh2e-danger-muted, #6a3a3a);

        &.active {
            background: var(--dh2e-danger-muted, #6a3a3a);
            border-color: var(--dh2e-danger, #c45a5a);
        }
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
