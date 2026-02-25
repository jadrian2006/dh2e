<script lang="ts">
    let {
        characteristics,
    }: {
        characteristics: Record<string, { value: number; bonus: number }>;
    } = $props();

    const charOrder = [
        { key: "ws", abbrev: "WS" },
        { key: "bs", abbrev: "BS" },
        { key: "s", abbrev: "S" },
        { key: "t", abbrev: "T" },
        { key: "ag", abbrev: "Ag" },
        { key: "int", abbrev: "Int" },
        { key: "per", abbrev: "Per" },
        { key: "wp", abbrev: "WP" },
        { key: "fel", abbrev: "Fel" },
    ];
</script>

<div class="char-grid">
    {#each charOrder as c}
        {@const charData = characteristics?.[c.key]}
        <div class="char-cell" title="{c.abbrev}: {charData?.value ?? 0}">
            <span class="char-abbrev">{c.abbrev}</span>
            <span class="char-value">{charData?.value ?? 0}</span>
        </div>
    {/each}
</div>

<style lang="scss">
    .char-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
    }

    .char-cell {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 1px 4px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        font-size: 0.6rem;
        line-height: 1;
    }

    .char-abbrev {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 600;
        text-transform: uppercase;
    }

    .char-value {
        color: var(--dh2e-gold-bright, #c8a84e);
        font-weight: 700;
    }
</style>
