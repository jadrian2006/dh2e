<script lang="ts">
    import type { PlayerEntry } from "./xp-award-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let amount = $state(0);
    let reason = $state("");
    let mode: "online" | "all" | "individual" = $state("online");
    let selected: Record<string, boolean> = $state({});
    let offlineExpanded = $state(false);

    const online: PlayerEntry[] = $derived(ctx.online ?? []);
    const offline: PlayerEntry[] = $derived(ctx.offline ?? []);
    const allPlayers: PlayerEntry[] = $derived([...online, ...offline]);
    const hasPlayers = $derived(allPlayers.length > 0);

    // Initialize selections based on mode
    $effect(() => {
        const sel: Record<string, boolean> = {};
        if (mode === "online") {
            for (const p of online) sel[p.actorId] = true;
            for (const p of offline) sel[p.actorId] = false;
        } else if (mode === "all") {
            for (const p of allPlayers) sel[p.actorId] = true;
        }
        // "individual" mode — don't reset, keep current
        if (mode !== "individual") selected = sel;
    });

    const selectedIds = $derived(
        Object.entries(selected)
            .filter(([, v]) => v)
            .map(([k]) => k),
    );

    const canAward = $derived(amount > 0 && selectedIds.length > 0);

    function doAward() {
        if (!canAward) return;
        ctx.onAward?.(amount, reason, selectedIds);
    }
</script>

<div class="xp-award-dialog">
    {#if !hasPlayers}
        <p class="no-players">{game.i18n.localize("DH2E.XP.Award.NoPlayers")}</p>
    {:else}
        <!-- Amount / Reason -->
        <div class="field-row">
            <label class="field-label" for="xp-amount">{game.i18n.localize("DH2E.XP.Award.Amount")}</label>
            <div class="field-input">
                <input id="xp-amount" type="number" min="0" bind:value={amount} />
                <span class="field-suffix">XP</span>
            </div>
        </div>
        <div class="field-row">
            <label class="field-label" for="xp-reason">{game.i18n.localize("DH2E.XP.Award.Reason")}</label>
            <input id="xp-reason" type="text" bind:value={reason} placeholder="Optional" />
        </div>

        <!-- Quick-select -->
        <div class="mode-row">
            <span class="field-label">{game.i18n.localize("DH2E.XP.Award.Recipients")}</span>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" name="xp-mode" value="online" bind:group={mode} />
                    {game.i18n.localize("DH2E.XP.Award.AllOnline")}
                </label>
                <label class="radio-label">
                    <input type="radio" name="xp-mode" value="all" bind:group={mode} />
                    {game.i18n.localize("DH2E.XP.Award.AllPlayers")}
                </label>
                <label class="radio-label">
                    <input type="radio" name="xp-mode" value="individual" bind:group={mode} />
                    {game.i18n.localize("DH2E.XP.Award.SelectIndividual")}
                </label>
            </div>
        </div>

        <!-- Player list -->
        <div class="player-list">
            {#if online.length > 0}
                <div class="group-header">{game.i18n.localize("DH2E.XP.Award.Online")}</div>
                {#each online as player (player.actorId)}
                    <label class="player-row">
                        <input
                            type="checkbox"
                            checked={selected[player.actorId] ?? false}
                            disabled={mode !== "individual"}
                            onchange={(e) => { selected[player.actorId] = e.currentTarget.checked; }}
                        />
                        <span class="player-actor">{player.actorName}</span>
                        <span class="player-user">({player.userName})</span>
                    </label>
                {/each}
            {/if}

            {#if offline.length > 0}
                <button class="group-header collapsible" onclick={() => offlineExpanded = !offlineExpanded}>
                    <span class="collapse-icon">{offlineExpanded ? "\u25BE" : "\u25B8"}</span>
                    {game.i18n.localize("DH2E.XP.Award.Offline")} ({offline.length})
                </button>
                {#if offlineExpanded}
                    {#each offline as player (player.actorId)}
                        <label class="player-row">
                            <input
                                type="checkbox"
                                checked={selected[player.actorId] ?? false}
                                disabled={mode !== "individual"}
                                onchange={(e) => { selected[player.actorId] = e.currentTarget.checked; }}
                            />
                            <span class="player-actor">{player.actorName}</span>
                            <span class="player-user">({player.userName})</span>
                        </label>
                    {/each}
                {/if}
            {/if}
        </div>

        <!-- Award button -->
        <button class="award-btn" disabled={!canAward} onclick={doAward}>
            {game.i18n.localize("DH2E.XP.Award.Button")}
        </button>
    {/if}
</div>

<style lang="scss">
    .xp-award-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .no-players {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: var(--dh2e-space-lg, 1rem);
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
    }

    .field-input {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .field-suffix {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 600;
    }

    input[type="number"],
    input[type="text"] {
        flex: 1;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
            outline: none;
        }
    }

    .mode-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .radio-group {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
    }

    .player-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
        max-height: 240px;
        overflow-y: auto;
    }

    .group-header {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        padding: var(--dh2e-space-xxs, 0.125rem) 0;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        background: none;
        border-left: none;
        border-right: none;
        border-top: none;
        text-align: left;

        &.collapsible {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: var(--dh2e-space-xxs, 0.125rem);
            width: 100%;

            &:hover {
                color: var(--dh2e-text-primary, #d0cfc8);
            }
        }
    }

    .collapse-icon {
        font-size: 0.6rem;
    }

    .player-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }
    }

    .player-actor {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .player-user {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .award-btn {
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #0d0d12);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        &:hover:not(:disabled) {
            background: var(--dh2e-gold, #c8a84e);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }
</style>
