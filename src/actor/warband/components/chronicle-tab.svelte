<script lang="ts">
    import ImperialDateDisplay from "./imperial-date-display.svelte";
    import ChronicleEntryRow from "./chronicle-entry-row.svelte";
    import DeadlineTracker from "./deadline-tracker.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const chronicle = $derived(ctx.chronicle ?? {});
    const entries = $derived(chronicle.entries ?? []);
    const deadlines = $derived(chronicle.deadlines ?? []);
    const formattedDate = $derived(chronicle.formattedDate ?? "0.000.815.M41");
    const isGM = $derived(ctx.isGM ?? false);
</script>

<div class="chronicle-tab">
    <!-- Imperial Date Header -->
    <ImperialDateDisplay
        {formattedDate}
        {isGM}
        onAdvanceDay={(days) => ctx.onAdvanceDay?.(days)}
        onSetDate={() => ctx.onSetDate?.()}
    />

    <!-- Session Log -->
    <section class="chronicle-log">
        <div class="log-header">
            <h3 class="log-title">
                <i class="fa-solid fa-scroll"></i> Session Chronicle
            </h3>
            {#if isGM}
                <button class="add-entry-btn" onclick={() => ctx.onAddEntry?.()}>
                    <i class="fa-solid fa-plus"></i> Add Entry
                </button>
            {/if}
        </div>

        <div class="log-entries">
            {#if entries.length === 0}
                <p class="empty-state">No chronicle entries yet. The annals of the warband await.</p>
            {:else}
                {#each entries as entry (entry.id)}
                    <ChronicleEntryRow
                        {entry}
                        {isGM}
                        onEdit={() => ctx.onEditEntry?.(entry.id)}
                        onDelete={() => ctx.onDeleteEntry?.(entry.id)}
                    />
                {/each}
            {/if}
        </div>
    </section>

    <!-- Deadline Tracker -->
    <DeadlineTracker
        {deadlines}
        {isGM}
        onSetDeadline={() => ctx.onSetDeadline?.()}
        onRemoveDeadline={(id) => ctx.onRemoveDeadline?.(id)}
    />
</div>

<style lang="scss">
    .chronicle-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md);
        height: 100%;
        padding: var(--dh2e-space-md);
        overflow-y: auto;
    }
    .chronicle-log {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }
    .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: var(--dh2e-space-sm);
        border-bottom: 1px solid var(--dh2e-border);
    }
    .log-title {
        font-size: 0.8rem;
        color: var(--dh2e-gold);
        margin: 0;
        i { margin-right: 4px; }
    }
    .add-entry-btn {
        font-size: 0.65rem;
        padding: 3px 8px;
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: 3px;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-gold);
        cursor: pointer;
        &:hover { background: var(--dh2e-gold-dark); color: var(--dh2e-bg-darkest); }
        i { margin-right: 3px; }
    }
    .log-entries {
        flex: 1;
        overflow-y: auto;
    }
    .empty-state {
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        font-size: 0.75rem;
        padding: var(--dh2e-space-lg);
    }
</style>
