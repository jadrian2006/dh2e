<script lang="ts">
    import FilterSidebar from "./components/filter-sidebar.svelte";
    import ResultGrid from "./components/result-grid.svelte";
    import type { CompendiumIndex, IndexEntry } from "./index-builder.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const index: CompendiumIndex | null = ctx.index;
    const loading: boolean = ctx.loading;
    const isGM: boolean = ctx.isGM ?? false;

    let searchText = $state("");
    let filters = $state<Record<string, string>>({});
    let page = $state(0);
    const pageSize = 80;

    function onFilterChange(key: string, value: string) {
        filters = { ...filters, [key]: value };
        page = 0;
    }

    function onSearchInput(event: Event) {
        searchText = (event.target as HTMLInputElement).value;
        page = 0;
    }

    const filtered = $derived(() => {
        if (!index) return [];
        let results = index.entries;

        // Text search
        if (searchText.trim()) {
            const term = searchText.trim().toLowerCase();
            results = results.filter((e: IndexEntry) => e.name.toLowerCase().includes(term));
        }

        // Facet filters
        for (const [key, value] of Object.entries(filters)) {
            if (!value) continue;
            results = results.filter((e: IndexEntry) => {
                if (key === "type") return e.type === value;
                if (key === "availability") return e.availability === value;
                if (key === "weaponClass") return e.weaponClass === value;
                if (key === "damageType") return e.damageType === value;
                if (key === "characteristic") return e.characteristic === value;
                if (key === "discipline") return e.discipline === value;
                if (key === "source") {
                    if (value === "Homebrew") return e.isHomebrew;
                    if (value === "Official") return !e.isHomebrew;
                    return true;
                }
                return true;
            });
        }

        return results.sort((a: IndexEntry, b: IndexEntry) => a.name.localeCompare(b.name));
    });
</script>

<div class="browser-container">
    {#if loading}
        <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Building index...</span>
        </div>
    {:else if index}
        <div class="browser-header">
            <input
                type="text"
                class="search-input"
                placeholder="Search..."
                value={searchText}
                oninput={onSearchInput}
            />
            <span class="result-count">{filtered().length} items</span>
            <button class="rebuild-btn" onclick={ctx.rebuildIndex} title="Rebuild Index">
                <i class="fa-solid fa-arrows-rotate"></i>
            </button>
        </div>
        <div class="browser-body">
            <FilterSidebar
                facets={index.facets}
                {filters}
                {onFilterChange}
                {isGM}
            />
            <ResultGrid
                entries={filtered()}
                {page}
                {pageSize}
                onPageChange={(p) => { page = p; }}
                {isGM}
            />
        </div>
    {:else}
        <div class="loading-state">
            <span>No compendium data found.</span>
        </div>
    {/if}
</div>

<style lang="scss">
    .browser-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark, #1a1a20);
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        height: 100%;
        font-size: 0.85rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        i { font-size: 1.2rem; }
    }
    .browser-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }
    .search-input {
        flex: 1;
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-size: 0.8rem;
        &:focus { border-color: var(--dh2e-gold, #c8a84e); outline: none; }
        &::placeholder { color: var(--dh2e-text-secondary, #a0a0a8); }
    }
    .result-count {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold-muted, #8a7a3e);
        white-space: nowrap;
    }
    .rebuild-btn {
        background: none;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 4px 6px;
        &:hover { border-color: var(--dh2e-gold, #c8a84e); color: var(--dh2e-gold, #c8a84e); }
    }
    .browser-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
</style>
