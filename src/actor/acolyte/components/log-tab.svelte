<script lang="ts">
    import { getLog, migrateXPLedger, type LogEntry } from "../../log.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let migrated = $state(false);

    // Run migration on mount (once per character)
    $effect(() => {
        const actor = ctx.actor;
        if (!actor || migrated) return;
        migrated = true;
        migrateXPLedger(actor);
    });

    const entries: LogEntry[] = $derived(getLog(ctx.actor));

    /** Walk chronologically to compute running totals, then reverse for display. */
    const rows = $derived(() => {
        const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
        let running = 0;
        const withTotals = sorted.map((entry) => {
            running += entry.amount;
            return { ...entry, runningTotal: running };
        });
        return withTotals.reverse();
    });

    function formatDate(ts: number): string {
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function formatAmount(n: number): string {
        return n > 0 ? `+${n}` : String(n);
    }
</script>

<div class="log-tab">
    <div class="log-header">
        <span class="col-date">{game.i18n.localize("DH2E.Log.Date")}</span>
        <span class="col-event">{game.i18n.localize("DH2E.Log.Event")}</span>
        <span class="col-amount">{game.i18n.localize("DH2E.Log.Amount")}</span>
        <span class="col-total">{game.i18n.localize("DH2E.Log.RunningTotal")}</span>
    </div>

    <div class="log-list">
        {#each rows() as row}
            <div class="log-row" class:award={row.type === "xp-award"} class:spend={row.type === "xp-spend"}>
                <span class="col-date">{formatDate(row.timestamp)}</span>
                <span class="col-event">
                    <span class="event-label">{row.label}</span>
                    {#if row.detail}
                        <span class="event-detail">{row.detail}</span>
                    {/if}
                </span>
                <span class="col-amount" class:positive={row.amount > 0} class:negative={row.amount < 0}>
                    {formatAmount(row.amount)}
                </span>
                <span class="col-total">{row.runningTotal}</span>
            </div>
        {/each}

        {#if rows().length === 0}
            <p class="empty-msg">{game.i18n.localize("DH2E.Log.Empty")}</p>
        {/if}
    </div>
</div>

<style lang="scss">
    .log-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
    }

    .log-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .log-list {
        display: flex;
        flex-direction: column;
    }

    .log-row {
        display: flex;
        align-items: flex-start;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);

        &.award {
            .col-amount { color: var(--dh2e-gold, #c8a84e); }
        }

        &.spend {
            color: var(--dh2e-text-secondary, #a0a0a8);
        }
    }

    .col-date {
        width: 6.5rem;
        flex-shrink: 0;
    }

    .col-event {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .event-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .event-detail {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .col-amount {
        width: 3.5rem;
        flex-shrink: 0;
        text-align: right;
        font-family: var(--dh2e-font-mono, monospace);

        &.positive { color: var(--dh2e-gold, #c8a84e); }
        &.negative { color: var(--dh2e-text-secondary, #a0a0a8); }
    }

    .col-total {
        width: 3.5rem;
        flex-shrink: 0;
        text-align: right;
        font-family: var(--dh2e-font-mono, monospace);
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
    }
</style>
