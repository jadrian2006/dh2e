<script lang="ts">
    import type { VoxLogEntry } from "../../../ui/vox-terminal/vox-log.ts";
    import { resolveVoxContent } from "../../../ui/vox-terminal/vox-log.ts";
    import { ImperialDateUtil } from "../../../integrations/imperial-calendar/imperial-date.ts";
    import { getLog, migrateXPLedger, type LogEntry } from "../../log.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    // ─── Vox Section ──────────────────────────────────
    const voxEntries: VoxLogEntry[] = $derived(ctx.voxLog ?? []);
    const sortedVox = $derived([...voxEntries].sort((a, b) => b.receivedAt - a.receivedAt));
    let voxOpen = $state(true);

    // Auto-collapse vox section when empty
    $effect(() => {
        if (sortedVox.length === 0) voxOpen = false;
    });

    function formatVoxDate(ts: number): string {
        const warband = (game as any).dh2e?.warband;
        const currentDate = warband?.system?.chronicle?.currentDate;
        if (currentDate) {
            return ImperialDateUtil.format(currentDate);
        }
        return new Date(ts).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    async function viewVoxEntry(entry: VoxLogEntry): Promise<void> {
        const title = entry.title || entry.sender || "Vox Transmission";
        const content = await resolveVoxContent(entry);
        const body = content.html
            ? content.html
            : `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit;color:inherit;">${content.message}</pre>`;

        new (foundry.applications.api as any).DialogV2({
            window: {
                title: `VOX // ${title}`,
                icon: "fa-solid fa-tower-broadcast",
            },
            content: `
                <div class="vox-viewer" style="
                    background: #0a0e08;
                    color: #33ff33;
                    font-family: var(--dh2e-font-mono, monospace);
                    font-size: 0.85rem;
                    line-height: 1.5;
                    padding: 1rem;
                    max-height: 60vh;
                    overflow-y: auto;
                ">
                    ${entry.sender ? `<div style="color: var(--dh2e-gold, #c8a84e); font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; margin-bottom: 0.5rem;">FROM: ${entry.sender}</div>` : ""}
                    ${body}
                </div>
                <style>
                    .vox-viewer h1, .vox-viewer h2, .vox-viewer h3 { color: #33ff33; margin: 0.25rem 0; }
                    .vox-viewer h1 { font-size: 1.1rem; }
                    .vox-viewer h2 { font-size: 1rem; }
                    .vox-viewer h3 { font-size: 0.9rem; }
                    .vox-viewer p { margin: 0.25rem 0; color: #33ff33; }
                    .vox-viewer strong { color: #44ff44; }
                    .vox-viewer em { color: #33dd33; }
                    .vox-viewer a { color: #55ff55; }
                    .vox-viewer hr { border-color: #1a3a1a; }
                </style>
            `,
            buttons: [{
                action: "close",
                label: "Dismiss",
                default: true,
            }],
            position: { width: 560, height: 500 },
        }).render(true);
    }

    // ─── XP Log Section ──────────────────────────────
    let migrated = $state(false);
    let xpOpen = $state(true);

    $effect(() => {
        const actor = ctx.actor;
        if (!actor || migrated) return;
        migrated = true;
        migrateXPLedger(actor);
    });

    const logEntries: LogEntry[] = $derived(getLog(ctx.actor));

    const rows = $derived(() => {
        const sorted = [...logEntries].sort((a, b) => a.timestamp - b.timestamp);
        let running = 0;
        const withTotals = sorted.map((entry) => {
            running += entry.amount;
            return { ...entry, runningTotal: running };
        });
        return withTotals.reverse();
    });

    function formatLogDate(ts: number): string {
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

<div class="logs-tab">
    <!-- Vox Transmissions Section -->
    <div class="section-header vox" onclick={() => voxOpen = !voxOpen} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') voxOpen = !voxOpen; }}>
        <i class="fa-solid fa-tower-broadcast"></i>
        <span>Vox Transmissions</span>
        <span class="section-count">({sortedVox.length})</span>
        <i class="fa-solid {voxOpen ? 'fa-chevron-down' : 'fa-chevron-right'} toggle-icon"></i>
    </div>

    {#if voxOpen}
        <div class="vox-section">
            {#if sortedVox.length === 0}
                <p class="vox-empty">{game.i18n.localize("DH2E.Vox.LogEmpty")}</p>
            {:else}
                <div class="vox-entries">
                    {#each sortedVox as entry (entry.id)}
                        <div class="vox-entry" onclick={() => viewVoxEntry(entry)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') viewVoxEntry(entry); }}>
                            <i class="fa-solid fa-envelope entry-icon"></i>
                            <div class="entry-info">
                                <span class="entry-title">{entry.title || entry.sender || "Vox Transmission"}</span>
                                <span class="entry-date">{formatVoxDate(entry.receivedAt)}</span>
                            </div>
                            <div class="vox-actions" onclick={(e) => e.stopPropagation()}>
                                <button
                                    class="vox-action-btn"
                                    title={game.i18n.localize("DH2E.Vox.ConvertObjective")}
                                    onclick={() => ctx.convertVoxToObjective?.(entry.id)}
                                >
                                    <i class="fa-solid fa-crosshairs"></i>
                                </button>
                                <button
                                    class="vox-action-btn delete"
                                    title={game.i18n.localize("DH2E.Vox.Delete")}
                                    onclick={() => ctx.deleteVoxEntry?.(entry.id)}
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- XP Log Section -->
    <div class="section-header xp" onclick={() => xpOpen = !xpOpen} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') xpOpen = !xpOpen; }}>
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>XP Log</span>
        <span class="section-count">({rows().length})</span>
        <i class="fa-solid {xpOpen ? 'fa-chevron-down' : 'fa-chevron-right'} toggle-icon"></i>
    </div>

    {#if xpOpen}
        <div class="xp-section">
            <div class="log-header">
                <span class="col-date">{game.i18n.localize("DH2E.Log.Date")}</span>
                <span class="col-event">{game.i18n.localize("DH2E.Log.Event")}</span>
                <span class="col-amount">{game.i18n.localize("DH2E.Log.Amount")}</span>
                <span class="col-total">{game.i18n.localize("DH2E.Log.RunningTotal")}</span>
            </div>

            <div class="log-list">
                {#each rows() as row}
                    <div class="log-row" class:award={row.type === "xp-award"} class:spend={row.type === "xp-spend"}>
                        <span class="col-date">{formatLogDate(row.timestamp)}</span>
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
    {/if}
</div>

<style lang="scss">
    .logs-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
    }

    /* ─── Section Headers ─── */
    .section-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
        cursor: pointer;
        user-select: none;

        &.vox {
            background: #0a0e08;
            color: #33ff33;
            border-bottom: 1px solid #1a3a1a;
        }

        &.xp {
            color: var(--dh2e-gold, #c8a84e);
            border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        }

        &:hover {
            opacity: 0.85;
        }
    }

    .section-count {
        font-family: var(--dh2e-font-mono, monospace);
        font-size: 0.6rem;
        opacity: 0.7;
    }

    .toggle-icon {
        margin-left: auto;
        font-size: 0.55rem;
        opacity: 0.6;
    }

    /* ─── Vox Section ─── */
    .vox-section {
        background: #0a0e08;
        max-height: 40%;
        overflow-y: auto;
    }

    .vox-empty {
        color: #338833;
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-family: var(--dh2e-font-mono, monospace);
        margin: 0;
    }

    .vox-entries {
        display: flex;
        flex-direction: column;
    }

    .vox-entry {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        border-bottom: 1px solid #0d1a0d;
        cursor: pointer;

        &:hover {
            background: #0d160b;
        }
    }

    .entry-icon {
        color: #338833;
        font-size: 0.65rem;
        flex-shrink: 0;
        width: 1rem;
        text-align: center;
    }

    .entry-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 1px;
    }

    .entry-title {
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .entry-date {
        color: #338833;
        font-size: 0.6rem;
        font-family: var(--dh2e-font-mono, monospace);
    }

    .vox-actions {
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.15s;
        flex-shrink: 0;

        .vox-entry:hover & {
            opacity: 1;
        }
    }

    .vox-action-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: var(--dh2e-radius-sm, 3px);
        color: #338833;
        cursor: pointer;
        padding: 2px 6px;
        font-size: 0.65rem;

        &:hover {
            color: #33ff33;
            border-color: #1a3a1a;
            background: #0a1a0a;
        }

        &.delete:hover {
            color: #cc4444;
            border-color: #4a1a1a;
            background: #1a0a0a;
        }
    }

    /* ─── XP Log Section ─── */
    .xp-section {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
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
