<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const reinforcements = $derived(ctx.reinforcementCards ?? []);
    const isGM = $derived(ctx.isGM ?? false);

    function openSheet(actorId: string) {
        const actor = (game as any).actors?.get(actorId);
        actor?.sheet?.render(true);
    }

    async function assignController(actorId: string) {
        const g = game as any;
        const users = (g.users?.contents ?? []).filter((u: any) => !u.isGM && u.active);

        if (users.length === 0) {
            ui.notifications?.warn("No active non-GM players to assign.");
            return;
        }

        const buttons = users.map((u: any) => ({
            action: u.id,
            label: u.name,
            callback: () => ctx.assignRCController?.(actorId, u.id),
        }));
        buttons.push({
            action: "cancel",
            label: g.i18n?.localize("DH2E.Roll.Dialog.Cancel") ?? "Cancel",
            callback: () => {},
        });

        new fa.api.DialogV2({
            window: {
                title: g.i18n?.localize("DH2E.Reinforcement.Assign") ?? "Assign Controller",
                icon: "fa-solid fa-user-check",
            },
            content: `<p style="padding: 0.5rem;">${g.i18n?.localize("DH2E.Reinforcement.Assign") ?? "Select a player to control this reinforcement."}</p>`,
            buttons,
            position: { width: 320 },
        }).render(true);
    }
</script>

<div class="reinforcements-tab">
    {#if reinforcements.length > 0}
        <div class="rc-list">
            {#each reinforcements as rc (rc.actorId)}
                <div class="rc-card">
                    <img
                        class="rc-portrait"
                        src={rc.img}
                        alt={rc.name}
                    />
                    <div class="rc-info">
                        <div class="rc-name">
                            <button
                                class="link-btn"
                                type="button"
                                onclick={() => openSheet(rc.actorId)}
                                title="Open Sheet"
                            >
                                {rc.name}
                            </button>
                        </div>
                        <div class="rc-controller">
                            {#if rc.controllerName}
                                <i class="fa-solid fa-user-check"></i>
                                <span>{rc.controllerName}</span>
                            {:else}
                                <span class="unassigned">
                                    {game.i18n?.localize("DH2E.Reinforcement.Unassigned") ?? "Unassigned"}
                                </span>
                            {/if}
                        </div>
                        {#if rc.notes}
                            <div class="rc-notes">{rc.notes}</div>
                        {/if}
                    </div>
                    {#if isGM}
                        <div class="rc-controls">
                            <button
                                class="action-btn"
                                type="button"
                                onclick={() => assignController(rc.actorId)}
                                title={game.i18n?.localize("DH2E.Reinforcement.Assign") ?? "Assign Controller"}
                            >
                                <i class="fa-solid fa-user-plus"></i>
                            </button>
                            <button
                                class="action-btn remove"
                                type="button"
                                onclick={() => ctx.removeReinforcement?.(rc.actorId)}
                                title={game.i18n?.localize("DH2E.Reinforcement.Remove") ?? "Remove Reinforcement"}
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <p class="empty-msg">
            <i class="fa-solid fa-users-gear"></i>
            {game.i18n?.localize("DH2E.Reinforcement.Empty") ?? "No reinforcements staged."}
        </p>
    {/if}

    {#if isGM}
        <div class="drop-zone" data-drop-target="reinforcements">
            <i class="fa-solid fa-hand-pointer"></i>
            Drag NPC actors here to stage as reinforcements
        </div>
    {/if}
</div>

<style lang="scss">
    .reinforcements-tab {
        padding: var(--dh2e-space-sm, 0.5rem);
    }

    .rc-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .rc-card {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: 6px 8px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .rc-portrait {
        width: 40px;
        height: 40px;
        border-radius: 3px;
        border: 1px solid var(--dh2e-border, #4a4a55);
        object-fit: cover;
        flex-shrink: 0;
    }

    .rc-info {
        flex: 1;
        min-width: 0;
    }

    .rc-name {
        font-size: 0.8rem;
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

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            text-decoration: underline;
        }
    }

    .rc-controller {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;

        i { font-size: 0.6rem; color: var(--dh2e-success, #2ecc71); }
    }

    .unassigned {
        font-style: italic;
        color: var(--dh2e-warning, #f39c12);
    }

    .rc-notes {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-top: 2px;
        font-style: italic;
    }

    .rc-controls {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }

    .action-btn {
        background: none;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 3px 6px;
        font-size: 0.7rem;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }

        &.remove:hover {
            color: var(--dh2e-danger, #c0392b);
            border-color: var(--dh2e-danger, #c0392b);
        }
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .drop-zone {
        margin-top: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
        border: 2px dashed var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.75rem;
        font-style: italic;

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }
</style>
