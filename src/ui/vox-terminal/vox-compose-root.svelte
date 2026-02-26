<script lang="ts">
    import type { VoxTerminalPayload } from "./vox-compose-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let sender = $state(ctx.initialSender ?? "");
    let message = $state(ctx.initialMessage ?? "");
    let messageHtml = $state(ctx.initialHtml ?? "");
    let speed: number = $state(50);
    let showPicker = $state(false);
    let searchQuery = $state("");
    let loadedName = $state("");
    let expandedGroups = $state(new Set<string>());
    let sourceUuid: string | undefined = $state(undefined);

    // Targeting state
    let targetSelected: Record<string, boolean> = $state({});
    const targetIds = $derived(
        Object.entries(targetSelected).filter(([, v]) => v).map(([k]) => k)
    );
    const players: { userId: string; userName: string }[] = ctx.players ?? [];

    const canSend = $derived(message.trim().length > 0);

    const query = $derived(searchQuery.toLowerCase());

    const filteredGroups = $derived(
        (ctx.groups ?? [])
            .map((group: any) => ({
                label: group.label,
                items: group.items.filter((item: any) =>
                    item.name.toLowerCase().includes(query)
                ),
            }))
            .filter((group: any) => group.items.length > 0)
    );

    const hasAnyItems = $derived(filteredGroups.some((g: any) => g.items.length > 0));

    function isExpanded(label: string): boolean {
        if (query) return true; // Auto-expand when searching
        return expandedGroups.has(label);
    }

    function toggleGroup(label: string) {
        const next = new Set(expandedGroups);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        expandedGroups = next;
    }

    async function pickItem(uuid: string) {
        const result = await ctx.loadItem?.(uuid);
        if (!result) return;
        if (result.sender) sender = result.sender;
        if (result.message) message = result.message;
        messageHtml = result.html ?? "";
        sourceUuid = result.sourceUuid ?? undefined;
        loadedName = result.name ?? "";
        showPicker = false;
        searchQuery = "";
        // Clear the indicator after a few seconds
        setTimeout(() => { loadedName = ""; }, 3000);
    }

    function doSend() {
        if (!canSend) return;
        const payload: VoxTerminalPayload = {
            sender: sender.trim(),
            message: message.trim(),
            html: messageHtml || undefined,
            speed,
            timestamp: Date.now(),
            sourceUuid: sourceUuid || undefined,
            targetUserIds: targetIds.length > 0 ? targetIds : undefined,
        };
        ctx.onSend?.(payload);
    }
</script>

