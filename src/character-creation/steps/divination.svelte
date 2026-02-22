<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const state = $derived(ctx.state);

    function setDivination(text: string) {
        ctx.onUpdateState?.({
            divination: {
                id: "custom",
                roll: 0,
                text,
                effect: "",
            },
        });
    }
</script>

<div class="step-content">
    <h3 class="step-title">Divination</h3>
    <p class="step-desc">
        The Emperor's Tarot reveals your fate. Roll or enter a divination
        that grants a permanent effect to your character.
    </p>

    <div class="manual-input">
        <p class="hint">Enter a divination text manually, or install a community data pack for the divination table.</p>
        <label class="input-field">
            <span class="field-label">Divination Text</span>
            <input
                type="text"
                value={state.divination?.text ?? ""}
                onchange={(e) => setDivination((e.target as HTMLInputElement).value)}
                placeholder="e.g., Trust in your fear"
            />
        </label>
    </div>
</div>

<style lang="scss">
    .step-content { display: flex; flex-direction: column; gap: var(--dh2e-space-md, 0.75rem); }
    .step-title { font-family: var(--dh2e-font-header, serif); color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em; }
    .step-desc { font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-secondary, #a0a0a8); }
    .hint { font-style: italic; font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-secondary, #a0a0a8); }
    .input-field { display: flex; flex-direction: column; gap: var(--dh2e-space-xxs, 0.125rem); }
    .field-label { font-size: var(--dh2e-text-xs, 0.7rem); color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; }
</style>
