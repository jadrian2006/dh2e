<script lang="ts">
    import type { CompendiumIndex, IndexEntry } from "../compendium-browser/index-builder.ts";

    let {
        index,
        isGM = false,
        onClose,
    }: {
        index: CompendiumIndex;
        isGM?: boolean;
        onClose: () => void;
    } = $props();

    let searchText = $state("");
    let selectedIndex = $state(0);
    let inputEl: HTMLInputElement | undefined = $state();

    const MAX_RESULTS = 12;

    const results = $derived(() => {
        const term = searchText.trim().toLowerCase();
        if (!term) return [];

        // Score: starts-with gets priority
        const scored: { entry: IndexEntry; score: number }[] = [];
        for (const entry of index.entries) {
            const lower = entry.name.toLowerCase();
            if (lower.startsWith(term)) {
                scored.push({ entry, score: 0 });
            } else if (lower.includes(term)) {
                scored.push({ entry, score: 1 });
            }
        }

        scored.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.entry.name.localeCompare(b.entry.name);
        });

        return scored.slice(0, MAX_RESULTS).map(s => s.entry);
    });

    // Reset selection when results change
    $effect(() => {
        results();
        selectedIndex = 0;
    });

    // Auto-focus on mount
    $effect(() => {
        if (inputEl) inputEl.focus();
    });

    function onKeydown(event: KeyboardEvent) {
        const list = results();
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, list.length - 1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (list[selectedIndex]) {
                openEntry(list[selectedIndex]);
            }
        }
    }

    async function openEntry(entry: IndexEntry) {
        onClose();
        const doc = await fromUuid(entry.uuid);
        if (doc) (doc as any).sheet?.render(true);
    }

    function onDragStart(event: DragEvent, entry: IndexEntry) {
        event.dataTransfer?.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: entry.uuid,
        }));
    }

    function onBackdropClick(event: MouseEvent) {
        if ((event.target as HTMLElement).classList.contains("qs-backdrop")) {
            onClose();
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="qs-backdrop" onclick={onBackdropClick} onkeydown={onKeydown}>
    <div class="qs-panel">
        <div class="qs-input-row">
            <i class="fa-solid fa-magnifying-glass qs-icon"></i>
            <input
                bind:this={inputEl}
                type="text"
                class="qs-input"
                placeholder="Search items, talents, weapons..."
                bind:value={searchText}
                onkeydown={onKeydown}
            />
        </div>

        {#if results().length > 0}
            <div class="qs-results">
                {#each results() as entry, i (entry.uuid)}
                    <div
                        class="qs-result"
                        class:selected={i === selectedIndex}
                        draggable="true"
                        ondragstart={(e) => onDragStart(e, entry)}
                        onclick={() => openEntry(entry)}
                        onmouseenter={() => { selectedIndex = i; }}
                        role="option"
                        aria-selected={i === selectedIndex}
                    >
                        <img class="qs-result-img" src={entry.img} alt="" />
                        <div class="qs-result-info">
                            <span class="qs-result-name">{entry.name}</span>
                            <span class="qs-result-type">{entry.type}</span>
                        </div>
                        {#if isGM && entry.isHomebrew}
                            <span
                                class="qs-homebrew-badge"
                                class:private={entry.homebrewVisibility === "private"}
                            >
                                {#if entry.homebrewVisibility === "private"}
                                    <i class="fa-solid fa-eye-slash"></i>
                                {:else}
                                    <i class="fa-solid fa-flask"></i>
                                {/if}
                            </span>
                        {/if}
                        {#if entry.availability}
                            <span class="qs-result-avail">{entry.availability}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else if searchText.trim()}
            <div class="qs-no-results">No matches found.</div>
        {/if}
    </div>
</div>

<style lang="scss">
    .qs-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        justify-content: center;
        padding-top: 15vh;
    }
    .qs-panel {
        width: 520px;
        max-height: 70vh;
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        align-self: flex-start;
    }
    .qs-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }
    .qs-icon {
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.85rem;
    }
    .qs-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: 0.9rem;
        outline: none;
        &::placeholder { color: var(--dh2e-text-secondary, #a0a0a8); }
    }
    .qs-results {
        overflow-y: auto;
        padding: 4px 0;
    }
    .qs-result {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 0.1s, border-color 0.1s;
        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
        &.selected {
            background: var(--dh2e-bg-mid, #2e2e35);
            border-left-color: var(--dh2e-gold, #c8a84e);
        }
    }
    .qs-result-img {
        width: 24px;
        height: 24px;
        object-fit: cover;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .qs-result-info {
        display: flex;
        flex-direction: column;
        gap: 1px;
        flex: 1;
        overflow: hidden;
    }
    .qs-result-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .qs-result-type {
        font-size: 0.55rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .qs-result-avail {
        font-size: 0.55rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
        flex-shrink: 0;
    }
    .qs-homebrew-badge {
        font-size: 0.55rem;
        color: var(--dh2e-gold, #c8a84e);
        flex-shrink: 0;
        &.private { color: #c44; }
    }
    .qs-no-results {
        padding: 16px 14px;
        text-align: center;
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }
</style>