<div class="vox-compose-dialog">
    <!-- Item picker toggle -->
    <div class="picker-section">
        <button class="picker-toggle" onclick={() => { showPicker = !showPicker; searchQuery = ""; }}>
            <i class="fa-solid" class:fa-folder-open={showPicker} class:fa-folder={!showPicker}></i>
            {game.i18n.localize("DH2E.Vox.LoadFromItem")}
        </button>
        {#if loadedName}
            <span class="loaded-indicator">
                <i class="fa-solid fa-check"></i>
                {game.i18n.format("DH2E.Vox.ItemLoaded", { name: loadedName })}
            </span>
        {/if}
    </div>

    {#if showPicker}
        <div class="picker-panel">
            <input
                type="text"
                class="picker-search"
                bind:value={searchQuery}
                placeholder={game.i18n.localize("DH2E.Vox.SearchItems")}
            />
            <div class="picker-list">
                {#if !hasAnyItems}
                    <p class="picker-empty">{game.i18n.localize("DH2E.Vox.NoItemsFound")}</p>
                {:else}
                    {#each filteredGroups as group (group.label)}
                        <div class="picker-group">
                            <button class="group-header" onclick={() => toggleGroup(group.label)}>
                                <i class="fa-solid" class:fa-chevron-right={!isExpanded(group.label)} class:fa-chevron-down={isExpanded(group.label)}></i>
                                <span class="group-label">{group.label}</span>
                                <span class="group-count">{group.items.length}</span>
                            </button>
                            {#if isExpanded(group.label)}
                                <div class="group-items">
                                    {#each group.items as item (item.uuid)}
                                        <button class="item-pick-btn" onclick={() => pickItem(item.uuid)}>
                                            <img src={item.img} alt="" class="item-pick-icon" />
                                            <span class="item-pick-name">{item.name}</span>
                                            <span class="item-pick-type">{item.type}</span>
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}

    <div class="field-row">
        <label class="field-label" for="vox-sender">{game.i18n.localize("DH2E.Vox.Sender")}</label>
        <input
            id="vox-sender"
            type="text"
            bind:value={sender}
            placeholder={game.i18n.localize("DH2E.Vox.SenderPlaceholder")}
        />
    </div>

    <div class="field-row">
        <label class="field-label" for="vox-message">{game.i18n.localize("DH2E.Vox.Message")}</label>
        <textarea
            id="vox-message"
            rows="10"
            bind:value={message}
            placeholder={game.i18n.localize("DH2E.Vox.MessagePlaceholder")}
        ></textarea>
    </div>

    <div class="field-row">
        <label class="field-label" for="vox-speed">{game.i18n.localize("DH2E.Vox.Speed")}</label>
        <select id="vox-speed" bind:value={speed}>
            <option value={30}>{game.i18n.localize("DH2E.Vox.SpeedSlow")}</option>
            <option value={50}>{game.i18n.localize("DH2E.Vox.SpeedNormal")}</option>
            <option value={80}>{game.i18n.localize("DH2E.Vox.SpeedFast")}</option>
        </select>
    </div>

    {#if players.length > 0}
        <div class="field-row">
            <label class="field-label">{game.i18n.localize("DH2E.Vox.Recipients")}</label>
            <div class="recipients-list">
                {#each players as player (player.userId)}
                    <label class="recipient-check">
                        <input
                            type="checkbox"
                            checked={targetSelected[player.userId] ?? false}
                            onchange={(e) => {
                                targetSelected[player.userId] = (e.target as HTMLInputElement).checked;
                            }}
                        />
                        <span class="recipient-name">{player.userName}</span>
                    </label>
                {/each}
            </div>
            <span class="recipient-hint">
                {targetIds.length === 0
                    ? game.i18n.localize("DH2E.Vox.AllPlayers")
                    : game.i18n.localize("DH2E.Vox.Targeted")}
            </span>
        </div>
    {/if}

    <button class="transmit-btn" disabled={!canSend} onclick={doSend}>
        {game.i18n.localize("DH2E.Vox.Transmit")}
    </button>
</div>

<style lang="scss">
    .vox-compose-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
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

    input[type="text"],
    textarea,
    select {
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

    textarea {
        resize: vertical;
        min-height: 10rem;
        font-family: inherit;
    }

    .transmit-btn {
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

    /* Recipients styles */
    .recipients-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .recipient-check {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;

        input[type="checkbox"] {
            accent-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .recipient-hint {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    /* Item picker styles */
    .picker-section {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .picker-toggle {
        padding: 4px 10px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.04em;

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-text-primary, #d0cfc8);
        }

        i { margin-right: 4px; }
    }

    .loaded-indicator {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: #5a5;
        animation: fade-in 0.2s ease;

        i { margin-right: 2px; }
    }

    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .picker-panel {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #0d0d12);
        padding: var(--dh2e-space-xs, 0.25rem);
    }

    .picker-search {
        padding: 4px 8px;
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

    .picker-list {
        max-height: 240px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .picker-empty {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        padding: var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        margin: 0;
    }

    .picker-group {
        display: flex;
        flex-direction: column;
    }

    .group-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        width: 100%;
        padding: 4px 6px;
        border: none;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        text-align: left;
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;

        &:hover { background: var(--dh2e-bg-dark, #1a1a1f); }

        i {
            font-size: 0.55rem;
            width: 10px;
            text-align: center;
        }
    }

    .group-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .group-count {
        font-size: 0.55rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        flex-shrink: 0;
    }

    .group-items {
        display: flex;
        flex-direction: column;
    }

    .item-pick-btn {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        width: 100%;
        padding: 3px 6px;
        border: none;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        background: transparent;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        text-align: left;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:last-child { border-bottom: none; }
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
    }

    .item-pick-icon {
        width: 20px;
        height: 20px;
        border-radius: 2px;
        object-fit: cover;
        flex-shrink: 0;
    }

    .item-pick-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-pick-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        flex-shrink: 0;
    }
</style>
