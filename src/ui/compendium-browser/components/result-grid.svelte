<script lang="ts">
    import type { IndexEntry } from "../index-builder.ts";

    let {
        entries = [],
        page = 0,
        pageSize = 40,
        onPageChange,
    }: {
        entries: IndexEntry[];
        page: number;
        pageSize: number;
        onPageChange: (page: number) => void;
    } = $props();

    const totalPages = $derived(Math.max(1, Math.ceil(entries.length / pageSize)));
    const pagedEntries = $derived(entries.slice(page * pageSize, (page + 1) * pageSize));

    function onDragStart(event: DragEvent, entry: IndexEntry) {
        event.dataTransfer?.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: entry.uuid,
        }));
    }

    async function openEntry(entry: IndexEntry) {
        const doc = await fromUuid(entry.uuid);
        if (doc) (doc as any).sheet?.render(true);
    }
</script>

<div class="result-grid-wrapper">
    <div class="result-grid">
        {#each pagedEntries as entry (entry.uuid)}
            <div
                class="result-card"
                draggable="true"
                ondragstart={(e) => onDragStart(e, entry)}
                title="Drag to sheet or click to open"
            >
                <img class="result-img" src={entry.img} alt="" />
                <div class="result-info">
                    <button class="result-name" onclick={() => openEntry(entry)}>
                        {entry.name}
                    </button>
                    <span class="result-type">{entry.type}</span>
                    {#if entry.availability}
                        <span class="result-avail">{entry.availability}</span>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="no-results">No items match your filters.</div>
        {/each}
    </div>

    {#if totalPages > 1}
        <div class="pagination">
            <button
                class="page-btn"
                disabled={page <= 0}
                onclick={() => onPageChange(page - 1)}
            >
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="page-info">{page + 1} / {totalPages}</span>
            <button
                class="page-btn"
                disabled={page >= totalPages - 1}
                onclick={() => onPageChange(page + 1)}
            >
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .result-grid-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }
    .result-grid {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        overflow-y: auto;
        align-content: start;
    }
    .result-card {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: grab;
        transition: border-color 0.15s;
        &:hover { border-color: var(--dh2e-gold, #c8a84e); }
    }
    .result-img {
        width: 28px;
        height: 28px;
        object-fit: cover;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .result-info {
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow: hidden;
    }
    .result-name {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }
    .result-type {
        font-size: 0.55rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .result-avail {
        font-size: 0.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        padding: var(--dh2e-space-lg, 1rem);
    }
    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }
    .page-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        padding: 2px 8px;
        &:hover:not(:disabled) { border-color: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.3; cursor: default; }
    }
    .page-info {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
</style>
