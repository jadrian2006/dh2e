<script lang="ts">
    import type { CreationData, HomeworldOption } from "../types.ts";
    import { splitOrChoices } from "../wizard.ts";

    let { data, selected = $bindable<HomeworldOption | null>(null), talentChoice = $bindable("") }: {
        data: CreationData;
        selected: HomeworldOption | null;
        talentChoice: string;
    } = $props();

    const homeworlds = $derived(data?.homeworlds ?? []);
    const hasData = $derived(homeworlds.length > 0);

    const charLabels: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    /** Parse talent "or" options from selected homeworld's talent strings */
    const talentOptions = $derived(() => {
        const talents = selected?.talents ?? [];
        // Find the first talent string with an "or" choice
        for (const t of talents) {
            const opts = splitOrChoices(t);
            if (opts.length > 1) return opts;
        }
        return [];
    });
    const hasTalentChoice = $derived(talentOptions().length > 1);

    /** All granted talents (non-choice) for display */
    const grantedTalents = $derived(() => {
        const talents = selected?.talents ?? [];
        return talents.filter(t => splitOrChoices(t).length === 1);
    });

    /** Cached talent descriptions for tooltips */
    let talentDescs: Record<string, string> = $state({});

    /** Load talent descriptions from compendium when options change */
    $effect(() => {
        const opts = talentOptions();
        if (opts.length <= 1) { talentDescs = {}; return; }
        (async () => {
            const { findInAllPacks } = await import("@util/pack-discovery.ts");
            const descs: Record<string, string> = {};
            for (const name of opts) {
                const doc = await findInAllPacks("talents", name);
                if (doc) {
                    descs[name] = (doc as any)?.system?.description ?? "";
                }
            }
            talentDescs = descs;
        })();
    });

    /** Show rich tooltip for a talent choice */
    function showTalentTooltip(event: MouseEvent, name: string) {
        const desc = talentDescs[name];
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:320px"><strong>${name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }

    /** Open the talent's full item sheet from compendium */
    async function openTalentSheet(name: string) {
        const { findInAllPacks } = await import("@util/pack-discovery.ts");
        const doc = await findInAllPacks("talents", name);
        if (doc) {
            (doc as any)?.sheet?.render(true);
        } else {
            ui.notifications?.info(`No compendium entry found for "${name}".`);
        }
    }

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
                    <div class="card-header">
                        {hw.name}
                        {#if hw.source && hw.source !== "core-rulebook"}
                            <span class="source-badge">{game.i18n?.localize(`DH2E.Source.${hw.source}`) ?? hw.source}</span>
                        {/if}
                    </div>
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
                {#if selected.homeSkill}
                    <p class="detail-skill"><strong>Home Skill:</strong> {selected.homeSkill}</p>
                {/if}

                {#if hasTalentChoice}
                    <div class="talent-choices">
                        <h5 class="talent-choices-title">Choose Talent</h5>
                        <fieldset class="talent-choice-group">
                            {#each talentOptions() as opt, oi}
                                <label class="talent-choice-label" onmouseenter={(e) => showTalentTooltip(e, opt)}>
                                    <input
                                        type="radio"
                                        name="hw-talent-choice"
                                        value={opt}
                                        checked={oi === 0 ? talentChoice === "" || talentChoice === opt : talentChoice === opt}
                                        onchange={() => { talentChoice = opt; }}
                                    />
                                    {opt}
                                    <button class="info-btn" type="button" onclick={(e) => { e.preventDefault(); openTalentSheet(opt); }} title="View details">
                                        <i class="fa-solid fa-circle-info"></i>
                                    </button>
                                </label>
                            {/each}
                        </fieldset>
                    </div>
                {/if}

                {#if grantedTalents().length > 0}
                    <p class="detail-skill"><strong>Talent{grantedTalents().length > 1 ? "s" : ""}:</strong> {grantedTalents().join(", ")}</p>
                {/if}

                {#if (selected.skills ?? []).length > 0}
                    <p class="detail-skill"><strong>Skill{(selected.skills ?? []).length > 1 ? "s" : ""}:</strong> {(selected.skills ?? []).join(", ")}</p>
                {/if}

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
        grid-auto-rows: 1fr;
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
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.4rem;
    }

    .source-badge {
        font-family: var(--dh2e-font-body, sans-serif);
        font-size: 0.5rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #b0a0d0;
        background: rgba(140, 120, 180, 0.15);
        padding: 1px 4px;
        border-radius: 2px;
        white-space: nowrap;
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

    .talent-choices {
        margin-bottom: 0.4rem;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        padding-bottom: 0.4rem;
    }

    .talent-choices-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.3rem;
    }

    .talent-choice-group {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .talent-choice-label {
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

    .info-btn {
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.7rem;
        padding: 0 2px;
        opacity: 0.6;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            opacity: 1;
        }
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
