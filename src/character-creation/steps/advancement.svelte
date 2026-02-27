<script lang="ts">
    import type { WizardPurchase, HomeworldOption, BackgroundOption, RoleOption } from "../types.ts";
    import type { CharacteristicAbbrev } from "../../actor/types.ts";
    import type { AdvanceOption, XPCostData } from "../../advancement/types.ts";
    import {
        loadXPCostData,
        countAptitudeMatches,
        getCharacteristicCost,
        getSkillCost,
        getTalentCost,
        getCharacteristicAptitudes,
        getSkillAptitudes,
    } from "../../advancement/aptitudes.ts";

    let {
        startingXP,
        homeworld,
        background,
        role,
        purchases = $bindable<WizardPurchase[]>([]),
        xpSpent = $bindable<number>(0),
    }: {
        startingXP: number;
        homeworld: HomeworldOption | null;
        background: BackgroundOption | null;
        role: RoleOption | null;
        purchases: WizardPurchase[];
        xpSpent: number;
    } = $props();

    const CHAR_KEYS: CharacteristicAbbrev[] = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];
    const CHAR_LABELS: Record<string, string> = {
        ws: "Weapon Skill", bs: "Ballistic Skill", s: "Strength", t: "Toughness",
        ag: "Agility", int: "Intelligence", per: "Perception", wp: "Willpower", fel: "Fellowship",
    };
    const CHAR_ADVANCE_NAMES = ["Simple", "Intermediate", "Trained", "Expert"];

    let mode = $state<"choose" | "shopping">("choose");
    let filter = $state<"all" | "characteristic" | "skill" | "talent">("all");
    let search = $state("");
    let affordableOnly = $state(false);
    let expandedTalent = $state<string | null>(null);
    let costs = $state<XPCostData | null>(null);

    // Compute aptitudes from selections (same logic as wizard finish)
    const aptitudes = $derived(() => {
        const apts: string[] = [];
        if (homeworld?.aptitude) apts.push(homeworld.aptitude);
        if (background?.aptitude) {
            // Resolve "X or Y" → first
            const resolved = background.aptitude.split(/,?\s+or\s+/)[0].trim();
            apts.push(resolved);
        }
        if (role?.aptitudes) {
            for (const apt of role.aptitudes) {
                const resolved = apt.split(/,?\s+or\s+/)[0].trim();
                apts.push(resolved);
            }
        }
        return [...new Set(apts)];
    });

    const xpAvailable = $derived(startingXP - xpSpent);

    // Track characteristic advances from purchases
    function getCharAdvances(key: string): number {
        return purchases.filter(p => p.category === "characteristic" && p.key === key).length;
    }

    // Load costs on mount
    $effect(() => {
        loadXPCostData().then(c => { costs = c; });
    });

    // Build advance options for characteristics
    const charOptions = $derived(() => {
        if (!costs) return [];
        const apts = aptitudes();
        const options: AdvanceOption[] = [];

        for (const key of CHAR_KEYS) {
            const advances = getCharAdvances(key);
            if (advances >= 4) continue;
            const aptPair = getCharacteristicAptitudes(costs, key);
            const matchCount = countAptitudeMatches(apts, aptPair);
            const cost = getCharacteristicCost(costs, advances, matchCount);
            options.push({
                category: "characteristic",
                label: CHAR_LABELS[key],
                sublabel: `${CHAR_ADVANCE_NAMES[advances]} (${advances + 1}${ordSuffix(advances + 1)})`,
                key,
                cost,
                matchCount,
                aptitudes: aptPair,
                currentLevel: advances,
                nextLevel: advances + 1,
                maxLevel: 4,
                affordable: xpAvailable >= cost,
                alreadyMaxed: false,
                prereqsMet: true,
                prereqsUnmet: [],
            });
        }
        return options;
    });

    // Build talent options from compendium — loaded async
    let talentIndex = $state<any[]>([]);

    // Load talent index with system fields on mount — scan all dh2e modules
    $effect(() => {
        import("@util/pack-discovery.ts").then(async ({ getAllIndexesOfType }) => {
            const entries = await getAllIndexesOfType("talents");
            talentIndex = entries;
        });
    });

    const talentOptions = $derived(() => {
        if (!costs || talentIndex.length === 0) return [];
        const apts = aptitudes();
        const options: AdvanceOption[] = [];
        const ownedNames = new Set(purchases.filter(p => p.category === "talent").map(p => p.label));

        for (const meta of talentIndex) {
            if (ownedNames.has(meta.name)) continue;
            const sys = meta.system ?? {};
            const tier: number = sys.tier ?? 1;
            const talentApts: string[] = sys.aptitudes ?? [];
            const aptPair: [string, string] = [talentApts[0] ?? "General", talentApts[1] ?? "General"];
            const matchCount = countAptitudeMatches(apts, aptPair);
            const cost = getTalentCost(costs!, tier, matchCount);

            options.push({
                category: "talent",
                label: meta.name,
                sublabel: `Tier ${tier}`,
                key: meta._id,
                cost,
                matchCount,
                aptitudes: aptPair,
                currentLevel: 0,
                nextLevel: 1,
                maxLevel: 1,
                affordable: xpAvailable >= cost,
                alreadyMaxed: false,
                prereqsMet: true,
                prereqsUnmet: [],
                compendiumUuid: meta.uuid ?? `Compendium.${meta.packId}.${meta._id}`,
                description: sys.description ?? "",
            });
        }

        return options.sort((a, b) => {
            const tierA = parseInt(a.sublabel.match(/\d+/)?.[0] ?? "1");
            const tierB = parseInt(b.sublabel.match(/\d+/)?.[0] ?? "1");
            if (tierA !== tierB) return tierA - tierB;
            return a.label.localeCompare(b.label);
        });
    });

    // Filtered + searched + sorted options
    const filteredOptions = $derived(() => {
        let opts: AdvanceOption[] = [];
        if (filter === "all" || filter === "characteristic") opts = opts.concat(charOptions());
        if (filter === "all" || filter === "talent") opts = opts.concat(talentOptions());
        const term = search.toLowerCase().trim();
        if (term) {
            opts = opts.filter(o => o.label.toLowerCase().includes(term) || o.sublabel.toLowerCase().includes(term));
        }
        if (affordableOnly) {
            opts = opts.filter(o => o.affordable);
        }
        if (sortCol) {
            const dir = sortDir === "desc" ? -1 : 1;
            opts = [...opts].sort((a, b) => {
                if (sortCol === "aptMatch") {
                    const diff = a.matchCount - b.matchCount;
                    if (diff !== 0) return diff * dir;
                    return a.label.localeCompare(b.label);
                }
                const nameCmp = a.label.localeCompare(b.label) * dir;
                if (nameCmp !== 0) return nameCmp;
                return b.matchCount - a.matchCount;
            });
        }
        return opts;
    });

    function buyOption(opt: AdvanceOption) {
        if (xpAvailable < opt.cost) return;
        const purchase: WizardPurchase = {
            category: opt.category,
            label: opt.label,
            sublabel: opt.sublabel,
            key: opt.key,
            cost: opt.cost,
            nextLevel: opt.nextLevel,
            compendiumUuid: opt.compendiumUuid,
        };
        purchases = [...purchases, purchase];
        xpSpent += opt.cost;
    }

    function undoLast() {
        if (purchases.length === 0) return;
        const last = purchases[purchases.length - 1];
        purchases = purchases.slice(0, -1);
        xpSpent -= last.cost;
    }

    function ordSuffix(n: number): string {
        if (n === 1) return "st";
        if (n === 2) return "nd";
        if (n === 3) return "rd";
        return "th";
    }

    function matchPips(count: 0 | 1 | 2): string {
        if (count === 2) return "\u25C9\u25C9";
        if (count === 1) return "\u25C9\u25CB";
        return "\u25CB\u25CB";
    }

    function matchTooltip(opt: AdvanceOption): string {
        const labels = ["No matching aptitudes — full price",
                        "1 matching aptitude — reduced cost",
                        "2 matching aptitudes — cheapest cost"];
        return `${labels[opt.matchCount]}\nRequired: ${opt.aptitudes.join(", ")}`;
    }

    function categoryIcon(cat: string): string {
        if (cat === "characteristic") return "fa-solid fa-chart-bar";
        if (cat === "skill") return "fa-solid fa-graduation-cap";
        if (cat === "talent") return "fa-solid fa-star";
        return "fa-solid fa-star";
    }

    function toggleExpanded(key: string) {
        expandedTalent = expandedTalent === key ? null : key;
    }

    type SortColumn = "name" | "aptMatch";
    let sortCol: SortColumn | null = $state(null);
    let sortDir: "asc" | "desc" = $state("desc");

    function toggleSort(col: SortColumn) {
        if (sortCol === col) {
            if (sortDir === "desc") sortDir = "asc";
            else { sortCol = null; sortDir = "desc"; }
        } else {
            sortCol = col;
            sortDir = "desc";
        }
    }
