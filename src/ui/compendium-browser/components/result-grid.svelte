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
        const dragType = entry.documentName === "Macro" ? "Macro" : "Item";
        event.dataTransfer?.setData("text/plain", JSON.stringify({
            type: dragType,
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

    /** Get type-specific detail text for an entry */
    function getDetail(entry: IndexEntry): string {
        if (entry.documentName === "Macro") return entry.gmOnly ? "GM Only" : "Player";
        if (entry.weaponClass) return entry.weaponClass;
        if (entry.discipline) return entry.discipline;
        if (entry.characteristic) return entry.characteristic;
        if (entry.damageType) return entry.damageType;
        return "";
    }

    /** CSS class for availability badge */
    function availClass(avail: string | undefined): string {
        if (!avail) return "";
        const key = avail.toLowerCase().replace(/\s+/g, "-");
        return `avail-${key}`;
    }
</script>

<!-- Backdrop to dismiss context menu -->
{#if contextMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="context-backdrop" onclick={dismissContextMenu} onkeydown={dismissContextMenu}></div>
{/if}

<div class="result-list-wrapper">
    <!-- Column header -->
    <div class="list-header">
        <span class="col-name">Name</span>
        <span class="col-type">Type</span>
        <span class="col-detail">Detail</span>
        <span class="col-avail">Availability</span>
    </div>

    <div class="result-list">
        {#each pagedEntries as entry (entry.uuid)}
            <div
                class="result-row"
                draggable="true"
                ondragstart={(e) => onDragStart(e, entry)}
                oncontextmenu={(e) => onContextMenu(e, entry)}
                title="Drag to sheet or click to open"
            >
                <div class="col-name">
                    <img class="result-img" src={entry.img} alt="" />
                    <button class="result-name" onclick={() => openEntry(entry)}>
                        {entry.name}
                    </button>
                    {#if isGM && entry.isHomebrew}
                        <span
                            class="homebrew-badge"
                            class:private={entry.homebrewVisibility === "private"}
                        >
                            {#if entry.homebrewVisibility === "private"}
                                <i class="fa-solid fa-eye-slash"></i>
                            {:else}
                                <i class="fa-solid fa-flask"></i>
                            {/if}
                        </span>
                    {/if}
                </div>
                <span class="col-type">{entry.type}</span>
                <span class="col-detail">{getDetail(entry)}</span>
                <span class="col-avail {availClass(entry.availability)}">
                    {entry.availability ?? ""}
                </span>
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
    .result-list-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }

    .list-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: var(--dh2e-bg-darkest, #111114);
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--dh2e-gold-muted, #8a7a3e);
        flex-shrink: 0;
    }

    .result-list {
        flex: 1;
        overflow-y: auto;
        padding: 0;
    }

    .result-row {
        display: flex;
        align-items: center;
        padding: 3px 8px;
        border-bottom: 1px solid rgba(74, 74, 85, 0.3);
        cursor: grab;
        transition: background 0.1s;

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
        &:nth-child(even) {
            background: rgba(17, 17, 20, 0.25);
            &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        }
    }

    /* Column layout */
    .col-name {
        flex: 3;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }
    .col-type {
        flex: 1;
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--dh2e-gold-muted, #8a7a3e);
        text-align: center;
    }
    .col-detail {
        flex: 1.2;
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: capitalize;
        text-align: center;
    }
    .col-avail {
        flex: 1;
        font-size: 0.6rem;
        font-weight: 600;
        text-align: right;
        padding-right: 4px;
    }

    /* Availability colour coding */
    .avail-ubiquitous { color: #8ab88a; }
    .avail-abundant   { color: #8ab88a; }
    .avail-plentiful  { color: #99c499; }
    .avail-common     { color: #a0a0a8; }
    .avail-average    { color: #b0b0b8; }
    .avail-scarce     { color: #c8a84e; }
    .avail-rare       { color: #c87028; }
    .avail-very-rare  { color: #c84848; }
    .avail-extremely-rare { color: #a838a8; }
    .avail-near-unique { color: #8838c8; }
    .avail-unique     { color: #8838c8; }

    .result-img {
        width: 22px;
        height: 22px;
        object-fit: cover;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .result-name {
        font-size: 0.7rem;
        font-weight: 600;
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

    .homebrew-badge {
        flex-shrink: 0;
        font-size: 0.55rem;
        color: var(--dh2e-gold, #c8a84e);
        i { font-size: 0.5rem; }
        &.private { color: #c44; }
    }

    .no-results {
        text-align: center;
        font-size: 0.7rem;
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
        flex-shrink: 0;
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
