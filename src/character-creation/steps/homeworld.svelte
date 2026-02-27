<script lang="ts">
    import type { CreationData, HomeworldOption } from "../types.ts";

    let { data, selected = $bindable<HomeworldOption | null>(null) }: {
        data: CreationData;
        selected: HomeworldOption | null;
    } = $props();

    const homeworlds = $derived(data?.homeworlds ?? []);
    const hasData = $derived(homeworlds.length > 0);

    const charLabels: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

</script>

<div class="step-content">
    <h3 class="step-title">Homeworld</h3>
    <p class="step-desc">
        Choose your character's homeworld. This determines characteristic bonuses,
        fate threshold, and starting wounds.
    </p>

    {#if hasData}
        <div class="card-grid">
            {#each homeworlds as hw}
                {@const isSelected = selected?.name === hw.name}
                <button
                    class="option-card"
                    class:selected={isSelected}
                    type="button"
                    onclick={() => { selected = hw; }}
                >
                    <div class="card-header">{hw.name}</div>
                    <div class="card-row stats-row">
                        <span class="stat bonus">+5 {hw.characteristicBonuses.positive.map((k: string) => charLabels[k] ?? k.toUpperCase()).join(", ")}</span>
                        <span class="stat penalty">-5 {hw.characteristicBonuses.negative.map((k: string) => charLabels[k] ?? k.toUpperCase()).join(", ")}</span>
                    </div>
                </button>
            {/each}
        </div>

        {#if selected}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>
                <div class="detail-info">
                    <span class="detail-tag">{selected.aptitude}</span>
                    <span class="detail-stat" title="Base Fate Threshold. Roll for Emperor's Blessing on the Characteristics step.">Fate {selected.fate.threshold}</span>
                    <span class="detail-stat">Wounds {selected.woundsFormula ?? selected.wounds}</span>
                </div>
                <p class="detail-skill"><strong>Home Skill:</strong> {selected.homeSkill}</p>
                {#if selected.description}
                    <p class="detail-desc">{selected.description}</p>
                {/if}
                {#if selected.bonusDescription}
                    <p class="detail-bonus"><strong>{selected.bonus}:</strong> {selected.bonusDescription}</p>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="manual-input">
            <p class="hint">Enter a homeworld name manually, or install the dh2e-data module for guided selection.</p>
            <label class="input-field">
                <span class="field-label">Homeworld Name</span>
                <input
                    type="text"
                    value={selected?.name ?? ""}
                    onchange={(e) => {
                        selected = {
                            name: (e.target as HTMLInputElement).value,
                            description: "",
                            characteristicBonuses: { positive: [], negative: [] },
                            fate: { threshold: 2, blessing: 1 },
                            wounds: 8,
                            aptitude: "",
                            homeSkill: "",
                            bonus: "",
                            bonusDescription: "",
                        } as HomeworldOption;
                    }}
                    placeholder="e.g., Hive World"
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
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 6px;
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
    }

    .card-row {
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .stats-row {
        display: flex;
        gap: 0.4rem;
    }

    .stat {
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 0.6rem;

        &.bonus {
            color: #6c6;
            background: rgba(102, 204, 102, 0.12);
        }
        &.penalty {
            color: #c66;
            background: rgba(204, 102, 102, 0.12);
        }
    }

    .detail-panel {
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: 3px;
        padding: 10px 14px;
    }

    .detail-name {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: 1rem;
        text-transform: uppercase;
        margin: 0 0 4px;
    }

    .detail-info {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.4rem;
    }

    .detail-tag {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.05rem 0.3rem;
        border-radius: 2px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dh2e-gold, #c8a84e);
        background: rgba(200, 168, 78, 0.15);
    }

    .detail-stat {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .detail-skill {
        font-size: 0.85rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        line-height: 1.4;
        margin: 0 0 4px;
    }

    .detail-desc, .detail-bonus {
        font-size: 0.85rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        margin: 0 0 4px;
    }

    .detail-bonus {
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .hint {
        font-style: italic;
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .input-field {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .field-label {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
</style>