</script>

<div class="step-content">
    <h3 class="step-title">Advancement</h3>

    {#if mode === "choose"}
        <p class="step-desc">
            You have <strong>{startingXP}</strong> starting XP. Would you like to spend it now?
        </p>
        <div class="choice-buttons">
            <button class="btn choice-btn primary" type="button" onclick={() => { mode = "shopping"; }}>
                Spend XP Now
            </button>
            <button class="btn choice-btn" type="button" onclick={() => { /* just continue to next step */ }}>
                Skip — Spend Later
            </button>
        </div>
    {:else}
        <!-- XP summary bar -->
        <header class="shop-header">
            <div class="xp-display">
                <span class="xp-chip available">Available <strong>{xpAvailable}</strong></span>
                <span class="xp-chip">Spent <strong>{xpSpent}</strong></span>
                <span class="xp-chip">Total <strong>{startingXP}</strong></span>
                {#if purchases.length > 0}
                    <button class="btn undo-btn" type="button" onclick={undoLast}>Undo</button>
                {/if}
            </div>
            <div class="aptitude-badges">
                <span class="apt-label">Aptitudes:</span>
                {#each aptitudes() as apt}
                    <span class="apt-badge">{apt}</span>
                {/each}
            </div>
        </header>

        <!-- Filter row -->
        <div class="filter-row">
            <div class="filter-tabs">
                <button class="tab" class:active={filter === "all"} type="button" onclick={() => filter = "all"}>All</button>
                <button class="tab" class:active={filter === "characteristic"} type="button" onclick={() => filter = "characteristic"}>Characteristics</button>
                <button class="tab" class:active={filter === "talent"} type="button" onclick={() => filter = "talent"}>Talents</button>
            </div>
            <div class="filter-controls">
                <label class="affordable-toggle">
                    <input type="checkbox" bind:checked={affordableOnly} />
                    Affordable
                </label>
                <input class="search-input" type="text" placeholder="Search..." bind:value={search} />
            </div>
        </div>

        <!-- Advance list -->
        <div class="advance-list">
            <div class="advance-header">
                <span class="hdr-icon"></span>
                <button class="hdr-name sortable" type="button" onclick={() => toggleSort("name")}>
                    Advance
                    {#if sortCol === "name"}
                        <i class="fa-solid fa-xs" class:fa-caret-down={sortDir === "desc"} class:fa-caret-up={sortDir === "asc"}></i>
                    {/if}
                </button>
                <span class="hdr-info"></span>
                <button class="hdr-pips" type="button" onclick={() => toggleSort("aptMatch")}>
                    Apt
                    {#if sortCol === "aptMatch"}
                        <i class="fa-solid fa-xs" class:fa-caret-down={sortDir === "desc"} class:fa-caret-up={sortDir === "asc"}></i>
                    {/if}
                </button>
                <span class="hdr-cost">Cost</span>
                <span class="hdr-action"></span>
            </div>
            {#each filteredOptions() as opt (opt.key + opt.category + opt.sublabel)}
                <div class="advance-row" class:unaffordable={!opt.affordable}>
                    <span class="row-icon"><i class={categoryIcon(opt.category)}></i></span>
                    <div class="row-info">
                        <span class="row-label">{opt.label}</span>
                        <span class="row-sublabel">{opt.sublabel}</span>
                        <span class="row-apts">{opt.aptitudes.join(", ")}</span>
                    </div>
                    {#if opt.category === "talent" && opt.description}
                        <button class="info-btn" type="button" onclick={(e) => { e.stopPropagation(); toggleExpanded(opt.key); }} title="Show description">
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    {:else}
                        <span class="info-btn-spacer"></span>
                    {/if}
                    {#if opt.aptitudes.length > 0}
                        <span class="row-pips" title={matchTooltip(opt)}>{matchPips(opt.matchCount)}</span>
                    {:else}
                        <span class="row-pips"></span>
                    {/if}
                    <span class="row-cost" class:affordable={opt.affordable} class:too-expensive={!opt.affordable}>
                        {opt.cost} XP
                    </span>
                    <div class="row-action">
                        <button class="buy-btn" type="button" disabled={!opt.affordable} onclick={() => buyOption(opt)}>Buy</button>
                    </div>
                </div>
                {#if expandedTalent === opt.key && opt.description}
                    <div class="talent-desc">{opt.description}</div>
                {/if}
            {:else}
                <div class="empty-state">No advances match your filters.</div>
            {/each}
        </div>

        <!-- Purchase log -->
        {#if purchases.length > 0}
            <div class="purchase-log">
                <span class="log-title">Purchases ({purchases.length})</span>
                {#each purchases as p}
                    <span class="log-entry">{p.label} — {p.sublabel} ({p.cost} XP)</span>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    .step-content {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
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

    .choice-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-top: var(--dh2e-space-md, 0.75rem);
    }
    .choice-btn {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        cursor: pointer;
        font-weight: 600;
        &.primary {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
            &:hover { background: var(--dh2e-gold, #c8a84e); }
        }
        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); }
    }

    /* Header — XP chips + aptitude badges */
    .shop-header {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .xp-display {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: center;
    }
    .xp-chip {
        background: var(--dh2e-bg-light, #3a3a42);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        strong { color: var(--dh2e-text-primary, #d0cfc8); font-weight: 700; }
        &.available {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
            strong { color: var(--dh2e-gold, #c8a84e); }
        }
    }
    .undo-btn {
        margin-left: auto;
        padding: 2px 8px;
        background: var(--dh2e-bg-light, #3a3a42);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        font-size: 0.65rem;
        cursor: pointer;
        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); color: var(--dh2e-text-primary, #d0cfc8); }
    }
    .aptitude-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
    }
    .apt-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 600;
    }
    .apt-badge {
        font-size: 0.6rem;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        padding: 1px 6px;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    /* Filter row */
    .filter-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        flex-wrap: wrap;
    }
    .filter-tabs {
        display: flex;
        gap: 2px;
    }
    .tab {
        background: var(--dh2e-bg-light, #3a3a42);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        &:hover { border-color: var(--dh2e-gold-muted, #8a7a3e); color: var(--dh2e-text-primary, #d0cfc8); }
        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-bg-darkest, #111114);
            font-weight: 700;
        }
    }
    .filter-controls {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }
    .affordable-toggle {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .search-input {
        background: var(--dh2e-bg-light, #3a3a42);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        width: 120px;
        &::placeholder { color: var(--dh2e-text-secondary, #a0a0a8); opacity: 0.6; }
        &:focus { border-color: var(--dh2e-gold-muted, #8a7a3e); outline: none; }
    }

    /* Advance list */
    .advance-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 300px;
    }
    .advance-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        position: sticky;
        top: 0;
        background: var(--dh2e-bg-darkest, #111114);
        z-index: 1;
    }
    .hdr-icon { width: 18px; }
    .hdr-name {
        flex: 1;
        text-align: left;
        &.sortable {
            background: none;
            border: none;
            color: var(--dh2e-text-secondary, #a0a0a8);
            font-size: var(--dh2e-text-xs, 0.7rem);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 2px;
            &:hover { color: var(--dh2e-gold, #c8a84e); }
            i { font-size: 0.55rem; }
        }
    }
    .hdr-info { width: 22px; }
    .hdr-pips {
        width: 40px;
        text-align: center;
        cursor: pointer;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
        i { font-size: 0.55rem; }
    }
    .hdr-cost { min-width: 50px; text-align: right; }
    .hdr-action { width: 50px; }

    .advance-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-light, #3a3a42);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        &.unaffordable { opacity: 0.6; }
    }
    .row-icon {
        width: 18px;
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        flex-shrink: 0;
    }
    .row-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    .row-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .row-sublabel {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .row-apts {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
    }
    .info-btn {
        width: 22px;
        height: 22px;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }
    .info-btn-spacer {
        width: 22px;
        flex-shrink: 0;
    }
    .row-pips {
        width: 40px;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        letter-spacing: 2px;
        cursor: help;
        flex-shrink: 0;
        text-align: center;
    }
    .row-cost {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        min-width: 50px;
        text-align: right;
        flex-shrink: 0;
        &.affordable { color: var(--dh2e-success, #4a8); }
        &.too-expensive { color: var(--dh2e-red-bright, #e04040); }
    }
    .row-action {
        width: 50px;
        flex-shrink: 0;
    }
    .buy-btn {
        width: 100%;
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        text-transform: uppercase;
        cursor: pointer;
        &:hover:not(:disabled) { background: var(--dh2e-gold, #c8a84e); }
        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-text-secondary, #a0a0a8);
            border-color: var(--dh2e-border, #4a4a55);
        }
    }

    .talent-desc {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-sm, 0.5rem);
        padding-left: calc(18px + var(--dh2e-space-sm, 0.5rem) + var(--dh2e-space-sm, 0.5rem));
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        line-height: 1.4;
        background: rgba(200, 168, 78, 0.03);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-top: none;
        border-radius: 0 0 var(--dh2e-radius-sm, 3px) var(--dh2e-radius-sm, 3px);
    }

    .empty-state {
        padding: var(--dh2e-space-lg, 1.5rem);
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .purchase-log {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        max-height: 80px;
        overflow-y: auto;
    }
    .log-title {
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
    }
    .log-entry {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
</style>
