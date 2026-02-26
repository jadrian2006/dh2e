<script lang="ts">
    import type { CompendiumIndex } from "../index-builder.ts";

    let {
        facets,
        filters,
        onFilterChange,
        isGM = false,
    }: {
        facets: CompendiumIndex["facets"];
        filters: Record<string, string>;
        onFilterChange: (key: string, value: string) => void;
        isGM?: boolean;
    } = $props();

    const filterGroups = $derived(() => {
        const groups = [];

        // Source filter — GM only, rendered first
        if (isGM && facets.source.length > 1) {
            groups.push({ key: "source", label: "Source", options: facets.source });
        }

        groups.push(
            { key: "type", label: "Type", options: facets.types },
            { key: "availability", label: "Availability", options: facets.availability },
            { key: "weaponClass", label: "Weapon Class", options: facets.weaponClass },
            { key: "damageType", label: "Damage Type", options: facets.damageType },
            { key: "characteristic", label: "Characteristic", options: facets.characteristic },
            { key: "discipline", label: "Discipline", options: facets.discipline },
        );

        return groups;
    });

    function handleChange(key: string, event: Event) {
        const val = (event.target as HTMLSelectElement).value;
        onFilterChange(key, val);
    }
</script>

<div class="filter-sidebar">
    {#each filterGroups() as group}
        {#if group.options.length > 0}
            <div class="filter-group">
                <label class="filter-label">{group.label}</label>
                <select
                    class="filter-select"
                    value={filters[group.key] ?? ""}
                    onchange={(e) => handleChange(group.key, e)}
                >
                    <option value="">All</option>
                    {#each group.options as opt}
                        <option value={opt}>{opt}</option>
                    {/each}
                </select>
            </div>
        {/if}
    {/each}
</div>

<style lang="scss">
    .filter-sidebar {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border-right: 1px solid var(--dh2e-border, #4a4a55);
        min-width: 160px;
        max-width: 180px;
        overflow-y: auto;
    }
    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .filter-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .filter-select {
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        padding: 3px 4px;
        &:focus { border-color: var(--dh2e-gold, #c8a84e); outline: none; }
    }
</style>
