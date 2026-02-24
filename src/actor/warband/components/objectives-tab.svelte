<script lang="ts">
    import ObjectiveRow from "./objective-row.svelte";

    let { objectives, canManage, onAdd, onOpenObjective, onComplete, onFail, onReactivate, onDelete }: {
        objectives: any[];
        canManage: boolean;
        onAdd: () => void;
        onOpenObjective: (obj: any) => void;
        onComplete: (obj: any) => void;
        onFail: (obj: any) => void;
        onReactivate: (obj: any) => void;
        onDelete: (obj: any) => void;
    } = $props();

    let filter = $state("all");

    const filtered = $derived(
        filter === "all"
            ? objectives
            : filter === "active"
                ? objectives.filter((o: any) => o.system?.status === "active")
                : objectives.filter((o: any) => o.system?.status === "completed" || o.system?.status === "failed")
    );
</script>

<div class="objectives-tab">
    <div class="objectives-toolbar">
        <div class="filter-buttons" role="group" aria-label="Filter objectives">
            <button class="filter-btn" class:active={filter === "all"} onclick={() => filter = "all"}>All</button>
            <button class="filter-btn" class:active={filter === "active"} onclick={() => filter = "active"}>Active</button>
            <button class="filter-btn" class:active={filter === "resolved"} onclick={() => filter = "resolved"}>Resolved</button>
        </div>

        {#if canManage}
            <button class="add-objective-btn" onclick={onAdd}>
                <i class="fa-solid fa-plus"></i> Add Objective
            </button>
        {/if}
    </div>

    <div class="objectives-list">
        {#if filtered.length === 0}
            <p class="empty-state">No objectives assigned.</p>
        {:else}
            {#each filtered as obj (obj.id)}
                <ObjectiveRow
                    objective={obj}
                    {canManage}
                    onOpen={() => onOpenObjective(obj)}
                    onComplete={() => onComplete(obj)}
                    onFail={() => onFail(obj)}
                    onReactivate={() => onReactivate(obj)}
                    onDelete={() => onDelete(obj)}
                />
            {/each}
        {/if}
    </div>
</div>

<style lang="scss">
    .objectives-tab {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .objectives-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        border-bottom: 1px solid var(--dh2e-border);
        gap: var(--dh2e-space-sm);
    }
    .filter-buttons {
        display: flex;
        gap: 2px;
    }
    .filter-btn {
        font-size: 0.7rem;
        padding: 3px 10px;
        border: 1px solid var(--dh2e-border);
        border-radius: 3px;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        transition: all var(--dh2e-transition-fast);

        &.active {
            background: var(--dh2e-gold-dark);
            color: var(--dh2e-bg-darkest);
            border-color: var(--dh2e-gold);
        }
        &:hover:not(.active) {
            border-color: var(--dh2e-gold-dark);
        }
    }
    .add-objective-btn {
        font-size: 0.7rem;
        padding: 4px 10px;
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: 3px;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-gold);
        cursor: pointer;
        transition: all var(--dh2e-transition-fast);

        &:hover {
            background: var(--dh2e-gold-dark);
            color: var(--dh2e-bg-darkest);
        }

        i { margin-right: 4px; }
    }
    .objectives-list {
        flex: 1;
        overflow-y: auto;
    }
    .empty-state {
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        padding: var(--dh2e-space-lg);
        font-size: 0.8rem;
    }
</style>
