<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    interface ContentCategory {
        icon: string;
        label: string;
        count: number;
        field: string;
    }

    // Per-category import toggles (all on by default)
    let categoryChecks: Record<string, boolean> = $state(
        Object.fromEntries((ctx.contents as ContentCategory[]).map(c => [c.field, true])),
    );

    let importing = $state(false);
    let importResult: { created: number; updated: number } | null = $state(null);

    const allChecked = $derived(Object.values(categoryChecks).every(Boolean));
    const noneChecked = $derived(Object.values(categoryChecks).every(v => !v));
    const checkedCount = $derived(Object.values(categoryChecks).filter(Boolean).length);

    function toggleAll() {
        const newVal = !allChecked;
        for (const key of Object.keys(categoryChecks)) {
            categoryChecks[key] = newVal;
        }
    }

    async function doImport() {
        if (importing || noneChecked) return;
        importing = true;
        importResult = null;
        try {
            const importFields = Object.entries(categoryChecks)
                .filter(([_, checked]) => checked)
                .map(([field]) => field);
            const result = await ctx.performImport?.(importFields);
            if (result) importResult = result;
        } finally {
            importing = false;
        }
    }
</script>

<div class="adventure-importer">
    <!-- Header with image and title -->
    <div class="adv-header">
        {#if ctx.img}
            <img class="adv-image" src={ctx.img} alt={ctx.name} />
        {/if}
        <div class="adv-info">
            <h2 class="adv-title">{ctx.name}</h2>
            {#if ctx.caption}
                <p class="adv-caption">{@html ctx.caption}</p>
            {/if}
        </div>
    </div>

    <!-- Description -->
    {#if ctx.description}
        <div class="adv-description">
            {@html ctx.description}
        </div>
    {/if}

    <!-- Content manifest -->
    <div class="contents-section">
        <div class="contents-header">
            <label class="select-all-label">
                <input type="checkbox" checked={allChecked} onchange={toggleAll} />
                <span>{game.i18n?.localize("DH2E.Adventure.SelectAll") ?? "Select All"}</span>
            </label>
            <span class="contents-count">{checkedCount}/{(ctx.contents as ContentCategory[]).length}</span>
        </div>
        <div class="contents-list">
            {#each ctx.contents as category (category.field)}
                <label class="content-row" class:unchecked={!categoryChecks[category.field]}>
                    <input type="checkbox" bind:checked={categoryChecks[category.field]} />
                    <i class={category.icon}></i>
                    <span class="content-label">{category.label}</span>
                    <span class="content-count">{category.count}</span>
                </label>
            {/each}
        </div>
    </div>

    <!-- Import result -->
    {#if importResult}
        <div class="import-result">
            <i class="fa-solid fa-check"></i>
            {importResult.created} created, {importResult.updated} updated
        </div>
    {/if}

    <!-- Actions -->
    {#if ctx.isGM}
        <div class="button-row">
            <button class="import-btn" onclick={doImport} disabled={importing || noneChecked}>
                {#if importing}
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    {game.i18n?.localize("DH2E.Adventure.Importing") ?? "Importing..."}
                {:else}
                    <i class="fa-solid fa-file-import"></i>
                    {game.i18n?.localize("DH2E.Adventure.Import") ?? "Import Adventure"}
                {/if}
            </button>
        </div>
    {:else}
        <p class="gm-only">{game.i18n?.localize("DH2E.Adventure.GMOnly") ?? "Only the GM can import adventures."}</p>
    {/if}
</div>

<style lang="scss">
    .adventure-importer {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .adv-header {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        align-items: flex-start;
    }

    .adv-image {
        width: 120px;
        height: auto;
        border-radius: var(--dh2e-radius-sm, 3px);
        border: 2px solid var(--dh2e-gold-dark, #9c7a28);
        flex-shrink: 0;
    }

    .adv-info {
        flex: 1;
        min-width: 0;
    }

    .adv-title {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: 1.3rem;
        color: var(--dh2e-gold, #c8a84e);
        line-height: 1.2;
    }

    .adv-caption {
        margin: var(--dh2e-space-xs, 0.25rem) 0 0;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .adv-description {
        background: var(--dh2e-bg-mid, #2e2e35);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        border-left: 3px solid var(--dh2e-gold-dark, #9c7a28);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        max-height: 12rem;
        overflow-y: auto;
        line-height: 1.5;
    }

    .contents-section {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .contents-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .select-all-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .contents-count {
        font-size: 0.7rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
    }

    .contents-list {
        max-height: 16rem;
        overflow-y: auto;
    }

    .content-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:last-child { border-bottom: none; }
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.unchecked { opacity: 0.45; }

        i {
            width: 1.2rem;
            text-align: center;
            color: var(--dh2e-gold-muted, #7a6a3e);
            font-size: 0.75rem;
        }
    }

    .content-label {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .content-count {
        font-weight: 600;
        color: var(--dh2e-gold, #c8a84e);
        min-width: 1.5rem;
        text-align: right;
    }

    .import-result {
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: #6c6;
        padding: var(--dh2e-space-xs, 0.25rem);

        i { margin-right: 4px; }
    }

    .button-row {
        display: flex;
    }

    .import-btn {
        flex: 1;
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
        font-size: var(--dh2e-text-sm, 0.8rem);

        i { margin-right: 4px; }
        &:hover { background: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .gm-only {
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }
</style>
