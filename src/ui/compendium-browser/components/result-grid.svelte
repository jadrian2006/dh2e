<script lang="ts">
    import type { IndexEntry } from "../index-builder.ts";

    let {
        entries = [],
        page = 0,
        pageSize = 40,
        onPageChange,
        isGM = false,
    }: {
        entries: IndexEntry[];
        page: number;
        pageSize: number;
        onPageChange: (page: number) => void;
        isGM?: boolean;
    } = $props();

    const totalPages = $derived(Math.max(1, Math.ceil(entries.length / pageSize)));
    const pagedEntries = $derived(entries.slice(page * pageSize, (page + 1) * pageSize));

    // Context menu state
    let contextMenu = $state<{ x: number; y: number; entry: IndexEntry } | null>(null);

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

    function onContextMenu(event: MouseEvent, entry: IndexEntry) {
        if (!isGM) return;
        event.preventDefault();
        contextMenu = { x: event.clientX, y: event.clientY, entry };
    }

    function dismissContextMenu() {
        contextMenu = null;
    }

    async function handleCopyToHomebrew() {
        if (!contextMenu) return;
        const uuid = contextMenu.entry.uuid;
        dismissContextMenu();
        const { copyToHomebrew } = await import("../../../homebrew/homebrew-pack.ts");
        await copyToHomebrew(uuid);
    }

    async function handleToggleVisibility() {
        if (!contextMenu) return;
        const uuid = contextMenu.entry.uuid;
        dismissContextMenu();
        // Extract item ID from uuid: Compendium.world.dh2e-homebrew.<id>
        const parts = uuid.split(".");
        const itemId = parts[parts.length - 1];
        const { toggleHomebrewVisibility } = await import("../../../homebrew/homebrew-pack.ts");
        await toggleHomebrewVisibility(itemId);
    }

    async function handleEditItem() {
        if (!contextMenu) return;
        const entry = contextMenu.entry;
        dismissContextMenu();
        await openEntry(entry);
    }
</script>

<!-- Backdrop to dismiss context menu -->
{#if contextMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="context-backdrop" onclick={dismissContextMenu} onkeydown={dismissContextMenu}></div>
{/if}

<div class="result-grid-wrapper">
    <div class="result-grid">
        {#each pagedEntries as entry (entry.uuid)}
            <div
                class="result-card"
                draggable="true"
                ondragstart={(e) => onDragStart(e, entry)}
                oncontextmenu={(e) => onContextMenu(e, entry)}
                title="Drag to sheet or click to open"
            >
                <img class="result-img" src={entry.img} alt="" />
                <div class="result-info">
                    <button class="result-name" onclick={() => openEntry(entry)}>
                        {entry.name}
                    </button>
                    <div class="result-meta">
                        <span class="result-type">{entry.type}</span>
                        {#if entry.availability}
                            <span class="result-avail">{entry.availability}</span>
                        {/if}
                    </div>
                    {#if isGM && entry.isHomebrew}
                        <span
                            class="homebrew-badge"
                            class:private={entry.homebrewVisibility === "private"}
                        >
                            {#if entry.homebrewVisibility === "private"}
                                <i class="fa-solid fa-eye-slash"></i> Private
                            {:else}
                                <i class="fa-solid fa-flask"></i> Homebrew
                            {/if}
                        </span>
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

<!-- Context menu -->
{#if contextMenu}
    <div
        class="context-menu"
        style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    >
        {#if !contextMenu.entry.isHomebrew}
            <button class="context-item" onclick={handleCopyToHomebrew}>
                <i class="fa-solid fa-copy"></i> Copy to Homebrew
            </button>
        {:else}
            <button class="context-item" onclick={handleToggleVisibility}>
                {#if contextMenu.entry.homebrewVisibility === "private"}
                    <i class="fa-solid fa-eye"></i> Make Public
                {:else}
                    <i class="fa-solid fa-eye-slash"></i> Make Private
                {/if}
            </button>
            <button class="context-item" onclick={handleEditItem}>
                <i class="fa-solid fa-pen-to-square"></i> Edit Item
            </button>
        {/if}
    </div>
{/if}

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
    .result-meta {
        display: flex;
        align-items: center;
        gap: 4px;
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
    .homebrew-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.5rem;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        i { font-size: 0.45rem; }
        &.private {
            color: #c44;
        }
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

    /* Context menu */
    .context-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9998;
    }
    .context-menu {
        position: fixed;
        z-index: 9999;
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: 4px 0;
        min-width: 160px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .context-item {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 5px 10px;
        background: none;
        border: none;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        text-align: left;
        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-gold, #c8a84e);
        }
        i {
            width: 14px;
            text-align: center;
            font-size: 0.65rem;
        }
    }
</style>
