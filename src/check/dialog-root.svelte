<script lang="ts">
    import type { ModifierDH2e } from "../rules/modifier.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let situationalValue = $state(0);
    let situationalLabel = $state("");

    const modifiers: ModifierDH2e[] = $derived(ctx.modifiers ?? []);
    const baseTarget: number = $derived(ctx.baseTarget ?? 0);
    const modTotal: number = $derived(
        modifiers.filter((m: ModifierDH2e) => m.enabled).reduce((sum: number, m: ModifierDH2e) => sum + m.value, 0),
    );
    const finalTarget: number = $derived(Math.max(1, baseTarget + modTotal));

    function toggleModifier(mod: ModifierDH2e) {
        if (mod.toggleable) {
            mod.enabled = !mod.enabled;
        }
    }

    function addSituational() {
        if (situationalValue === 0) return;
        const { ModifierDH2e: ModClass } = /** @type {any} */ (ctx);
        // Use the callback to add a new modifier
        ctx.onAddModifier?.({
            label: situationalLabel || "Situational",
            value: situationalValue,
            source: "situational",
            exclusionGroup: null,
            predicate: { statements: [], isempty: true, test: () => true },
            enabled: true,
            toggleable: true,
            isBonus: situationalValue > 0,
            isPenalty: situationalValue < 0,
            clone: () => ({}),
        });
        situationalValue = 0;
        situationalLabel = "";
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            ctx.onRoll?.();
        } else if (event.key === "Escape") {
            event.preventDefault();
            ctx.onCancel?.();
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="check-dialog" onkeydown={handleKeydown}>
    <div class="target-display">
        <span class="target-label">Target Number</span>
        <span class="target-value">{finalTarget}</span>
        <span class="target-breakdown">{baseTarget} base {modTotal >= 0 ? "+" : ""}{modTotal}</span>
    </div>

    {#if ctx.skillDescription}
        <details class="skill-info">
            <summary class="skill-info-toggle">Skill Details</summary>
            <p class="skill-info-text">{ctx.skillDescription}</p>
        </details>
    {/if}

    {#if modifiers.length > 0}
        <div class="modifiers-list">
            <h4 class="section-label">Modifiers</h4>
            {#each modifiers as mod}
                <label class="modifier-row" class:disabled={!mod.enabled}>
                    {#if mod.toggleable}
                        <input type="checkbox" checked={mod.enabled} onchange={() => toggleModifier(mod)} />
                    {:else}
                        <span class="lock-icon">&#128274;</span>
                    {/if}
                    <span class="mod-label">{mod.label}</span>
                    <span class="mod-value" class:bonus={mod.value > 0} class:penalty={mod.value < 0}>
                        {mod.value > 0 ? "+" : ""}{mod.value}
                    </span>
                </label>
            {/each}
        </div>
    {/if}

    <div class="situational-row">
        <label class="situational-label">
            <span class="field-label">Add Modifier</span>
            <input
                type="text"
                class="sit-name"
                bind:value={situationalLabel}
                placeholder="Label..."
            />
        </label>
        <label class="situational-value">
            <span class="field-label">Value</span>
            <input
                type="number"
                class="sit-value"
                bind:value={situationalValue}
                step="5"
            />
        </label>
        <button class="add-btn" onclick={addSituational} title="Add modifier">+</button>
    </div>

    <div class="dialog-buttons">
        <button class="btn roll-btn" onclick={() => ctx.onRoll?.()}>Roll</button>
        <button class="btn cancel-btn" onclick={() => ctx.onCancel?.()}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .check-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .target-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 2px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-md, 6px);
    }
    .target-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .target-value {
        font-family: var(--dh2e-font-header, serif);
        font-size: 2rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .target-breakdown {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .skill-info {
        background: var(--dh2e-bg-light, #3a3a45);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
    }
    .skill-info-toggle {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
    }
    .skill-info-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        margin: var(--dh2e-space-xs, 0.25rem) 0 0;
    }

    .section-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
    }

    .modifiers-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .modifier-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;

        &.disabled {
            opacity: 0.5;
        }

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }
    .lock-icon {
        width: 1rem;
        font-size: 0.7rem;
        text-align: center;
    }
    .mod-label {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
    .mod-value {
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &.bonus { color: var(--dh2e-success, #4a8); }
        &.penalty { color: var(--dh2e-red-bright, #d44); }
    }

    .situational-row {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: flex-end;
    }
    .situational-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }
    .situational-value {
        width: 4rem;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }
    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
    .add-btn {
        width: 2rem;
        height: 2rem;
        font-size: 1.2rem;
        font-weight: 700;
        cursor: pointer;
        flex-shrink: 0;
    }

    .dialog-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: flex-end;
        padding-top: var(--dh2e-space-sm, 0.5rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }
    .btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-lg, 1rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-weight: 600;
    }
    .roll-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);

        &:hover {
            background: var(--dh2e-gold, #c8a84e);
        }
    }
    .cancel-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
</style>
