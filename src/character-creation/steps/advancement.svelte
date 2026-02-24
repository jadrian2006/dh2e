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

    // Build talent options from compendium
    const talentOptions = $derived(() => {
        if (!costs) return [];
        const apts = aptitudes();
        const options: AdvanceOption[] = [];
        const ownedNames = new Set(purchases.filter(p => p.category === "talent").map(p => p.label));

        const talentPack = (globalThis as any).game?.packs?.get("dh2e-data.talents");
        if (!talentPack) return [];

        for (const entry of talentPack.index) {
            const meta = entry as any;
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
                compendiumUuid: `Compendium.dh2e-data.talents.${meta._id}`,
            });
        }

        return options.sort((a, b) => {
            const tierA = parseInt(a.sublabel.match(/\d+/)?.[0] ?? "1");
            const tierB = parseInt(b.sublabel.match(/\d+/)?.[0] ?? "1");
            if (tierA !== tierB) return tierA - tierB;
            return a.label.localeCompare(b.label);
        });
    });

    // Filtered + searched options
    const filteredOptions = $derived(() => {
        let opts: AdvanceOption[] = [];
        if (filter === "all" || filter === "characteristic") opts = opts.concat(charOptions());
        if (filter === "all" || filter === "talent") opts = opts.concat(talentOptions());
        if (search) {
            const lc = search.toLowerCase();
            opts = opts.filter(o => o.label.toLowerCase().includes(lc));
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

    function matchTooltip(opt: AdvanceOption): string {
        const labels = ["No matching aptitudes — full price",
                        "1 matching aptitude — reduced cost",
                        "2 matching aptitudes — cheapest cost"];
        return `${labels[opt.matchCount]}\nRequired: ${opt.aptitudes.join(", ")}`;
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
        <div class="xp-bar">
            <span class="xp-total">XP: {xpAvailable} / {startingXP}</span>
            {#if purchases.length > 0}
                <button class="btn undo-btn" type="button" onclick={undoLast}>Undo Last</button>
            {/if}
        </div>

        <!-- Filters -->
        <div class="filter-bar">
            <button class="filter-btn" class:active={filter === "all"} type="button" onclick={() => filter = "all"}>All</button>
            <button class="filter-btn" class:active={filter === "characteristic"} type="button" onclick={() => filter = "characteristic"}>Characteristics</button>
            <button class="filter-btn" class:active={filter === "talent"} type="button" onclick={() => filter = "talent"}>Talents</button>
            <input class="search-input" type="text" placeholder="Search..." bind:value={search} />
        </div>

        <!-- Options list -->
        <div class="options-list">
            <div class="options-header">
                <span class="hdr-name">Advance</span>
                <span class="hdr-cost">Cost</span>
                <span class="hdr-match" title="Aptitude matches — each filled dot = one matching aptitude. More matches = lower XP cost.">Apt Match</span>
            </div>
            {#each filteredOptions() as opt}
                <button
                    class="option-row"
                    class:affordable={opt.affordable}
                    class:unaffordable={!opt.affordable}
                    type="button"
                    onclick={() => buyOption(opt)}
                    disabled={!opt.affordable}
                >
                    <div class="opt-info">
                        <span class="opt-label">{opt.label}</span>
                        <span class="opt-sublabel">{opt.sublabel}</span>
                    </div>
                    <div class="opt-cost">
                        <span class="cost-value">{opt.cost}</span>
                        <span class="cost-xp">XP</span>
                    </div>
                    <div class="opt-matches" title={matchTooltip(opt)}>
                        <span class="match-dots">
                            {#each Array(2) as _, i}
                                <span class="dot" class:filled={i < opt.matchCount}></span>
                            {/each}
                        </span>
                    </div>
                </button>
            {:else}
                <p class="no-results">No advances match your filters.</p>
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

    .xp-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
    }

    .xp-total {
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .undo-btn {
        padding: 2px 8px;
        background: var(--dh2e-bg-light, #3a3a42);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        font-size: 0.65rem;
        cursor: pointer;
        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .filter-bar {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
        align-items: center;
    }

    .filter-btn {
        padding: 2px 8px;
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        font-size: 0.65rem;
        cursor: pointer;

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .search-input {
        flex: 1;
        padding: 2px 8px;
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        font-size: 0.7rem;
        &:focus { border-color: var(--dh2e-gold, #c8a84e); outline: none; }
    }

    .options-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 280px;
        overflow-y: auto;
    }

    .options-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: 2px var(--dh2e-space-sm, 0.5rem);
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
    }
    .hdr-name { flex: 1; }
    .hdr-cost { width: auto; }
    .hdr-match { cursor: help; }

    .option-row {
        display: flex !important;
        align-items: center !important;
        height: auto !important;
        min-height: auto !important;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid transparent;
        border-radius: 2px;
        cursor: pointer;
        text-align: left;
        color: inherit;
        font: inherit;

        &.affordable:hover {
            border-color: var(--dh2e-gold-dark, #9c7a28);
            background: #2a2820;
        }

        &.unaffordable {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    .opt-info {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .opt-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .opt-sublabel {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .opt-cost {
        display: flex;
        align-items: baseline;
        gap: 2px;
    }

    .cost-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
    }

    .cost-xp {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .opt-matches {
        display: flex;
    }

    .match-dots {
        display: flex;
        gap: 2px;
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--dh2e-bg-light, #3a3a42);
        border: 1px solid var(--dh2e-border, #4a4a55);

        &.filled {
            background: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .no-results {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .purchase-log {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        max-height: 100px;
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
