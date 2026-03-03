<script lang="ts">
    import type { BackgroundOption, CreationData } from "../types.ts";
    import { getAptitudes, getGrantsOfType, getGrants, hasChoices, type GrantSource } from "../creation-helpers.ts";
    import { findInPacks, parseEquipment } from "../wizard.ts";
    import { loadMutationTable, type MutationEntry } from "@corruption/mutation-table.ts";

    async function previewGear(name: string) {
        const doc = await findInPacks(["weapons", "armour", "gear", "cybernetics", "ammunition"], name);
        if (doc) {
            doc.sheet?.render(true);
        } else {
            ui.notifications?.info(`No compendium entry found for "${name}".`);
        }
    }

    /** Open a skill or talent compendium item by name */
    async function openGrantItem(name: string, type: string) {
        const packMap: Record<string, string[]> = {
            skill: ["skills"],
            talent: ["talents"],
        };
        const types = packMap[type] ?? ["skills", "talents"];
        const doc = await findInPacks(types as any, name);
        if (doc) {
            doc.sheet?.render(true);
        } else {
            ui.notifications?.info(`${name} — not found in compendium packs.`);
        }
    }

    /** Show tooltip for a skill/talent grant */
    function showGrantTooltip(event: MouseEvent, name: string, type: string, isChoice = false) {
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            const hint = isChoice ? "Click to select · Shift-click to preview" : "Click to preview";
            const html = `<div><strong>${name}</strong><br/><em>${typeLabel}</em><br/><small>${hint}</small></div>`;
            (game as any).tooltip.activate(el, { html, direction: "UP" });
        }
    }

    /** Show instant hover tooltip with item description from compendium */
    function showGearTooltip(event: MouseEvent, name: string) {
        const desc = gearDescs[name.toLowerCase()];
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:320px"><strong>${name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }

    let {
        data,
        selected = $bindable<BackgroundOption | null>(null),
        backgroundChoices = $bindable<Record<number, string | number>>({}),
        aptitudeChoices = $bindable<Record<number, string>>({}),
        mutationRoll = $bindable<number | null>(null),
        mutationResult = $bindable<{ title: string; description: string; effect: string } | null>(null),
        mutationRollCount = $bindable(0),
        maxMutationRerolls = 0,
    }: {
        data: CreationData;
        selected: BackgroundOption | null;
        backgroundChoices: Record<number, string | number>;
        aptitudeChoices: Record<number, string>;
        mutationRoll: number | null;
        mutationResult: { title: string; description: string; effect: string } | null;
        mutationRollCount: number;
        maxMutationRerolls: number;
    } = $props();

    const backgrounds = $derived(data?.backgrounds ?? []);
    const hasData = $derived(backgrounds.length > 0);

    // Derive data from rules
    const bgAptitudes = $derived(selected ? getAptitudes(selected.rules ?? []) : []);
    const skillGrants = $derived(selected ? getGrantsOfType(selected.rules ?? [], "skill") : []);
    const talentGrants = $derived(selected ? getGrantsOfType(selected.rules ?? [], "talent") : []);
    const allGrants = $derived(selected ? getGrants(selected.rules ?? []) : []);

    /** Equipment-type grants (weapon, armour, gear, cybernetic, companion) for display */
    const equipmentGrants = $derived(allGrants.filter(g =>
        ["weapon", "armour", "gear", "cybernetic", "companion"].includes(g.type),
    ));

    /** Build indexed equipment choices for radio buttons */
    const equipChoices = $derived(
        equipmentGrants.map((g, i) => {
            const grantIdx = allGrants.indexOf(g);
            if (g.optionSets && g.optionSets.length > 1) {
                return { index: grantIdx, grant: g, options: g.optionSets.map(s => s.label), hasChoice: true, isOptionSet: true };
            }
            if (g.options && g.options.length > 1) {
                return { index: grantIdx, grant: g, options: g.options, hasChoice: true, isOptionSet: false };
            }
            return { index: grantIdx, grant: g, options: [g.name ?? ""], hasChoice: false, isOptionSet: false };
        }),
    );

    /** Display name for a grant */
    function grantDisplayName(g: GrantSource): string {
        if (g.name) {
            let label = g.name;
            if (g.quantity && g.quantity > 1) label = `${g.quantity} ${label}`;
            return label;
        }
        if (g.options) return g.options.join(" or ");
        return "Unknown";
    }

    /** Cached gear descriptions for tooltips */
    let gearDescs: Record<string, string> = $state({});

    /** Load gear descriptions when selected background changes */
    $effect(() => {
        const grants = equipmentGrants;
        if (grants.length === 0) { gearDescs = {}; return; }
        (async () => {
            const descs: Record<string, string> = {};
            for (const g of grants) {
                const names = g.options ?? (g.name ? [g.name] : []);
                for (const name of names) {
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

    // --- Mutation roll for Mutant background (Twisted Flesh) ---
    const isMutant = $derived(
        selected?.rules?.some(r => r.key === "RollOption" && r.option === "self:background:twisted-flesh") ?? false
    );

    let cachedMutationTable: MutationEntry[] = $state([]);

    $effect(() => {
        if (isMutant && cachedMutationTable.length === 0) {
            loadMutationTable().then(t => { cachedMutationTable = t; });
        }
    });

    const canRerollMutation = $derived(mutationRollCount > 0 && mutationRollCount <= maxMutationRerolls);

    async function rollStartingMutation() {
        const roll = new foundry.dice.Roll("5d10");
        await roll.evaluate();
        mutationRoll = roll.total ?? 25;
        mutationRollCount++;
        const entry = cachedMutationTable.find(e => mutationRoll! >= e.min && mutationRoll! <= e.max);
        if (entry) mutationResult = { title: entry.title, description: entry.description, effect: entry.effect };
    }
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
                {@const isSelected = selected === bg}
                {@const apts = getAptitudes(bg.rules ?? [])}
                <button
                    class="option-card"
                    class:selected={isSelected}
                    type="button"
                    onclick={() => { selected = bg; backgroundChoices = {}; aptitudeChoices = {}; }}
                >
                    <div class="card-header">
                        {bg.name}
                        {#if bg.source && bg.source !== "core-rulebook"}
                            <span class="source-badge">{game.i18n?.localize(`DH2E.Source.${bg.source}`) ?? bg.source}</span>
                        {/if}
                    </div>
                    <div class="card-row tag-row">
                        {#each apts as apt}
                            <span class="tag">{typeof apt === "string" ? apt : apt.join(" or ")}</span>
                        {/each}
                    </div>
                </button>
            {/each}
        </div>

        {#if selected}
            <div class="detail-panel">
                <h4 class="detail-name">{selected.name}</h4>

                {#if bgAptitudes.length > 0}
                    <div class="detail-list aptitude-choices">
                        <strong>Aptitude:</strong>
                        {#each bgAptitudes as apt, ai}
                            {#if ai > 0}<span class="grant-sep">,</span>{/if}
                            {#if typeof apt === "string"}
                                <span class="aptitude-fixed">{apt}</span>
                            {:else}
                                {@const selectedApt = aptitudeChoices[ai] ?? apt[0]}
                                <span class="grant-choice">
                                    {#each apt as option, oi}
                                        {#if oi > 0}<span class="grant-or">or</span>{/if}
                                        <button class="grant-link" type="button"
                                            class:chosen={selectedApt === option}
                                            class:unchosen={selectedApt !== option}
                                            onclick={() => {
                                                if (option === apt[0]) {
                                                    const { [ai]: _, ...rest } = aptitudeChoices;
                                                    aptitudeChoices = rest;
                                                } else {
                                                    aptitudeChoices = { ...aptitudeChoices, [ai]: option };
                                                }
                                            }}>{option}</button>
                                    {/each}
                                </span>
                            {/if}
                        {/each}
                    </div>
                {/if}

                <div class="detail-lists">
                    {#if skillGrants.length > 0}
                        <div class="detail-list">
                            <strong>Skills:</strong>
                            {#each skillGrants as g, i}
                                {@const grantIdx = allGrants.indexOf(g)}
                                {@const isChoice = g.options && g.options.length > 1}
                                {@const selectedOpt = isChoice ? (backgroundChoices[grantIdx] ?? g.options[0]) : null}
                                {#if i > 0}<span class="grant-sep">,</span>{/if}
                                {#if isChoice}
                                    <span class="grant-choice">
                                        {#each g.options as opt, j}
                                            {#if j > 0}<span class="grant-or">or</span>{/if}
                                            <button class="grant-link" type="button"
                                                class:chosen={selectedOpt === opt}
                                                class:unchosen={selectedOpt !== opt}
                                                onmouseenter={(e) => showGrantTooltip(e, opt, "skill", true)}
                                                onclick={(e) => {
                                                    if (e.shiftKey || e.ctrlKey) { openGrantItem(opt, "skill"); return; }
                                                    if (j === 0) {
                                                        const { [grantIdx]: _, ...rest } = backgroundChoices;
                                                        backgroundChoices = rest;
                                                    } else {
                                                        backgroundChoices = { ...backgroundChoices, [grantIdx]: opt };
                                                    }
                                                }}>{opt}</button>
                                        {/each}
                                    </span>
                                {:else}
                                    <button class="grant-link" type="button"
                                        onmouseenter={(e) => showGrantTooltip(e, g.name ?? "", "skill")}
                                        onclick={() => openGrantItem(g.name ?? "", "skill")}>{g.name ?? ""}</button>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                    {#if talentGrants.length > 0}
                        <div class="detail-list">
                            <strong>Talents:</strong>
                            {#each talentGrants as g, i}
                                {@const grantIdx = allGrants.indexOf(g)}
                                {@const isChoice = g.options && g.options.length > 1}
                                {@const selectedOpt = isChoice ? (backgroundChoices[grantIdx] ?? g.options[0]) : null}
                                {#if i > 0}<span class="grant-sep">,</span>{/if}
                                {#if isChoice}
                                    <span class="grant-choice">
                                        {#each g.options as opt, j}
                                            {#if j > 0}<span class="grant-or">or</span>{/if}
                                            <button class="grant-link" type="button"
                                                class:chosen={selectedOpt === opt}
                                                class:unchosen={selectedOpt !== opt}
                                                onmouseenter={(e) => showGrantTooltip(e, opt, "talent", true)}
                                                onclick={(e) => {
                                                    if (e.shiftKey || e.ctrlKey) { openGrantItem(opt, "talent"); return; }
                                                    if (j === 0) {
                                                        const { [grantIdx]: _, ...rest } = backgroundChoices;
                                                        backgroundChoices = rest;
                                                    } else {
                                                        backgroundChoices = { ...backgroundChoices, [grantIdx]: opt };
                                                    }
                                                }}>{opt}</button>
                                        {/each}
                                    </span>
                                {:else}
                                    <button class="grant-link" type="button"
                                        onmouseenter={(e) => showGrantTooltip(e, g.name ?? "", "talent")}
                                        onclick={() => openGrantItem(g.name ?? "", "talent")}>{g.name ?? ""}</button>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
                {#if selected.description}
                    <p class="detail-desc">{selected.description}</p>
                {/if}
                {#if selected.bonusDescription}
                    <p class="detail-bonus"><strong>{selected.bonus}:</strong> {selected.bonusDescription}</p>
                {/if}

                {#if isMutant}
                    <div class="mutation-section">
                        <h5 class="mutation-section-title">Starting Mutation</h5>
                        {#if mutationRoll === null}
                            <button class="btn mutation-roll-btn" type="button" onclick={rollStartingMutation}>
                                <i class="fa-solid fa-dice"></i> Roll Starting Mutation (5d10)
                            </button>
                        {:else}
                            <div class="mutation-result">
                                <span class="mutation-roll-badge">{mutationRoll}</span>
                                {#if mutationResult}
                                    <span class="mutation-title">{mutationResult.title}</span>
                                    <p class="mutation-effect">{mutationResult.effect}</p>
                                {/if}
                                {#if canRerollMutation}
                                    <button class="btn mutation-reroll-btn" type="button" onclick={rollStartingMutation}>
                                        <i class="fa-solid fa-rotate"></i> Re-roll ({maxMutationRerolls - mutationRollCount + 1} left)
                                    </button>
                                {/if}
                            </div>
                        {/if}
                    </div>
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
                                                    value={choice.isOptionSet ? oi : opt}
                                                    checked={oi === 0 ? !(choice.index in backgroundChoices) : backgroundChoices[choice.index] === (choice.isOptionSet ? oi : opt)}
                                                    onchange={() => {
                                                        if (oi === 0) {
                                                            const { [choice.index]: _, ...rest } = backgroundChoices;
                                                            backgroundChoices = rest;
                                                        } else {
                                                            backgroundChoices = { ...backgroundChoices, [choice.index]: choice.isOptionSet ? oi : opt };
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
                                {@const displayName = grantDisplayName(choice.grant)}
                                <div class="gear-fixed-row" onmouseenter={(e) => showGearTooltip(e, choice.grant.name ?? "")}>
                                    <i class="fa-solid fa-check gear-check"></i>
                                    <span class="gear-name">{displayName}</span>
                                    <button class="gear-preview-btn" type="button" title="Preview item" onclick={(e) => { e.stopPropagation(); previewGear(choice.grant.name ?? ""); }}>
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
                            bonus: "",
                            bonusDescription: "",
                            rules: [],
                        } as BackgroundOption;
                    }}
                    placeholder="e.g., Imperial Guard"
                />
            </label>
        </div>
    {/if}
</div>

<style lang="scss">
    .step-content { display: flex; flex-direction: column; gap: 0.5rem; }
    .step-title { font-family: var(--dh2e-font-header, serif); color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
    .step-desc { font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); margin: 0; }

    .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem; }

    .option-card {
        display: flex !important; flex-direction: column !important; align-items: stretch !important;
        height: auto !important; min-height: auto !important;
        padding: 8px 10px; gap: 3px; background: var(--dh2e-bg-mid, #2e2e35);
        border: 2px solid var(--dh2e-border, #4a4a55); border-radius: 3px; cursor: pointer;
        text-align: left; color: inherit; font: inherit; font-size: inherit; line-height: 1.3;
        transition: border-color 0.15s;
        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); }
        &.selected { border-color: var(--dh2e-gold, #c8a84e); background: #2a2820; }
    }

    .card-header {
        font-family: var(--dh2e-font-header, serif); color: var(--dh2e-gold, #c8a84e);
        font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
        display: flex; align-items: baseline; justify-content: space-between; gap: 0.4rem;
    }

    .source-badge {
        font-family: var(--dh2e-font-body, sans-serif); font-size: 0.5rem; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.04em; color: #b0a0d0;
        background: rgba(140, 120, 180, 0.15); padding: 1px 4px; border-radius: 2px; white-space: nowrap;
    }

    .card-row { font-size: 0.75rem; line-height: 1.35; color: var(--dh2e-text-primary, #d0cfc8); }
    .tag-row { margin-top: 0.1rem; display: flex; flex-wrap: wrap; gap: 0.2rem; }
    .tag {
        font-size: 0.65rem; font-weight: 700; padding: 0.05rem 0.3rem; border-radius: 2px;
        text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--dh2e-gold, #c8a84e); background: rgba(200, 168, 78, 0.15);
    }

    .detail-panel { background: var(--dh2e-bg-mid, #2e2e35); border: 1px solid var(--dh2e-gold-dark, #9c7a28); border-radius: 3px; padding: 0.6rem 0.8rem; }
    .detail-name { font-family: var(--dh2e-font-header, serif); color: var(--dh2e-gold, #c8a84e); font-size: 1rem; text-transform: uppercase; margin: 0 0 0.3rem; }
    .detail-lists { margin-bottom: 0.3rem; }
    .detail-list { font-size: 0.8rem; color: var(--dh2e-text-primary, #d0cfc8); line-height: 1.4; margin: 0 0 0.15rem; }
    .detail-desc { font-size: 0.85rem; color: var(--dh2e-text-secondary, #a0a0a8); line-height: 1.4; margin: 0 0 0.3rem; }
    .detail-bonus { font-size: 0.85rem; color: var(--dh2e-text-primary, #d0cfc8); line-height: 1.4; margin: 0; }

    .gear-section { margin-top: 0.5rem; border-top: 1px solid var(--dh2e-border, #4a4a55); padding-top: 0.5rem; }
    .gear-section-title { font-size: 0.75rem; font-weight: 700; color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.4rem; }
    .gear-list { display: flex; flex-direction: column; gap: 0.35rem; }

    .gear-fixed-row {
        display: flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.4rem;
        font-size: 0.8rem; color: var(--dh2e-text-primary, #d0cfc8); border-radius: 2px;
        &:hover { background: rgba(255, 255, 255, 0.03); }
    }
    .gear-check { font-size: 0.6rem; color: var(--dh2e-gold-muted, #7a6a3e); flex-shrink: 0; width: 1rem; text-align: center; }
    .gear-name { flex: 1; min-width: 0; }

    .gear-choice-card { position: relative; border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 3px; padding: 0.45rem 0.5rem 0.35rem; background: rgba(0, 0, 0, 0.15); }
    .choice-badge { position: absolute; top: -0.5em; left: 0.5rem; font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dh2e-gold-muted, #7a6a3e); background: var(--dh2e-bg-mid, #2e2e35); padding: 0 0.3rem; }
    .gear-choice-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.1rem; }
    .or-divider { display: block; text-align: center; font-size: 0.6rem; font-weight: 700; font-style: italic; color: var(--dh2e-text-secondary, #a0a0a8); letter-spacing: 0.1em; padding: 0.05rem 0; opacity: 0.7; }
    .gear-choice-label {
        display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem;
        color: var(--dh2e-text-primary, #d0cfc8); cursor: pointer; padding: 0.1rem 0;
        input[type="radio"] { accent-color: var(--dh2e-gold, #c8a84e); margin: 0; flex-shrink: 0; }
    }
    .gear-preview-btn {
        background: none; border: none; padding: 0 0.2rem; cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8); font-size: 0.7rem; flex-shrink: 0; margin-left: auto;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }

    /* Clickable skill/talent grant links */
    .grant-link {
        background: none; border: none; padding: 0; margin: 0; font: inherit; font-size: inherit;
        color: var(--dh2e-gold, #c8a84e); cursor: pointer;
        border-bottom: 1px dotted var(--dh2e-gold-muted, #8a7a3e);
        transition: color 0.15s, border-color 0.15s, opacity 0.15s;
        &:hover { color: var(--dh2e-gold-light, #e8d07e); border-bottom-style: solid; }
        /* Selected choice option */
        &.chosen { color: var(--dh2e-gold-light, #e8d07e); border-bottom-style: solid; font-weight: 700; }
        /* Unselected choice option */
        &.unchosen { opacity: 0.45; border-bottom-style: dotted; font-weight: normal; }
        &.unchosen:hover { opacity: 0.8; }
    }
    .aptitude-choices { margin-bottom: 0.3rem; }
    .aptitude-fixed { font-weight: 600; color: var(--dh2e-gold, #c8a84e); }
    .grant-sep { color: var(--dh2e-text-secondary, #a0a0a8); margin-right: 0.15em; }
    .grant-or { color: var(--dh2e-text-secondary, #a0a0a8); font-style: italic; font-size: 0.85em; margin: 0 0.2em; }
    .grant-choice {
        display: inline-flex; align-items: baseline;
        background: rgba(200, 168, 78, 0.06); border: 1px solid rgba(200, 168, 78, 0.15);
        border-radius: 3px; padding: 0 0.3em;
    }

    .mutation-section { margin-top: 0.5rem; border-top: 1px solid var(--dh2e-border, #4a4a55); padding-top: 0.5rem; }
    .mutation-section-title { font-size: 0.75rem; font-weight: 700; color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.4rem; }
    .mutation-roll-btn {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.3rem 0.7rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        background: var(--dh2e-gold-dark, #9c7a28); color: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-gold, #c8a84e); border-radius: 3px;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }
    .mutation-result { display: flex; flex-direction: column; gap: 0.25rem; }
    .mutation-roll-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 2rem; height: 1.4rem; font-size: 0.75rem; font-weight: 700;
        background: rgba(200, 168, 78, 0.2); border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: 3px; color: var(--dh2e-gold, #c8a84e);
    }
    .mutation-title { font-weight: 700; color: var(--dh2e-gold, #c8a84e); font-size: 0.9rem; }
    .mutation-effect { font-size: 0.8rem; color: var(--dh2e-text-primary, #d0cfc8); line-height: 1.4; margin: 0; }
    .mutation-reroll-btn {
        display: inline-flex; align-items: center; gap: 0.3rem; align-self: flex-start;
        padding: 0.15rem 0.5rem; font-size: 0.65rem; font-weight: 600; cursor: pointer;
        background: var(--dh2e-bg-mid, #2e2e35); color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 3px;
        &:hover { color: var(--dh2e-gold, #c8a84e); border-color: var(--dh2e-gold-dark, #9c7a28); }
    }

    .hint { font-style: italic; font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); }
    .input-field { display: flex; flex-direction: column; gap: 0.125rem; }
    .field-label { font-size: 0.65rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; }
</style>
