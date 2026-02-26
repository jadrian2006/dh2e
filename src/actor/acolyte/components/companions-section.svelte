<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const companions = $derived(ctx.companionCards ?? []);
    const isGM = $derived((game as any).user?.isGM ?? false);

    function openSheet(actorId: string) {
        const actor = (game as any).actors?.get(actorId);
        actor?.sheet?.render(true);
    }

    async function setBehavior(actorId: string, event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        await ctx.setCompanionBehavior?.(actorId, value);
    }
</script>

<section class="companions-section">
    <h3 class="section-title">
        <i class="fa-solid fa-dog"></i>
        {game.i18n?.localize("DH2E.Companion.Title") ?? "Companions"}
    </h3>

    {#if companions.length > 0}
        <div class="companion-list">
            {#each companions as comp (comp.actorId)}
                <div class="companion-card">
                    <img
                        class="companion-portrait"
                        src={comp.img}
                        alt={comp.name}
                    />
                    <div class="companion-info">
                        <div class="companion-name">
                            <button
                                class="link-btn"
                                type="button"
                                onclick={() => openSheet(comp.actorId)}
                                title="Open Sheet"
                            >
                                {comp.name}
                            </button>
                        </div>
                        <div class="companion-wounds">
                            <div class="wound-bar">
                                <div
                                    class="wound-fill"
                                    class:critical={comp.woundPct <= 25}
                                    class:warning={comp.woundPct > 25 && comp.woundPct <= 50}
                                    style="width: {comp.woundPct}%"
                                ></div>
                            </div>
                            <span class="wound-text">{comp.wounds.value}/{comp.wounds.max}</span>
                        </div>
                    </div>
                    <div class="companion-controls">
                        <select
                            class="behavior-select"
                            value={comp.behavior}
                            onchange={(e) => setBehavior(comp.actorId, e)}
                            title="Behavior Directive"
                        >
                            <option value="follow">{game.i18n?.localize("DH2E.Companion.Follow") ?? "Follow"}</option>
                            <option value="stay">{game.i18n?.localize("DH2E.Companion.Stay") ?? "Stay"}</option>
                            <option value="guard">{game.i18n?.localize("DH2E.Companion.Guard") ?? "Guard"}</option>
                        </select>
                        {#if isGM}
                            <button
                                class="remove-btn"
                                type="button"
                                onclick={() => ctx.removeCompanion?.(comp.actorId)}
                                title={game.i18n?.localize("DH2E.Companion.Remove") ?? "Remove Companion"}
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="empty-msg">{game.i18n?.localize("DH2E.Companion.Empty") ?? "No companions assigned."}</p>
    {/if}
</section>

<style lang="scss">
    .companions-section {
        margin-top: var(--dh2e-space-md, 0.75rem);
    }

    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-md, 0.9rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-sm, 0.5rem);
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .companion-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .companion-card {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: 4px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .companion-portrait {
        width: 32px;
        height: 32px;
        border-radius: 3px;
        border: 1px solid var(--dh2e-border, #4a4a55);
        object-fit: cover;
        flex-shrink: 0;
    }

    .companion-info {
        flex: 1;
        min-width: 0;
    }

    .companion-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .link-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0;
        font: inherit;
        text-align: left;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            text-decoration: underline;
        }
    }

    .companion-wounds {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
    }

    .wound-bar {
        flex: 1;
        height: 6px;
        background: var(--dh2e-bg-dark, #1a1a22);
        border-radius: 3px;
        overflow: hidden;
    }

    .wound-fill {
        height: 100%;
        background: var(--dh2e-success, #2ecc71);
        border-radius: 3px;
        transition: width 0.3s;

        &.warning { background: var(--dh2e-warning, #f39c12); }
        &.critical { background: var(--dh2e-danger, #c0392b); }
    }

    .wound-text {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
    }

    .companion-controls {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .behavior-select {
        background: var(--dh2e-bg-dark, #1a1a22);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: 0.65rem;
        padding: 2px 4px;
    }

    .remove-btn {
        background: none;
        border: 1px solid transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 2px 4px;
        font-size: 0.7rem;
        border-radius: 3px;

        &:hover {
            color: var(--dh2e-danger, #c0392b);
            border-color: var(--dh2e-danger, #c0392b);
        }
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
</style>
