<script lang="ts">
    import type { CreationData, RoleOption } from "../types.ts";

    let { data, selected = $bindable<RoleOption | null>(null) }: {
        data: CreationData;
        selected: RoleOption | null;
    } = $props();

    const roles = $derived(data?.roles ?? []);
    const hasData = $derived(roles.length > 0);
</script>

<div class="step-content">
    <h3 class="step-title">Role</h3>
    <p class="step-desc">
        Choose your character's role. This determines aptitudes, a bonus talent,
        and a special ability.
    </p>

    {#if hasData}
        <div class="card-grid">
            {#each roles as role}
                {@const isSelected = selected?.name === role.name}
                <button
                    class="option-card"
                    class:selected={isSelected}
                    type="button"
                    onclick={() => { selected = role; }}
                >
                    <div class="card-header">{role.name}</div>
                    <div class="card-row tag-row">
                        {#each role.aptitudes as apt}
                            <span class="tag">{apt}</span>
                        {/each}
                    </div>
                    <div class="card-row"><span class="label">Talent:</span> {role.talent}</div>
                    <div class="card-row bonus-row">{role.bonus}</div>
                </button>
            {/each}
        </div>

        {#if selected?.description}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>
                <p class="detail-desc">{selected.description}</p>
                {#if selected.bonusDescription}
                    <p class="detail-bonus"><strong>{selected.bonus}:</strong> {selected.bonusDescription}</p>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="manual-input">
            <p class="hint">Enter a role name manually, or install the dh2e-data module for guided selection.</p>
            <label class="input-field">
                <span class="field-label">Role Name</span>
                <input
                    type="text"
                    value={selected?.name ?? ""}
                    onchange={(e) => {
                        selected = {
                            name: (e.target as HTMLInputElement).value,
                            description: "",
                            aptitudes: [],
                            talent: "",
                            bonus: "",
                            bonusDescription: "",
                        } as RoleOption;
                    }}
                    placeholder="e.g., Assassin"
                />
            </label>
        </div>
    {/if}
</div>

<style lang="scss">
    .step-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .step-title {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
    }
    .step-desc {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin: 0;
    }

    .card-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
    }

    .option-card {
        /* Explicit layout — override Foundry button defaults */
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        height: auto !important;
        min-height: auto !important;

        padding: 8px 10px;
        gap: 3px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 2px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        cursor: pointer;
        text-align: left;
        color: inherit;
        font: inherit;
        font-size: inherit;
        line-height: 1.3;
        transition: border-color 0.15s;

        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); }
        &.selected {
            border-color: var(--dh2e-gold, #c8a84e);
            background: #2a2820;
        }
    }

    .card-header {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: 0.9rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.2rem;
    }

    .card-row {
        font-size: 0.75rem;
        line-height: 1.35;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem;
        margin-bottom: 0.15rem;
    }

    .tag {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.05rem 0.3rem;
        border-radius: 2px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dh2e-gold, #c8a84e);
        background: rgba(200, 168, 78, 0.15);
    }

    .label {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 600;
    }

    .bonus-row {
        font-style: italic;
        color: var(--dh2e-gold-dark, #9c7a28);
        font-size: 0.7rem;
        margin-top: 0.1rem;
    }

    .detail-panel {
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: 3px;
        padding: 0.6rem 0.8rem;
    }

    .detail-name {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: 1rem;
        text-transform: uppercase;
        margin: 0 0 0.3rem;
    }

    .detail-desc {
        font-size: 0.85rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        margin: 0 0 0.3rem;
    }

    .detail-bonus {
        font-size: 0.85rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        line-height: 1.4;
        margin: 0;
    }

    .hint {
        font-style: italic;
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .input-field {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    .field-label {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
</style>
