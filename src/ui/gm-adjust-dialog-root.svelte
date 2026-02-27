<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const fields = [
        { id: "corruption", label: "Corruption" },
        { id: "insanity", label: "Insanity" },
        { id: "influence", label: "Influence" },
        { id: "fate.value", label: "Fate Points" },
    ];

    let selectedField: string = $state("corruption");
    let amount: number = $state(1);

    const actors: { id: string; name: string }[] = $derived(ctx.actors ?? []);

    // Track which actors are selected
    let selected: Record<string, boolean> = $state({});

    // Auto-select actors whose tokens are selected on canvas
    $effect(() => {
        const initial: Record<string, boolean> = {};
        const selectedTokenActorIds: Set<string> = ctx.selectedTokenActorIds ?? new Set();
        for (const a of actors) {
            initial[a.id] = selectedTokenActorIds.has(a.id);
        }
        selected = initial;
    });

    const anySelected = $derived(Object.values(selected).some(Boolean));

    async function apply(): Promise<void> {
        const targetIds = Object.entries(selected)
            .filter(([, v]) => v)
            .map(([k]) => k);
        if (targetIds.length === 0) return;
        await ctx.onApply(selectedField, amount, targetIds);
    }
</script>

<div class="adjust-container">
    <div class="field-row">
        <label for="adjust-field">Field</label>
        <select id="adjust-field" bind:value={selectedField}>
            {#each fields as f (f.id)}
                <option value={f.id}>{f.label}</option>
            {/each}
        </select>
    </div>

    <div class="field-row">
        <label for="adjust-amount">Amount</label>
        <div class="amount-group">
            <button class="amount-btn" onclick={() => amount--} title="Decrease">-</button>
            <input id="adjust-amount" type="number" bind:value={amount} />
            <button class="amount-btn" onclick={() => amount++} title="Increase">+</button>
        </div>
        <span class="amount-hint">(positive = increase, negative = decrease)</span>
    </div>

    <div class="targets-section">
        <span class="section-label">Targets</span>
        <div class="target-list">
            {#each actors as actor (actor.id)}
                <label class="target-row">
                    <input type="checkbox" bind:checked={selected[actor.id]} />
                    <span>{actor.name}</span>
                </label>
            {/each}
            {#if actors.length === 0}
                <p class="no-actors">No acolyte actors found.</p>
            {/if}
        </div>
    </div>

    <div class="button-row">
        <button class="cancel-btn" onclick={() => ctx.onCancel()}>Cancel</button>
        <button class="apply-btn" onclick={apply} disabled={!anySelected || amount === 0}>
            <i class="fa-solid fa-check"></i> Apply
        </button>
    </div>
</div>

<style lang="scss">
    .adjust-container {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);

        > label {
            font-size: var(--dh2e-text-xs, 0.7rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        > select {
            background: var(--dh2e-bg-dark, #1a1a22);
            color: var(--dh2e-text-primary, #d0cfc8);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
            font-size: var(--dh2e-text-sm, 0.8rem);
        }
    }

    .amount-group {
        display: flex;
        align-items: center;
        gap: 2px;

        input {
            width: 4rem;
            text-align: center;
            background: var(--dh2e-bg-dark, #1a1a22);
            color: var(--dh2e-text-primary, #d0cfc8);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            padding: var(--dh2e-space-xs, 0.25rem);
            font-size: var(--dh2e-text-sm, 0.8rem);
            font-family: var(--dh2e-font-mono, monospace);
        }
    }

    .amount-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-size: 0.85rem;
        font-weight: 600;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }
    }

    .amount-hint {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .targets-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);

        .section-label {
            font-size: var(--dh2e-text-xs, 0.7rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    }

    .target-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 12rem;
        overflow-y: auto;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem);
    }

    .target-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }

        input[type="checkbox"] {
            accent-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .no-actors {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        margin: 0;
    }

    .button-row {
        display: flex;
        justify-content: flex-end;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding-top: var(--dh2e-space-sm, 0.5rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }

    .cancel-btn {
        background: none;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:hover {
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }

    .apply-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-bg-dark, #1a1a22);
        cursor: pointer;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;

        &:hover:not(:disabled) {
            background: var(--dh2e-gold, #c8a84e);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }
</style>
