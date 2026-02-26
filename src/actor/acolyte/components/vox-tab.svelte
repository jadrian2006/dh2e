<script lang="ts">
    import type { VoxLogEntry } from "../../../ui/vox-terminal/vox-log.ts";
    import { resolveVoxContent } from "../../../ui/vox-terminal/vox-log.ts";
    import { ImperialDateUtil } from "../../../integrations/imperial-calendar/imperial-date.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const entries: VoxLogEntry[] = $derived(ctx.voxLog ?? []);

    // Newest first
    const sorted = $derived([...entries].sort((a, b) => b.receivedAt - a.receivedAt));

    /** Format timestamp as Imperial date if warband is available, else real date */
    function formatDate(ts: number): string {
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

    /** Open a popup showing the full transmission content (resolved on-demand) */
    async function viewEntry(entry: VoxLogEntry): Promise<void> {
        const title = entry.title || entry.sender || "Vox Transmission";

        // Resolve content live from journal or stored text
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
</script>

<div class="vox-tab">
    <div class="vox-tab-header">
        <i class="fa-solid fa-tower-broadcast"></i>
        <span>{game.i18n.localize("DH2E.Vox.LogTitle")}</span>
        <span class="vox-count">{sorted.length}</span>
    </div>

    {#if sorted.length === 0}
        <p class="vox-empty">{game.i18n.localize("DH2E.Vox.LogEmpty")}</p>
    {:else}
        <div class="vox-entries">
            {#each sorted as entry (entry.id)}
                <div class="vox-entry" onclick={() => viewEntry(entry)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') viewEntry(entry); }}>
                    <i class="fa-solid fa-envelope entry-icon"></i>
                    <div class="entry-info">
                        <span class="entry-title">{entry.title || entry.sender || "Vox Transmission"}</span>
                        <span class="entry-date">{formatDate(entry.receivedAt)}</span>
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

<style lang="scss">
    .vox-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        background: #0a0e08;
    }

    .vox-tab-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        border-bottom: 1px solid #1a3a1a;
        color: #33ff33;
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
    }

    .vox-count {
        margin-left: auto;
        background: #1a3a1a;
        color: #338833;
        padding: 0 0.4rem;
        border-radius: 2px;
        font-size: 0.6rem;
        font-family: var(--dh2e-font-mono, monospace);
    }

    .vox-empty {
        color: #338833;
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-xl, 2rem);
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
</style>
