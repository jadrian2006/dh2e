<script lang="ts">
    import type { BackgroundOption, CreationData } from "../types.ts";
    import { splitOrChoices, parseEquipment, findInPacks } from "../wizard.ts";

    const EQUIPMENT_PACKS = ["dh2e-data.weapons", "dh2e-data.armour", "dh2e-data.gear", "dh2e-data.cybernetics", "dh2e-data.ammunition"];

    async function previewGear(text: string) {
        const { name } = parseEquipment(text);
        const doc = await findInPacks(EQUIPMENT_PACKS, name);
        if (doc) doc.sheet?.render(true);
    }

    let { data, selected = $bindable<BackgroundOption | null>(null), gearChoices = $bindable<Record<number, string>>({}) }: {
        data: CreationData;
        selected: BackgroundOption | null;
        gearChoices: Record<number, string>;
    } = $props();

    const backgrounds = $derived(data?.backgrounds ?? []);
    const hasData = $derived(backgrounds.length > 0);

    /** Derive equipment choices: for each equipment entry, split "or" options */
    const equipChoices = $derived(
        (selected?.equipment ?? []).map((eq, i) => {
            const opts = splitOrChoices(eq);
            return { index: i, raw: eq, options: opts, hasChoice: opts.length > 1 };
        }),
    );
</script>

<div class="step-content">
    <h3 class="step-title">Background</h3>
    <p class="step-desc">
        Choose your character's background. This determines starting skills,
        talents, equipment, and an aptitude.
    </p>

    {#if hasData}
        <div class="card-grid">
            {#each backgrounds as bg}
                {@const isSelected = selected?.name === bg.name}
                <button
                    class="option-card"
                    class:selected={isSelected}
                    type="button"
                    onclick={() => { selected = bg; }}
                >
                    <div class="card-header">{bg.name}</div>
                    <div class="card-row tag-row">
                        <span class="tag">{bg.aptitude}</span>
                    </div>
                    <div class="card-row"><span class="label">Skills:</span> {bg.skills.join(", ")}</div>
                    <div class="card-row"><span class="label">Talents:</span> {bg.talents.join(", ")}</div>
                    <div class="card-row"><span class="label">Gear:</span> {bg.equipment.join(", ")}</div>
                    <div class="card-row bonus-row">{bg.bonus}</div>
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

                {#if equipChoices.some(c => c.hasChoice)}
                    <div class="gear-choices">
                        <h5 class="gear-choices-title">Equipment Choices</h5>
                        {#each equipChoices as choice}
                            {#if choice.hasChoice}
                                <fieldset class="gear-choice-group">
                                    {#each choice.options as opt, oi}
                                        <label class="gear-choice-label">
                                            <input
                                                type="radio"
                                                name="gear-choice-{choice.index}"
                                                value={opt}
                                                checked={oi === 0 ? !(choice.index in gearChoices) : gearChoices[choice.index] === opt}
                                                onchange={() => {
                                                    if (oi === 0) {
                                                        const { [choice.index]: _, ...rest } = gearChoices;
                                                        gearChoices = rest;
                                                    } else {
                                                        gearChoices = { ...gearChoices, [choice.index]: opt };
                                                    }
                                                }}
                                            />
                                            {opt}
                                            <button class="gear-preview-btn" type="button" title="Preview item" onclick={(e) => { e.stopPropagation(); previewGear(opt); }}>
                                                <i class="fa-solid fa-eye"></i>
                                            </button>
                                        </label>
                                    {/each}
                                </fieldset>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="manual-input">
            <p class="hint">Enter a background name manually, or install the dh2e-data module for guided selection.</p>
            <label class="input-field">
                <span class="field-label">Background Name</span>
                <input
                    type="text"
                    value={selected?.name ?? ""}
                    onchange={(e) => {
                        selected = {
                            name: (e.target as HTMLInputElement).value,
                            description: "",
                            skills: [],
                            talents: [],
                            equipment: [],
                            aptitude: "",
                            bonus: "",
                            bonusDescription: "",
                        } as BackgroundOption;
                    }}
                    placeholder="e.g., Imperial Guard"
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

    .gear-choices {
        margin-top: 0.5rem;
        border-top: 1px solid var(--dh2e-border, #4a4a55);
        padding-top: 0.4rem;
    }

    .gear-choices-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.3rem;
    }

    .gear-choice-group {
        border: none;
        padding: 0 0 0.3rem;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .gear-choice-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;

        input[type="radio"] {
            accent-color: var(--dh2e-gold, #c8a84e);
            margin: 0;
        }
    }

    .gear-preview-btn {
        background: none;
        border: none;
        padding: 0 0.2rem;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;

        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }
</style>
