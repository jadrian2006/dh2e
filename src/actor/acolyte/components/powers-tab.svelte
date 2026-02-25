<script lang="ts">
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";

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

    /** Whether the character has the Psyker elite advance */
    const isPsyker = $derived(() => {
        const elites: string[] = ctx.actor?.system?.eliteAdvances ?? [];
        return elites.includes("psyker");
    });

    /** Whether the psyker is sanctioned (Adeptus Astra Telepathica background) */
    const isSanctioned = $derived(() => {
        const bg: string = ctx.actor?.system?.details?.background ?? "";
        return bg === "Adeptus Astra Telepathica";
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

    function usePower(power: PowerItem) {
        ctx.usePower?.(power);
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
        {#if isPsyker() && psyRating() > 0}
            <div class="pr-modes">
                <span class="pr-mode unfettered" title="Unfettered: PR x5 bonus. Phenomena on doubles.">Unfettered: {psyRating()}</span>
                <span class="pr-mode pushed" title="Pushed: PR x10 bonus. Always triggers Phenomena (+25).">Pushed: {psyRating()}</span>
            </div>
        {/if}
    </div>

    {#if isPsyker()}
        <div class="psyker-status">
            <span class="status-badge" class:sanctioned={isSanctioned()} class:unsanctioned={!isSanctioned()}>
                <i class={isSanctioned() ? "fa-solid fa-shield-halved" : "fa-solid fa-skull"}></i>
                {isSanctioned() ? "Sanctioned Psyker" : "Unsanctioned Psyker"}
            </span>
        </div>
    {/if}

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
                    <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(power as any); }} title="Send to Chat">
                        <i class="fa-solid fa-comment"></i>
                    </button>
                    <button class="use-btn" onclick={() => usePower(power)} title="Use Power">
                        <i class="fa-solid fa-hat-wizard"></i>
                    </button>
                    {#if ctx.editable}
                        <button class="edit-btn" onclick={() => editPower(power)} title="Edit">&#9998;</button>
                        <button class="delete-btn" onclick={() => deletePower(power)} title="Delete">&times;</button>
                    {/if}
                </div>
            {/each}
        </section>
    {/each}

    {#if (ctx.items?.powers ?? []).length === 0}
        {#if isPsyker() && psyRating() > 0}
            <div class="empty-psyker">
                <i class="fa-solid fa-hat-wizard empty-icon"></i>
                <p class="empty-title">You are a Psyker with Psy Rating {psyRating()}.</p>
                <p class="empty-hint">Drag psychic powers from the compendium to add them.</p>
            </div>
        {:else}
            <p class="empty-msg">No psychic powers.</p>
        {/if}
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
        flex-wrap: wrap;
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

    .pr-modes {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-left: auto;
    }
    .pr-mode {
        font-size: 0.6rem;
        padding: 1px 6px;
        border-radius: 3px;
        border: 1px solid var(--dh2e-border, #4a4a55);
        cursor: help;

        &.unfettered {
            color: var(--dh2e-gold, #b49545);
            border-color: var(--dh2e-gold-muted, #7a6a3e);
        }
        &.pushed {
            color: var(--dh2e-red-bright, #d44);
            border-color: rgba(168, 48, 48, 0.4);
        }
    }

    .psyker-status {
        text-align: center;
    }
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        padding: 2px 8px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        &.sanctioned {
            color: var(--dh2e-success, #48a868);
            border: 1px solid rgba(72, 168, 104, 0.4);
            background: rgba(72, 168, 104, 0.1);
        }
        &.unsanctioned {
            color: var(--dh2e-red-bright, #d44);
            border: 1px solid rgba(168, 48, 48, 0.4);
            background: rgba(168, 48, 48, 0.1);
        }
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

    .chat-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.65rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0.5;

        &:hover { opacity: 1; color: var(--dh2e-gold, #c8a84e); }
    }

    .use-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-gold-muted, #8a7a3e);
        cursor: pointer;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
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

    .empty-psyker {
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .empty-icon {
        font-size: 2rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        opacity: 0.6;
    }
    .empty-title {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        margin: 0;
    }
    .empty-hint {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
</style>
