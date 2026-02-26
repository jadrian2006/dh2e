<script lang="ts">
    import type { VoxLogEntry } from "../../../ui/vox-terminal/vox-log.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const entries: VoxLogEntry[] = $derived(ctx.voxLog ?? []);

    // Newest first
    const sorted = $derived([...entries].sort((a, b) => b.receivedAt - a.receivedAt));

    function formatDate(ts: number): string {
        return new Date(ts).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<div class="vox-tab">
    <div class="vox-tab-header">
        <i class="fa-solid fa-tower-broadcast"></i>
        <span>{game.i18n.localize("DH2E.Vox.LogTitle")}</span>
    </div>

    {#if sorted.length === 0}
        <p class="vox-empty">{game.i18n.localize("DH2E.Vox.LogEmpty")}</p>
    {:else}
        <div class="vox-entries">
            {#each sorted as entry (entry.id)}
                <div class="vox-entry">
                    <div class="vox-entry-header">
                        {#if entry.sender}
                            <span class="vox-sender">{entry.sender}</span>
                        {/if}
                        <span class="vox-timestamp">{formatDate(entry.receivedAt)}</span>
                        <div class="vox-actions">
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
                    <div class="vox-entry-body">
                        {#if entry.html}
                            {@html entry.html}
                        {:else}
                            <pre class="vox-text">{entry.message}</pre>
                        {/if}
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
        border-bottom: 1px solid #1a3a1a;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);

        &:hover {
            background: #0d120b;
        }
    }

    .vox-entry-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-bottom: var(--dh2e-space-xxs, 0.125rem);
    }

    .vox-sender {
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .vox-timestamp {
        color: #338833;
        font-size: 0.6rem;
        font-family: var(--dh2e-font-mono, monospace);
        flex: 1;
    }

    .vox-actions {
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.15s;

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

    .vox-entry-body {
        color: #33ff33;
        font-family: var(--dh2e-font-mono, monospace);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.4;

        :global(h1) {
            font-size: 1rem;
            color: #33ff33;
            margin: 0.25rem 0;
        }
        :global(h2) {
            font-size: 0.9rem;
            color: #33ff33;
            margin: 0.25rem 0;
        }
        :global(h3) {
            font-size: 0.85rem;
            color: #33ff33;
            margin: 0.2rem 0;
        }
        :global(p) {
            margin: 0.25rem 0;
            color: #33ff33;
        }
        :global(a) {
            color: #55ff55;
        }
        :global(strong) {
            color: #44ff44;
        }
        :global(em) {
            color: #33dd33;
        }
    }

    .vox-text {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
    }
</style>
