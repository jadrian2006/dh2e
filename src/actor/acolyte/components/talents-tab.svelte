<script lang="ts">
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    interface TalentItem {
        name: string;
        system: {
            tier?: number;
            prerequisites?: string;
            aptitudes?: string[];
        };
        sheet?: { render: (force: boolean) => void };
        delete: () => Promise<void>;
    }

    const tierLabels = ["", "T1", "T2", "T3"];

    const groupedTalents = $derived(() => {
        const talents: TalentItem[] = ctx.items?.talents ?? [];
        const groups: Record<number, TalentItem[]> = { 1: [], 2: [], 3: [] };
        for (const t of talents) {
            const tier = t.system?.tier ?? 1;
            const key = Math.max(1, Math.min(3, tier));
            groups[key].push(t);
        }
        // Sort alphabetically within each tier
        for (const tier of Object.values(groups)) {
            tier.sort((a, b) => a.name.localeCompare(b.name));
        }
        return groups;
    });

    function editTalent(talent: TalentItem) {
        talent.sheet?.render(true);
    }

    async function deleteTalent(talent: TalentItem) {
        await talent.delete();
    }
</script>

<div class="talents-tab">
    {#each [1, 2, 3] as tier}
        {@const talents = groupedTalents()[tier]}
        {#if talents.length > 0}
            <section class="tier-section">
                <h3 class="tier-header">Tier {tier}</h3>
                {#each talents as talent}
                    <div class="talent-row">
                        <span class="tier-badge">{tierLabels[tier]}</span>
                        <div class="talent-info" onclick={() => editTalent(talent)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") editTalent(talent); }} title="View details">
                            <span class="talent-name">{talent.name}</span>
                            {#if talent.system?.prerequisites}
                                <span class="talent-prereqs">Prereqs: {talent.system.prerequisites}</span>
                            {/if}
                            {#if talent.system?.aptitudes?.length}
                                <span class="talent-apts">{talent.system.aptitudes.join(", ")}</span>
                            {/if}
                        </div>
                        <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(talent); }} title="Send to Chat">
                            <i class="fa-solid fa-comment"></i>
                        </button>
                        {#if ctx.editable}
                            <button class="delete-btn" onclick={() => deleteTalent(talent)} title="Delete">&times;</button>
                        {/if}
                    </div>
                {/each}
            </section>
        {/if}
    {/each}

    {#if (ctx.items?.talents ?? []).length === 0}
        <p class="empty-msg">No talents. Drag talents from the Items sidebar.</p>
    {/if}
</div>

<style lang="scss">
    .talents-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .tier-header {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #b49545);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xxs, 0.125rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #7a6a3e);
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
    }

    .talent-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
            &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        }
    }

    .tier-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.8rem;
        height: 1.4rem;
        font-size: 0.6rem;
        font-weight: 700;
        color: var(--dh2e-bg-darkest, #111114);
        background: var(--dh2e-gold-dark, #7a6228);
        border-radius: var(--dh2e-radius-sm, 3px);
        text-transform: uppercase;
        flex-shrink: 0;
    }

    .talent-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        cursor: pointer;
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: 2px 4px;

        &:hover {
            background: rgba(180, 149, 69, 0.08);
        }
    }

    .talent-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .talent-prereqs {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .talent-apts {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
    }

    .chat-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0.5;

        &:hover { color: var(--dh2e-gold, #c8a84e); opacity: 1; }
    }

    .edit-btn, .delete-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }
    .delete-btn:hover { color: var(--dh2e-red-bright, #d44); }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
</style>
