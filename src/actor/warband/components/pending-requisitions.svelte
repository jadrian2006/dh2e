<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const pendingItems = $derived(ctx.pendingItems ?? []);
    const isGM = $derived(ctx.isGM ?? false);

    function statusClass(status: string): string {
        switch (status) {
            case "pending": return "status-pending";
            case "ready": return "status-ready";
            case "delivered": return "status-delivered";
            default: return "";
        }
    }

    function statusLabel(status: string): string {
        switch (status) {
            case "pending": return game.i18n?.localize("DH2E.Requisition.Pending") ?? "Pending";
            case "ready": return game.i18n?.localize("DH2E.Requisition.Ready") ?? "Ready";
            case "delivered": return game.i18n?.localize("DH2E.Requisition.Delivered") ?? "Delivered";
            default: return status;
        }
    }

    function craftClass(craft: string): string {
        return `craft-${craft}`;
    }

    function formatTimeRemaining(ms: number): string {
        if (ms <= 0) return "";
        const minutes = Math.ceil(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.ceil(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.ceil(hours / 24);
        return `${days}d`;
    }
</script>

{#if pendingItems.length > 0}
    <div class="pending-requisitions">
        <h4 class="section-header">
            <i class="fa-solid fa-clock"></i>
            {game.i18n?.localize("DH2E.Warband.PendingRequisitions") ?? "Pending Requisitions"}
        </h4>

        <div class="pending-list">
            {#each pendingItems as req (req.id)}
                <div class="pending-row">
                    <div class="pending-info">
                        <span class="pending-name">{req.itemName}</span>
                        <span class="craft-badge {craftClass(req.craftsmanship)}">{req.craftsmanship}</span>
                    </div>
                    <div class="pending-meta">
                        <span class="pending-requester">{req.requestedBy} &rarr; {req.actorName}</span>
                        {#if req.timeRemaining > 0}
                            <span class="pending-eta">
                                <i class="fa-solid fa-hourglass-half"></i>
                                {formatTimeRemaining(req.timeRemaining)}
                            </span>
                        {/if}
                    </div>
                    <div class="pending-status-row">
                        <span class="status-badge {statusClass(req.status)}">{statusLabel(req.status)}</span>
                        {#if isGM && req.status === "ready"}
                            <div class="delivery-actions">
                                <button
                                    class="deliver-btn"
                                    onclick={() => ctx.deliverRequisition?.(req.id, "player")}
                                    title={game.i18n?.localize("DH2E.Requisition.GrantToPlayer") ?? "Grant to Player"}
                                >
                                    <i class="fa-solid fa-user"></i> Grant
                                </button>
                                <button
                                    class="deliver-btn warband"
                                    onclick={() => ctx.deliverRequisition?.(req.id, "warband")}
                                    title={game.i18n?.localize("DH2E.Requisition.GrantToWarband") ?? "Add to Warband"}
                                >
                                    <i class="fa-solid fa-warehouse"></i> Warband
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .pending-requisitions {
        margin-top: var(--dh2e-space-md, 0.75rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
        padding-top: var(--dh2e-space-sm, 0.5rem);
    }

    .section-header {
        margin: 0 0 var(--dh2e-space-sm, 0.5rem);
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold-muted, #7a6a3e);
        text-transform: uppercase;
        letter-spacing: 0.05em;

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .pending-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .pending-row {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: var(--dh2e-radius-sm, 3px);
        border-left: 3px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .pending-info {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .pending-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .craft-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1px 5px;
        border-radius: 2px;
        font-weight: 700;

        &.craft-poor { background: #4a3020; color: #c88050; }
        &.craft-common { background: #303040; color: #a0a0b0; }
        &.craft-good { background: #203040; color: #60a0c0; }
        &.craft-best { background: #3a3020; color: var(--dh2e-gold, #c8a84e); }
    }

    .pending-meta {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md, 0.75rem);
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-top: 2px;
    }

    .pending-eta {
        i { margin-right: 2px; }
    }

    .pending-status-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-top: var(--dh2e-space-xs, 0.25rem);
    }

    .status-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 2px;

        &.status-pending { background: #4a3a20; color: #c8a040; }
        &.status-ready { background: #203820; color: #6c6; }
        &.status-delivered { background: #2a2a30; color: #888; }
    }

    .delivery-actions {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .deliver-btn {
        padding: 2px 8px;
        font-size: 0.7rem;
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #0d0d12);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #c8a84e); }

        &.warband {
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-text-secondary, #a0a0a8);
            border-color: var(--dh2e-border, #4a4a55);

            &:hover {
                background: var(--dh2e-bg-light, #3a3a45);
                color: var(--dh2e-text-primary, #d0cfc8);
            }
        }

        i { margin-right: 3px; }
    }
</style>
