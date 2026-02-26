<script lang="ts">
    import type { AdvanceOption, AdvanceCategory } from "./types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let filterCategory: AdvanceCategory | "all" = $state("all");
    let affordableOnly = $state(false);
    let searchText = $state("");

    type SortColumn = "name" | "aptMatch";
    let sortCol: SortColumn | null = $state(null);
    let sortDir: "asc" | "desc" = $state("desc");

    const hasEliteOptions = $derived(() => {
        const opts: AdvanceOption[] = ctx.options ?? [];
        return opts.some((o) => o.category === "elite");
    });

    const hasPowerOptions = $derived(() => {
        const opts: AdvanceOption[] = ctx.options ?? [];
        return opts.some((o) => o.category === "power");
    });

    const filtered = $derived(() => {
        const opts: AdvanceOption[] = ctx.options ?? [];
        const term = searchText.toLowerCase().trim();
        const result = opts.filter((opt) => {
            if (filterCategory !== "all" && opt.category !== filterCategory) return false;
            if (affordableOnly && !opt.affordable) return false;
            if (term && !opt.label.toLowerCase().includes(term) && !opt.sublabel.toLowerCase().includes(term)) return false;
            return true;
        });
        if (sortCol) {
            const dir = sortDir === "desc" ? -1 : 1;
            result.sort((a, b) => {
                if (sortCol === "aptMatch") {
                    const diff = a.matchCount - b.matchCount;
                    if (diff !== 0) return diff * dir;
                    return a.label.localeCompare(b.label);
                }
                // "name" — alphabetical, secondary by matchCount desc
                const nameCmp = a.label.localeCompare(b.label) * dir;
                if (nameCmp !== 0) return nameCmp;
                return b.matchCount - a.matchCount;
            });
        }
        return result;
    });

    function toggleSort(col: SortColumn) {
        if (sortCol === col) {
            if (sortDir === "desc") sortDir = "asc";
            else { sortCol = null; sortDir = "desc"; }
        } else {
            sortCol = col;
            sortDir = "desc";
        }
    }

    function categoryIcon(cat: AdvanceCategory): string {
        if (cat === "characteristic") return "fa-solid fa-chart-bar";
        if (cat === "skill") return "fa-solid fa-graduation-cap";
        if (cat === "power") return "fa-solid fa-hat-wizard";
        if (cat === "elite") return "fa-solid fa-crown";
        return "fa-solid fa-star";
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

    function buy(opt: AdvanceOption) {
        ctx.purchase?.(opt);
    }
</script>

<div class="shop-container">
    <!-- Top bar: XP display -->
    <header class="shop-header">
        <div class="xp-display">
            <span class="xp-chip">Total <strong>{ctx.xpTotal ?? 0}</strong></span>
            <span class="xp-chip">Spent <strong>{ctx.xpSpent ?? 0}</strong></span>
            <span class="xp-chip available">Available <strong>{ctx.xpAvailable ?? 0}</strong></span>
        </div>
        <div class="aptitude-badges">
            <span class="apt-label">Aptitudes:</span>
            {#each (ctx.aptitudes ?? []) as apt}
                <span class="apt-badge">{apt}</span>
            {/each}
            {#if (ctx.aptitudes ?? []).length === 0}
                <span class="apt-none">None — assign via Character Creation</span>
            {/if}
        </div>
    </header>

    <!-- Filter row -->
    <div class="filter-row">
        <div class="filter-tabs">
            <button class="tab" class:active={filterCategory === "all"} onclick={() => filterCategory = "all"}>All</button>
            <button class="tab" class:active={filterCategory === "characteristic"} onclick={() => filterCategory = "characteristic"}>Characteristics</button>
            <button class="tab" class:active={filterCategory === "skill"} onclick={() => filterCategory = "skill"}>Skills</button>
            <button class="tab" class:active={filterCategory === "talent"} onclick={() => filterCategory = "talent"}>Talents</button>
            {#if hasPowerOptions()}
                <button class="tab power-tab" class:active={filterCategory === "power"} onclick={() => filterCategory = "power"}>Powers</button>
            {/if}
            {#if hasEliteOptions()}
                <button class="tab elite-tab" class:active={filterCategory === "elite"} onclick={() => filterCategory = "elite"}>Elite</button>
            {/if}
        </div>
        <div class="filter-controls">
            <label class="affordable-toggle">
                <input type="checkbox" bind:checked={affordableOnly} />
                Affordable
            </label>
            <input
                type="text"
                class="search-input"
                placeholder="Search..."
                bind:value={searchText}
            />
        </div>
    </div>

    <!-- Scrollable list -->
    <div class="advance-list">
        <div class="advance-header">
            <span class="hdr-icon"></span>
            <button class="hdr-name sortable" onclick={() => toggleSort("name")}>
                Advance
                {#if sortCol === "name"}
                    <i class="fa-solid fa-xs" class:fa-caret-down={sortDir === "desc"} class:fa-caret-up={sortDir === "asc"}></i>
                {/if}
            </button>
            <span class="hdr-info"></span>
            <button class="hdr-pips" onclick={() => toggleSort("aptMatch")}>
                Apt Match
                {#if sortCol === "aptMatch"}
                    <i class="fa-solid fa-xs" class:fa-caret-down={sortDir === "desc"} class:fa-caret-up={sortDir === "asc"}></i>
                {/if}
            </button>
            <span class="hdr-cost">Cost</span>
            <span class="hdr-action"></span>
        </div>
        {#each filtered() as opt (opt.key + opt.category + opt.sublabel)}
            <div class="advance-row" class:maxed={opt.alreadyMaxed} class:unaffordable={!opt.affordable && !opt.alreadyMaxed}>
                <span class="row-icon"><i class={categoryIcon(opt.category)}></i></span>
                <div class="row-info">
                    <span class="row-label">
                        {opt.label}
                        {#if opt.needsApproval}
                            <i class="fa-solid fa-shield-halved fa-xs approval-icon" title={game.i18n.localize("DH2E.EliteApproval.RequiresApproval")}></i>
                        {/if}
                    </span>
                    <span class="row-sublabel">{opt.sublabel}</span>
                    {#if opt.aptitudes?.length}
                        <span class="row-apts">{opt.aptitudes.join(", ")}</span>
                    {/if}
                    {#if opt.prerequisites}
                        <span class="row-prereqs" class:prereqs-unmet={!opt.prereqsMet}>
                            {#if !opt.prereqsMet}
                                <i class="fa-solid fa-lock fa-xs"></i>
                            {/if}
                            {opt.prerequisites}
                        </span>
                    {/if}
                </div>
                {#if opt.category === "skill" || opt.category === "talent" || opt.category === "power"}
                    <button class="info-btn" title="View details" onclick={() => ctx.openItem?.(opt)}>
                        <i class="fa-solid fa-circle-info"></i>
                    </button>
                {:else}
                    <span class="info-btn-spacer"></span>
                {/if}
                <span class="row-pips" title={matchTooltip(opt)}>{matchPips(opt.matchCount)}</span>
                <span class="row-cost" class:affordable={opt.affordable} class:too-expensive={!opt.affordable && !opt.alreadyMaxed}>
                    {#if opt.alreadyMaxed}
                        <span class="max-badge">MAX</span>
                    {:else}
                        {opt.cost} XP
                    {/if}
                </span>
                <div class="row-action">
                    {#if !opt.alreadyMaxed}
                        {#if opt.pendingApproval}
                            <button class="buy-btn pending" disabled>
                                <i class="fa-solid fa-spinner fa-spin fa-xs"></i> {game.i18n.localize("DH2E.EliteApproval.Pending")}
                            </button>
                        {:else if opt.needsApproval}
                            <button class="buy-btn request" disabled={!opt.affordable || !opt.prereqsMet} title={!opt.prereqsMet ? `Unmet: ${opt.prereqsUnmet.join(", ")}` : game.i18n.localize("DH2E.EliteApproval.RequiresApproval")} onclick={() => buy(opt)}>
                                <i class="fa-solid fa-shield-halved fa-xs"></i> {game.i18n.localize("DH2E.EliteApproval.Request")}
                            </button>
                        {:else}
                            <button class="buy-btn" disabled={!opt.affordable || !opt.prereqsMet} title={!opt.prereqsMet ? `Unmet: ${opt.prereqsUnmet.join(", ")}` : ""} onclick={() => buy(opt)}>Buy</button>
                        {/if}
                    {/if}
                </div>
            </div>
        {/each}
        {#if filtered().length === 0}
            <div class="empty-state">No advances match your filters.</div>
        {/if}
    </div>
</div>

<style lang="scss">
    .shop-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-sm);
    }

    /* Header */
    .shop-header {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs);
    }
    .xp-display {
        display: flex;
        gap: var(--dh2e-space-sm);
        justify-content: center;
    }
    .xp-chip {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-secondary);

        strong {
            color: var(--dh2e-text-primary);
            font-weight: 700;
        }

        &.available {
            border-color: var(--dh2e-gold-muted);
            strong { color: var(--dh2e-gold-bright); }
        }
    }
    .aptitude-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
    }
    .apt-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 600;
    }
    .apt-badge {
        font-size: 0.6rem;
        background: var(--dh2e-bg-mid);
        border: 1px solid var(--dh2e-border);
        border-radius: 3px;
        padding: 1px 6px;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .apt-none {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        opacity: 0.6;
    }

    /* Filters */
    .filter-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--dh2e-space-sm);
        flex-wrap: wrap;
    }
    .filter-tabs {
        display: flex;
        gap: 2px;
    }
    .tab {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.03em;

        &:hover { border-color: var(--dh2e-gold-muted); color: var(--dh2e-text-primary); }
        &.active {
            background: var(--dh2e-gold-dark);
            border-color: var(--dh2e-gold);
            color: var(--dh2e-bg-darkest);
            font-weight: 700;
        }
    }
    .filter-controls {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
    }
    .affordable-toggle {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .search-input {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-primary);
        width: 140px;

        &::placeholder { color: var(--dh2e-text-secondary); opacity: 0.6; }
        &:focus { border-color: var(--dh2e-gold-muted); outline: none; }
    }

    /* Advance list */
    .advance-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .advance-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-sm);
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--dh2e-gold-muted);
    }
    .hdr-icon { width: 20px; }
    .hdr-name {
        flex: 1;
        text-align: left;

        &.sortable {
            background: none;
            border: none;
            color: var(--dh2e-text-secondary);
            font-size: var(--dh2e-text-xs);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 2px;

            &:hover { color: var(--dh2e-gold); }

            i { font-size: 0.55rem; }
        }
    }
    .hdr-info { width: 24px; }
    .hdr-pips {
        width: 55px;
        text-align: center;
        cursor: pointer;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary);
        font-size: var(--dh2e-text-xs);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;

        &:hover { color: var(--dh2e-gold); }

        i { font-size: 0.55rem; }
    }
    .hdr-cost { min-width: 60px; text-align: right; }
    .hdr-action { width: 70px; }
    .advance-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);

        &.maxed {
            opacity: 0.5;
        }
        &.unaffordable {
            opacity: 0.75;
        }
    }
    .row-icon {
        width: 20px;
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-size: var(--dh2e-text-sm);
    }
    .row-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    .row-label {
        font-size: var(--dh2e-text-sm);
        font-weight: 600;
        color: var(--dh2e-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .row-sublabel {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
    }
    .row-apts {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted);
    }
    .row-prereqs {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        opacity: 0.8;

        &.prereqs-unmet {
            color: var(--dh2e-red-bright, #e04040);
            opacity: 1;
            font-weight: 600;

            i { margin-right: 3px; }
        }
    }
    .info-btn {
        width: 24px;
        height: 24px;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        font-size: var(--dh2e-text-sm);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;

        &:hover { color: var(--dh2e-gold-bright); }
    }
    .info-btn-spacer {
        width: 24px;
        flex-shrink: 0;
    }
    .row-pips {
        width: 55px;
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-gold);
        letter-spacing: 2px;
        cursor: help;
        flex-shrink: 0;
        text-align: center;
    }
    .row-cost {
        font-size: var(--dh2e-text-sm);
        font-weight: 700;
        min-width: 60px;
        text-align: right;
        flex-shrink: 0;

        &.affordable { color: var(--dh2e-success); }
        &.too-expensive { color: var(--dh2e-red-bright); }
    }
    .max-badge {
        background: var(--dh2e-bg-mid);
        border: 1px solid var(--dh2e-border);
        border-radius: 3px;
        padding: 1px 6px;
        font-size: 0.6rem;
        text-transform: uppercase;
        color: var(--dh2e-text-secondary);
        font-weight: 700;
    }
    .row-action {
        width: 70px;
        flex-shrink: 0;
    }
    .buy-btn {
        width: 100%;
        padding: var(--dh2e-space-xxs) var(--dh2e-space-xs);
        background: var(--dh2e-gold-dark);
        color: var(--dh2e-bg-darkest);
        border: 1px solid var(--dh2e-gold);
        border-radius: var(--dh2e-radius-sm);
        font-size: var(--dh2e-text-xs);
        font-weight: 700;
        text-transform: uppercase;
        cursor: pointer;

        &:hover:not(:disabled) { background: var(--dh2e-gold); }
        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: var(--dh2e-bg-mid);
            color: var(--dh2e-text-secondary);
            border-color: var(--dh2e-border);
        }

        &.request {
            background: rgba(168, 78, 200, 0.25);
            border-color: rgba(168, 78, 200, 0.5);
            color: #e8d0f8;
            font-size: 0.55rem;

            i { margin-right: 2px; }
            &:hover:not(:disabled) {
                background: rgba(168, 78, 200, 0.4);
            }
        }

        &.pending {
            background: var(--dh2e-bg-mid);
            border-color: var(--dh2e-border);
            color: var(--dh2e-text-secondary);
            font-size: 0.55rem;
            opacity: 0.7;

            i { margin-right: 2px; }
        }
    }
    .approval-icon {
        color: rgba(168, 78, 200, 0.6);
        margin-left: 4px;
        cursor: help;
    }

    .power-tab {
        &.active {
            background: rgba(80, 120, 200, 0.3);
            border-color: rgba(80, 120, 200, 0.6);
            color: #c0d8ff;
        }
    }
    .elite-tab {
        &.active {
            background: rgba(168, 78, 200, 0.3);
            border-color: rgba(168, 78, 200, 0.6);
            color: #e8d0f8;
        }
    }

    .empty-state {
        padding: var(--dh2e-space-lg);
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
    }
</style>
