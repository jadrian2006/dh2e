<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    interface PowerItem {
        name: string;
        system: {
            discipline?: string;
            action?: string;
            focusTest?: string;
            range?: string;
            sustained?: boolean;
            cost?: number;
            description?: string;
        };
        sheet?: { render: (force: boolean) => void };
        delete: () => Promise<void>;
    }

    /** Derive Psy Rating from talent named "Psy Rating" if present, else 0 */
    const psyRating = $derived(() => {
        const talents: any[] = ctx.items?.talents ?? [];
        const pr = talents.find((t: any) => t.name === "Psy Rating");
        return pr?.system?.tier ?? 0;
    });

    const groupedPowers = $derived(() => {
        const powers: PowerItem[] = ctx.items?.powers ?? [];
        const groups: Record<string, PowerItem[]> = {};
        for (const p of powers) {
            const disc = p.system?.discipline || "Unaligned";
            if (!groups[disc]) groups[disc] = [];
            groups[disc].push(p);
        }
        // Sort within each discipline
        for (const list of Object.values(groups)) {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return groups;
    });

    const disciplines = $derived(() => Object.keys(groupedPowers()).sort());

    function editPower(power: PowerItem) {
        power.sheet?.render(true);
    }

    async function deletePower(power: PowerItem) {
        await power.delete();
    }

    function toggleFavorite(power: any) {
        const current = power.getFlag?.("dh2e", "favorite");
        if (current) power.unsetFlag("dh2e", "favorite");
        else power.setFlag("dh2e", "favorite", true);
    }
</script>

<div class="powers-tab">
    <div class="psy-rating-display">
        <span class="psy-label">Psy Rating</span>
        <span class="psy-value">{psyRating()}</span>
    </div>

    {#each disciplines() as disc}
        <section class="discipline-section">
            <h3 class="discipline-header">{disc}</h3>
            {#each groupedPowers()[disc] as power}
                <div class="power-row">
                    <button class="fav-star" onclick={() => toggleFavorite(power)} title="Favorite">
                        <i class={(power as any).getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                    </button>
                    <div class="power-info">
                        <span class="power-name">{power.name}</span>
                        <span class="power-meta">
                            {#if power.system?.action}{power.system.action}{/if}
                            {#if power.system?.sustained} &middot; Sustained{/if}
                            {#if power.system?.range} &middot; {power.system.range}{/if}
                        </span>
                    </div>
                    {#if power.system?.focusTest}
                        <span class="power-focus">{power.system.focusTest}</span>
                    {/if}
                    {#if ctx.editable}
                        <button class="edit-btn" onclick={() => editPower(power)} title="Edit">&#9998;</button>
                        <button class="delete-btn" onclick={() => deletePower(power)} title="Delete">&times;</button>
                    {/if}
                </div>
            {/each}
        </section>
    {/each}

    {#if (ctx.items?.powers ?? []).length === 0}
        <p class="empty-msg">No psychic powers.</p>
    {/if}
</div>

<style lang="scss">
    .powers-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .psy-rating-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-light, #3a3a45);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
    }
    .psy-label {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .psy-value {
        font-size: var(--dh2e-text-xl, 1.2rem);
        font-weight: 700;
        color: var(--dh2e-gold-bright, #c8a84e);
    }

    .discipline-header {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #b49545);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xxs, 0.125rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #7a6a3e);
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
    }

    .power-row {
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

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.7rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .power-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    .power-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .power-meta {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .power-focus {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        white-space: nowrap;
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
