<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const state = $derived(ctx.state);

    function setBackground(name: string) {
        ctx.onUpdateState?.({
            background: {
                id: name.toLowerCase().replace(/\s+/g, "-"),
                name,
                description: "",
                skills: [],
                talents: [],
                equipment: [],
                aptitude: "",
            },
        });
    }
</script>

<div class="step-content">
    <h3 class="step-title">Background</h3>
    <p class="step-desc">
        Choose your character's background. This determines starting skills,
        talents, and equipment.
    </p>

    <div class="manual-input">
        <p class="hint">Enter a background name manually, or install a community data pack for guided selection.</p>
        <label class="input-field">
            <span class="field-label">Background Name</span>
            <input
                type="text"
                value={state.background?.name ?? ""}
                onchange={(e) => setBackground((e.target as HTMLInputElement).value)}
                placeholder="e.g., Imperial Guard"
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
