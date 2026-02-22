<script lang="ts">
    import Homeworld from "./steps/homeworld.svelte";
    import Background from "./steps/background.svelte";
    import Role from "./steps/role.svelte";
    import Divination from "./steps/divination.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const state = $derived(ctx.state);
    const step = $derived(state.step);

    const stepLabels = ["Homeworld", "Background", "Role", "Divination", "Review"];

    const charOrder = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"] as const;
    const charNames: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    function updateChar(key: string, value: number) {
        const chars = { ...state.characteristics };
        chars[key] = Math.max(1, Math.min(99, value));
        ctx.onUpdateState?.({ characteristics: chars });
    }
</script>

<div class="wizard">
    <nav class="progress-bar">
        {#each stepLabels as label, i}
            <div class="progress-step" class:active={i === step} class:done={i < step}>
                <span class="step-number">{i + 1}</span>
                <span class="step-label">{label}</span>
            </div>
            {#if i < stepLabels.length - 1}
                <span class="progress-line" class:filled={i < step}></span>
            {/if}
        {/each}
    </nav>

    <div class="wizard-body">
        {#if step === 0}
            <Homeworld {ctx} />
        {:else if step === 1}
            <Background {ctx} />
        {:else if step === 2}
            <Role {ctx} />
        {:else if step === 3}
            <Divination {ctx} />
        {:else if step === 4}
            <div class="review-step">
                <h3 class="step-title">Review & Characteristics</h3>
                <p class="step-desc">Set your characteristic base values and review your choices.</p>

                <div class="char-editor">
                    {#each charOrder as key}
                        <label class="char-field">
                            <span class="char-label">{charNames[key]}</span>
                            <input
                                type="number"
                                value={state.characteristics[key]}
                                onchange={(e) => updateChar(key, parseInt((e.target as HTMLInputElement).value) || 25)}
                                min="1"
                                max="99"
                            />
                        </label>
                    {/each}
                </div>

                <div class="review-summary">
                    <div class="review-item">
                        <span class="review-label">Homeworld</span>
                        <span class="review-value">{state.homeworld?.name || "—"}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Background</span>
                        <span class="review-value">{state.background?.name || "—"}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Role</span>
                        <span class="review-value">{state.role?.name || "—"}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Divination</span>
                        <span class="review-value">{state.divination?.text || "—"}</span>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <footer class="wizard-footer">
        <button class="btn cancel-btn" onclick={() => ctx.onCancel?.()}>Cancel</button>
        <div class="footer-spacer"></div>
        {#if step > 0}
            <button class="btn prev-btn" onclick={() => ctx.onPrev?.()}>Back</button>
        {/if}
        {#if step < 4}
            <button class="btn next-btn" onclick={() => ctx.onNext?.()}>Next</button>
        {:else}
            <button class="btn finish-btn" onclick={() => ctx.onFinish?.()}>Create Character</button>
        {/if}
    </footer>
</div>

<style lang="scss">
    .wizard {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .progress-bar {
        display: flex;
        align-items: center;
        gap: 0;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-darkest, #111114);
        border-bottom: 2px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .progress-step {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        opacity: 0.4;

        &.active { opacity: 1; }
        &.done { opacity: 0.7; }
    }

    .step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        font-size: 0.6rem;
        font-weight: 700;
    }

    .active .step-number {
        background: var(--dh2e-gold-dark, #9c7a28);
        border-color: var(--dh2e-gold, #c8a84e);
        color: var(--dh2e-bg-darkest, #111114);
    }

    .done .step-number {
        background: var(--dh2e-success, #4a8);
        border-color: var(--dh2e-success, #4a8);
        color: #fff;
    }

    .step-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .active .step-label { color: var(--dh2e-gold, #c8a84e); }

    .progress-line {
        flex: 1;
        height: 1px;
        background: var(--dh2e-border, #4a4a55);
        margin: 0 var(--dh2e-space-xs, 0.25rem);

        &.filled { background: var(--dh2e-success, #4a8); }
    }

    .wizard-body {
        flex: 1;
        overflow-y: auto;
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .wizard-footer {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }

    .footer-spacer { flex: 1; }

    .btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-lg, 1rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-weight: 600;
    }

    .cancel-btn {
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .prev-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .next-btn, .finish-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);

        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    .step-title {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .step-desc {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-bottom: var(--dh2e-space-md, 0.75rem);
    }

    .char-editor {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-bottom: var(--dh2e-space-md, 0.75rem);
    }

    .char-field {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);

        input {
            width: 3.5rem;
            text-align: center;
        }
    }

    .char-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 700;
    }

    .review-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .review-item {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .review-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .review-value {
        color: var(--dh2e-text-primary, #d0cfc8);
    }
</style>
