<script lang="ts">
    import type { CreationData, HomeworldOption } from "../types.ts";
    import { getCharBonuses, getFateConfig, getWoundsFormula, getAptitudes, getGrantsOfType, type GrantSource } from "../creation-helpers.ts";

    let { data, selected = $bindable<HomeworldOption | null>(null), homeworldChoices = $bindable<Record<number, string | number>>({}) }: {
        data: CreationData;
        selected: HomeworldOption | null;
        homeworldChoices: Record<number, string | number>;
    } = $props();

    const homeworlds = $derived(data?.homeworlds ?? []);
    const hasData = $derived(homeworlds.length > 0);

    const charLabels: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel", inf: "Inf",
    };

    // Derive data from rules
    const charBonuses = $derived(selected ? getCharBonuses(selected.rules ?? []) : []);
    const positiveBonuses = $derived(charBonuses.filter(b => b.value > 0));
    const negativeBonuses = $derived(charBonuses.filter(b => b.value < 0));
    const fateConfig = $derived(selected ? getFateConfig(selected.rules ?? []) : null);
    const woundsFormula = $derived(selected ? getWoundsFormula(selected.rules ?? []) : null);
    const aptitudes = $derived(selected ? getAptitudes(selected.rules ?? []) : []);
    const talentGrants = $derived(selected ? getGrantsOfType(selected.rules ?? [], "talent") : []);
    const traitGrants = $derived(selected ? getGrantsOfType(selected.rules ?? [], "trait") : []);
    const skillGrants = $derived(selected ? getGrantsOfType(selected.rules ?? [], "skill") : []);

    /** Find Grant REs with choices (talent "or" choices) */
    const talentChoiceGrant = $derived(() => {
        return talentGrants.find(g => g.options && g.options.length > 1) ?? null;
    });
    const hasTalentChoice = $derived(talentChoiceGrant() !== null);

    /** Index of the choice grant in the full grants list (for choices map) */
    const talentChoiceIndex = $derived(() => {
        const grants = selected ? getGrantsOfType(selected.rules ?? [], "talent").concat(
            getGrantsOfType(selected.rules ?? [], "trait"),
            getGrantsOfType(selected.rules ?? [], "skill"),
        ) : [];
        // Find overall index among all Grant REs
        const allGrants = (selected?.rules ?? []).filter(r => r.key === "Grant");
        const g = talentChoiceGrant();
        if (!g) return -1;
        return allGrants.indexOf(g as any);
    });

    /** Fixed talents (no choice) for display */
    const fixedTalents = $derived(talentGrants.filter(g => !g.options || g.options.length <= 1));

    /** Cached talent descriptions for tooltips */
    let talentDescs: Record<string, string> = $state({});

    /** Load talent descriptions from compendium when options change */
    $effect(() => {
        const g = talentChoiceGrant();
        if (!g) { talentDescs = {}; return; }
        const opts = g.options ?? [];
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

    /** Show rich tooltip for a talent */
    function showTalentTooltip(event: MouseEvent, name: string) {
        const desc = talentDescs[name] || grantedTalentDescs[name];
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:320px"><strong>${name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }

    /** Open the talent's full item sheet from compendium */
    async function openTalentSheet(name: string) {
        try {
            const { findInAllPacks } = await import("@util/pack-discovery.ts");
            const doc = await findInAllPacks("talents", name);
            if (doc) {
                doc.sheet.render({ force: true });
            } else {
                ui.notifications?.info(`No compendium entry found for "${name}".`);
            }
        } catch (err) {
            console.error("dh2e | Failed to open talent sheet:", err);
            ui.notifications?.error("Failed to open talent sheet.");
        }
    }

    /** Cached granted talent descriptions */
    let grantedTalentDescs: Record<string, string> = $state({});

    /** Load granted talent descriptions from compendium */
    $effect(() => {
        const talents = fixedTalents;
        if (talents.length === 0) { grantedTalentDescs = {}; return; }
        (async () => {
            try {
                const { findInAllPacks } = await import("@util/pack-discovery.ts");
                const descs: Record<string, string> = {};
                for (const g of talents) {
                    const name = g.name ?? "";
                    if (!name) continue;
                    const baseName = name.replace(/\s*\(.*\)$/, "");
                    const doc = await findInAllPacks("talents", baseName);
                    if (doc) {
                        descs[name] = (doc as any)?.system?.description ?? "";
                    }
                }
                grantedTalentDescs = descs;
            } catch (err) {
                console.warn("dh2e | Failed to load granted talent descriptions:", err);
            }
        })();
    });

    /** Cached trait descriptions for tooltips */
    let traitDescs: Record<string, string> = $state({});

    /** Load trait descriptions from compendium when selected homeworld changes */
    $effect(() => {
        const traits = traitGrants;
        if (traits.length === 0) { traitDescs = {}; return; }
        (async () => {
            try {
                const { findInAllPacks } = await import("@util/pack-discovery.ts");
                const descs: Record<string, string> = {};
                for (const g of traits) {
                    const name = g.name ?? "";
                    if (!name) continue;
                    const baseName = name.replace(/\s*\(\d+\)$/, "");
                    const doc = await findInAllPacks("traits", baseName);
                    if (doc) {
                        descs[name] = (doc as any)?.system?.description ?? "";
                    }
                }
                traitDescs = descs;
            } catch (err) {
                console.warn("dh2e | Failed to load trait descriptions:", err);
            }
        })();
    });

    /** Show rich tooltip for a trait */
    function showTraitTooltip(event: MouseEvent, name: string) {
        const desc = traitDescs[name];
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const ratingNote = "";
            const html = `<div style="max-width:320px"><strong>${name}</strong>${ratingNote}<br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }

    /** Open the trait's full item sheet from compendium */
    async function openTraitSheet(name: string) {
        try {
            const { findInAllPacks } = await import("@util/pack-discovery.ts");
            const baseName = name.replace(/\s*\(\d+\)$/, "");
            const doc = await findInAllPacks("traits", baseName);
            if (doc) {
                doc.sheet.render({ force: true });
            } else {
                ui.notifications?.info(`No compendium entry found for "${baseName}".`);
            }
        } catch (err) {
            console.error("dh2e | Failed to open trait sheet:", err);
            ui.notifications?.error("Failed to open trait sheet.");
        }
    }

    /** Format trait display name with rating */
    function traitDisplayName(g: GrantSource): string {
        const name = g.name ?? "";
        return g.rating ? `${name} (${g.rating})` : name;
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
                {@const hwBonuses = getCharBonuses(hw.rules ?? [])}
                {@const hwPos = hwBonuses.filter(b => b.value > 0)}
                {@const hwNeg = hwBonuses.filter(b => b.value < 0)}
                <button
                    class="option-card"
                    class:selected={isSelected}
                    type="button"
                    onclick={() => { selected = hw; homeworldChoices = {}; }}
                >
                    <div class="card-header">
                        {hw.name}
                        {#if hw.source && hw.source !== "core-rulebook"}
                            <span class="source-badge">{game.i18n?.localize(`DH2E.Source.${hw.source}`) ?? hw.source}</span>
                        {/if}
                    </div>
                    <div class="card-row stats-row">
                        {#if hwPos.length > 0}
                            <span class="stat bonus">+5 {hwPos.map(b => charLabels[b.characteristic] ?? b.characteristic.toUpperCase()).join(", ")}</span>
                        {/if}
                        {#if hwNeg.length > 0}
                            <span class="stat penalty">-5 {hwNeg.map(b => charLabels[b.characteristic] ?? b.characteristic.toUpperCase()).join(", ")}</span>
                        {/if}
                    </div>
                </button>
            {/each}
        </div>

        {#if selected}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>
                <div class="detail-info">
                    {#each aptitudes as apt}
                        <span class="detail-tag">{typeof apt === "string" ? apt : apt.join(" or ")}</span>
                    {/each}
                    {#if fateConfig}
                        <span class="detail-stat" title="Base Fate Threshold. Roll for Emperor's Blessing on the Characteristics step.">Fate {fateConfig.threshold}</span>
                    {/if}
                    {#if woundsFormula}
                        <span class="detail-stat">Wounds {woundsFormula}</span>
                    {/if}
                </div>

                {#if hasTalentChoice}
                    {@const g = talentChoiceGrant()}
                    {@const choiceIdx = talentChoiceIndex()}
                    {#if g && g.options}
                        <div class="talent-choices">
                            <h5 class="talent-choices-title">Choose Talent</h5>
                            <fieldset class="talent-choice-group">
                                {#each g.options as opt, oi}
                                    <label class="talent-choice-label" onmouseenter={(e) => showTalentTooltip(e, opt)}>
                                        <input
                                            type="radio"
                                            name="hw-talent-choice"
                                            value={opt}
                                            checked={oi === 0 ? !(choiceIdx in homeworldChoices) : homeworldChoices[choiceIdx] === opt}
                                            onchange={() => {
                                                if (oi === 0) {
                                                    const { [choiceIdx]: _, ...rest } = homeworldChoices;
                                                    homeworldChoices = rest;
                                                } else {
                                                    homeworldChoices = { ...homeworldChoices, [choiceIdx]: opt };
                                                }
                                            }}
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
                {/if}

                {#if fixedTalents.length > 0}
                    <p class="detail-skill">
                        <strong>Talent{fixedTalents.length > 1 ? "s" : ""}:</strong>
                        {#each fixedTalents as t, i}
                            {@const name = t.name ?? ""}
                            <span class="item-link" onmouseenter={(e) => showTalentTooltip(e, name)} onclick={() => openTalentSheet(name)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") openTalentSheet(name); }}>{name}</span>{#if i < fixedTalents.length - 1}, {/if}
                        {/each}
                    </p>
                    {#each fixedTalents as t}
                        {@const name = t.name ?? ""}
                        {#if grantedTalentDescs[name]}
                            <p class="detail-trait-desc"><strong>{name}:</strong> {grantedTalentDescs[name]}</p>
                        {/if}
                    {/each}
                {/if}

                {#if traitGrants.length > 0}
                    <p class="detail-skill">
                        <strong>Trait{traitGrants.length > 1 ? "s" : ""}:</strong>
                        {#each traitGrants as t, i}
                            {@const displayName = traitDisplayName(t)}
                            <span class="item-link" onmouseenter={(e) => showTraitTooltip(e, t.name ?? "")} onclick={() => openTraitSheet(t.name ?? "")} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") openTraitSheet(t.name ?? ""); }}>{displayName}</span>{#if i < traitGrants.length - 1}, {/if}
                        {/each}
                    </p>
                    {#each traitGrants as t}
                        {@const displayName = traitDisplayName(t)}
                        {#if traitDescs[t.name ?? ""]}
                            <p class="detail-trait-desc"><strong>{displayName}:</strong> {traitDescs[t.name ?? ""]}</p>
                        {/if}
                    {/each}
                {/if}

                {#if skillGrants.length > 0}
                    <p class="detail-skill"><strong>Skill{skillGrants.length > 1 ? "s" : ""}:</strong> {skillGrants.map(g => g.name ?? "").filter(Boolean).join(", ")}</p>
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
                            bonus: "",
                            bonusDescription: "",
                            rules: [],
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

    .card-row { font-size: 0.75rem; line-height: 1.4; color: var(--dh2e-text-primary, #d0cfc8); }
    .stats-row { display: flex; gap: 0.4rem; }

    .stat {
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 0.6rem;
        &.bonus { color: #6c6; background: rgba(102, 204, 102, 0.12); }
        &.penalty { color: #c66; background: rgba(204, 102, 102, 0.12); }
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

    .detail-trait-desc {
        font-size: 0.8rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        margin: 0 0 4px;
        padding-left: 0.5rem;
        border-left: 2px solid var(--dh2e-border, #4a4a55);
    }

    .detail-desc, .detail-bonus {
        font-size: 0.85rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        margin: 0 0 4px;
    }

    .detail-bonus { color: var(--dh2e-text-primary, #d0cfc8); }

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
        input[type="radio"] { accent-color: var(--dh2e-gold, #c8a84e); margin: 0; }
    }

    .item-link {
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-underline-offset: 2px;
        &:hover { color: var(--dh2e-gold-bright, #e0c060); text-decoration-style: solid; }
    }

    .info-btn {
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.7rem;
        padding: 0 2px;
        opacity: 0.6;
        &:hover { color: var(--dh2e-gold, #c8a84e); opacity: 1; }
    }

    .hint { font-style: italic; font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); }
    .input-field { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: 0.65rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; }
</style>
