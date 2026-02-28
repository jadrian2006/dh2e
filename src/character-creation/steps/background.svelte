<script lang="ts">
    import type { BackgroundOption, CreationData } from "../types.ts";
    import { splitOrChoices, parseEquipment, findInPacks } from "../wizard.ts";

    async function previewGear(text: string) {
        const { name } = parseEquipment(text);
        const doc = await findInPacks(["weapons", "armour", "gear", "cybernetics", "ammunition"], name);
        if (doc) {
            doc.sheet?.render(true);
        } else {
            ui.notifications?.info(`No compendium entry found for "${name}".`);
        }
    }

    /** Show instant hover tooltip with item description from compendium */
    function showGearTooltip(event: MouseEvent, text: string) {
        const { name } = parseEquipment(text);
        const desc = gearDescs[name.toLowerCase()];
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:320px"><strong>${name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
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

    /** Cached gear descriptions for tooltips */
    let gearDescs: Record<string, string> = $state({});

    /** Load gear descriptions when selected background changes */
    $effect(() => {
        const items = selected?.equipment ?? [];
        if (items.length === 0) { gearDescs = {}; return; }
        (async () => {
            const descs: Record<string, string> = {};
            for (const eq of items) {
                const opts = splitOrChoices(eq);
                for (const opt of opts) {
                    const { name } = parseEquipment(opt);
                    const lc = name.toLowerCase();
                    if (descs[lc]) continue;
                    const doc = await findInPacks(["weapons", "armour", "gear", "cybernetics", "ammunition"], name);
                    if (doc) {
                        const d = (doc as any)?.system?.description ?? "";
                        if (d) descs[lc] = typeof d === "string" ? d.replace(/<[^>]+>/g, "").slice(0, 200) : "";
                    }
                }
            }
            gearDescs = descs;
        })();
    });
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
                    <div class="card-header">
                        {bg.name}
                        {#if bg.source && bg.source !== "core-rulebook"}
                            <span class="source-badge">{game.i18n?.localize(`DH2E.Source.${bg.source}`) ?? bg.source}</span>
                        {/if}
                    </div>
                    <div class="card-row tag-row">
                        <span class="tag">{bg.aptitude}</span>
                    </div>
                </button>
            {/each}
        </div>

        {#if selected}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>
                <div class="detail-lists">
                    <p class="detail-list"><strong>Skills:</strong> {selected.skills.join(", ")}</p>
                    <p class="detail-list"><strong>Talents:</strong> {selected.talents.join(", ")}</p>
                </div>
                {#if selected.description}
                    <p class="detail-desc">{selected.description}</p>
                {/if}
                {#if selected.bonusDescription}
                    <p class="detail-bonus"><strong>{selected.bonus}:</strong> {selected.bonusDescription}</p>
                {/if}

                <div class="gear-section">
                    <h5 class="gear-section-title">Starting Equipment</h5>
                    <div class="gear-list">
                        {#each equipChoices as choice}
                            {#if choice.hasChoice}
                                <div class="gear-choice-card">
                                    <span class="choice-badge">Choose One</span>
                                    <fieldset class="gear-choice-group">
                                        {#each choice.options as opt, oi}
                                            {#if oi > 0}
                                                <span class="or-divider">or</span>
                                            {/if}
                                            <label class="gear-choice-label" onmouseenter={(e) => showGearTooltip(e, opt)}>
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
                                                <span class="gear-name">{opt}</span>
                                                <button class="gear-preview-btn" type="button" title="Preview item" onclick={(e) => { e.stopPropagation(); previewGear(opt); }}>
                                                    <i class="fa-solid fa-eye"></i>
                                                </button>
                                            </label>
                                        {/each}
                                    </fieldset>
                                </div>
                            {:else}
                                <div class="gear-fixed-row" onmouseenter={(e) => showGearTooltip(e, choice.raw)}>
                                    <i class="fa-solid fa-check gear-check"></i>
                                    <span class="gear-name">{choice.raw}</span>
                                    <button class="gear-preview-btn" type="button" title="Preview item" onclick={(e) => { e.stopPropagation(); previewGear(choice.raw); }}>
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
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
        grid-template-columns: repeat(2, 1fr);
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
        line-height: 1.35;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .tag-row {
        margin-top: 0.1rem;
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

    .detail-lists {
        margin-bottom: 0.3rem;
    }

    .detail-list {
        font-size: 0.8rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        line-height: 1.4;
        margin: 0 0 0.15rem;
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

    /* --- Equipment Section --- */

    .gear-section {
        margin-top: 0.5rem;
        border-top: 1px solid var(--dh2e-border, #4a4a55);
        padding-top: 0.5rem;
    }

    .gear-section-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.4rem;
    }

    .gear-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    /* Fixed equipment row */
    .gear-fixed-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.25rem 0.4rem;
        font-size: 0.8rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        border-radius: 2px;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }
    }

    .gear-check {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        flex-shrink: 0;
        width: 1rem;
        text-align: center;
    }

    .gear-name {
        flex: 1;
        min-width: 0;
    }

    /* Choice card */
    .gear-choice-card {
        position: relative;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        padding: 0.45rem 0.5rem 0.35rem;
        background: rgba(0, 0, 0, 0.15);
    }

    .choice-badge {
        position: absolute;
        top: -0.5em;
        left: 0.5rem;
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--dh2e-gold-muted, #7a6a3e);
        background: var(--dh2e-bg-mid, #2e2e35);
        padding: 0 0.3rem;
    }

    .gear-choice-group {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .or-divider {
        display: block;
        text-align: center;
        font-size: 0.6rem;
        font-weight: 700;
        font-style: italic;
        color: var(--dh2e-text-secondary, #a0a0a8);
        letter-spacing: 0.1em;
        padding: 0.05rem 0;
        opacity: 0.7;
    }

    .gear-choice-label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        padding: 0.1rem 0;

        input[type="radio"] {
            accent-color: var(--dh2e-gold, #c8a84e);
            margin: 0;
            flex-shrink: 0;
        }
    }

    .gear-preview-btn {
        background: none;
        border: none;
        padding: 0 0.2rem;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        flex-shrink: 0;
        margin-left: auto;

        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }

    /* Manual fallback */
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
