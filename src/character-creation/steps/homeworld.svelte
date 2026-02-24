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
                    <div class="card-row info-row">
                        <span>Fate {hw.fate.threshold}/{hw.fate.blessing}</span>
                        <span>W {hw.woundsFormula ?? hw.wounds}</span>
                        <span>{hw.aptitude}</span>
                    </div>
                    <div class="card-row">{hw.homeSkill}</div>
                    <div class="card-row bonus-row">{hw.bonus}</div>
                </button>
            {/each}
        </div>

        {#if selected}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>
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
        grid-template-columns: 1fr 1fr;
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

    .info-row {
        display: flex;
        gap: 0.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .bonus-row {
        font-style: italic;
        color: var(--dh2e-gold-dark, #9c7a28);
        font-size: 0.7rem;
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
