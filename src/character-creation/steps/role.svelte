<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const state = $derived(ctx.state);

    function setRole(name: string) {
        ctx.onUpdateState?.({
            role: {
                id: name.toLowerCase().replace(/\s+/g, "-"),
                name,
                description: "",
                aptitudes: [],
                talent: "",
                special: "",
            },
        });
    }
</script>

<div class="step-content">
    <h3 class="step-title">Role</h3>
    <p class="step-desc">
        Choose your character's role. This determines aptitudes and a bonus talent.
    </p>

    <div class="manual-input">
        <p class="hint">Enter a role name manually, or install a community data pack for guided selection.</p>
        <label class="input-field">
            <span class="field-label">Role Name</span>
            <input
                type="text"
                value={state.role?.name ?? ""}
                onchange={(e) => setRole((e.target as HTMLInputElement).value)}
                placeholder="e.g., Assassin"
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
