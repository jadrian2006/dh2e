<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    let mode = $state<"create" | "compendium">("create");
    let target = $state("warband");
    let title = $state("");
    let description = $state("");
    let compendiumUuid = $state("");
    let search = $state("");

    const filteredCompendium = $derived(
        (ctx.compendiumObjectives ?? []).filter((o: any) =>
            o.name.toLowerCase().includes(search.toLowerCase())
        )
    );

    function submit() {
        ctx.submit?.({
            mode,
            target,
            title,
            description,
            compendiumUuid,
        });
    }
</script>

<div class="assign-dialog">
    <!-- Tab selector -->
    <div class="mode-tabs">
        <button class="mode-tab" class:active={mode === "create"} onclick={() => mode = "create"}>
            <i class="fa-solid fa-pen"></i> Create New
        </button>
        <button class="mode-tab" class:active={mode === "compendium"} onclick={() => mode = "compendium"}>
            <i class="fa-solid fa-book"></i> From Compendium
        </button>
    </div>

    <!-- Target selector -->
    <div class="field-row">
        <label class="field-label">Assign To</label>
        <select class="field-input" bind:value={target}>
            {#each ctx.targets ?? [] as t (t.id)}
                <option value={t.id}>{t.label}</option>
            {/each}
        </select>
    </div>

    {#if mode === "create"}
        <!-- Create new objective -->
        <div class="field-row">
            <label class="field-label">Title</label>
            <input type="text" class="field-input" bind:value={title} placeholder="Objective title..." />
        </div>
        <div class="field-row">
            <label class="field-label">Description</label>
            <textarea class="field-input textarea" bind:value={description} placeholder="Describe the objective..." rows="4"></textarea>
        </div>
    {:else}
        <!-- Compendium browser -->
        <div class="field-row">
            <label class="field-label">Search</label>
            <input type="text" class="field-input" bind:value={search} placeholder="Search compendium objectives..." />
        </div>
        <div class="compendium-list">
            {#if filteredCompendium.length === 0}
                <p class="empty">No objectives found in compendium packs.</p>
            {:else}
                {#each filteredCompendium as obj (obj.uuid)}
                    <button
                        class="compendium-item"
                        class:selected={compendiumUuid === obj.uuid}
                        onclick={() => compendiumUuid = obj.uuid}
                    >
                        <img src={obj.img} alt="" class="item-icon" />
                        <span class="item-name">{obj.name}</span>
                    </button>
                {/each}
            {/if}
        </div>
    {/if}

    <!-- Actions -->
    <div class="dialog-actions">
        <button class="btn cancel" onclick={ctx.close}>Cancel</button>
        <button
            class="btn submit"
            onclick={submit}
            disabled={mode === "create" ? !title.trim() : !compendiumUuid}
        >
            <i class="fa-solid fa-scroll"></i> Assign
        </button>
    </div>
</div>

<style lang="scss">
    .assign-dialog {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark);
        padding: var(--dh2e-space-md);
        gap: var(--dh2e-space-sm);
    }
    .mode-tabs {
        display: flex;
        gap: 2px;
        border-bottom: 1px solid var(--dh2e-border);
        padding-bottom: var(--dh2e-space-xs);
    }
    .mode-tab {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid var(--dh2e-border);
        border-bottom: none;
        border-radius: 4px 4px 0 0;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        font-size: 0.75rem;
        transition: all 0.15s;

        &.active {
            background: var(--dh2e-bg-darkest);
            color: var(--dh2e-gold);
            border-color: var(--dh2e-gold-dark);
        }
        i { margin-right: 4px; }
    }
    .field-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .field-label {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .field-input {
        font-size: 0.8rem;
        padding: 4px 8px;
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-text-primary);

        &.textarea {
            resize: vertical;
            min-height: 60px;
        }
    }
    .compendium-list {
        flex: 1;
        overflow-y: auto;
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        background: var(--dh2e-bg-mid);
    }
    .compendium-item {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
        width: 100%;
        padding: 4px 8px;
        border: none;
        border-bottom: 1px solid var(--dh2e-border);
        background: transparent;
        color: var(--dh2e-text-primary);
        cursor: pointer;
        text-align: left;
        font-size: 0.8rem;
        transition: background 0.1s;

        &:hover { background: var(--dh2e-bg-darkest); }
        &.selected { background: var(--dh2e-gold-dark); color: var(--dh2e-bg-darkest); }
    }
    .item-icon {
        width: 24px;
        height: 24px;
        border-radius: 2px;
        object-fit: cover;
    }
    .empty {
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        padding: var(--dh2e-space-md);
        font-size: 0.75rem;
    }
    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--dh2e-space-sm);
        padding-top: var(--dh2e-space-sm);
        border-top: 1px solid var(--dh2e-border);
    }
    .btn {
        padding: 6px 16px;
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s;

        &.cancel {
            background: var(--dh2e-bg-mid);
            color: var(--dh2e-text-secondary);
        }
        &.submit {
            background: var(--dh2e-gold-dark);
            color: var(--dh2e-bg-darkest);
            border-color: var(--dh2e-gold);
            font-weight: 600;

            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            &:not(:disabled):hover {
                background: var(--dh2e-gold);
            }
        }
        i { margin-right: 4px; }
    }
</style>
