<script lang="ts">
    import type { LootSection } from "../actor/loot/data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const sections: LootSection[] = $derived(ctx.sections ?? []);
    const dos = $derived(ctx.dos ?? 0);

    /** Per-section selected item indices */
    let selectedMap: Record<string, Record<number, boolean>> = $state({});

    function toggleItem(sectionId: string, idx: number, checked: boolean) {
        if (!selectedMap[sectionId]) selectedMap[sectionId] = {};
        selectedMap[sectionId][idx] = checked;
    }

    function claimSection(sectionId: string) {
        const sel = selectedMap[sectionId] ?? {};
        const indices = Object.entries(sel).filter(([, v]) => v).map(([k]) => Number(k));
        if (indices.length === 0) return;
        ctx.onClaim?.(sectionId, indices);
    }

    function selectAllInSection(sectionId: string, section: LootSection) {
        const sel: Record<number, boolean> = {};
        for (let i = 0; i < section.items.length; i++) {
            if (!section.items[i].claimed) sel[i] = true;
        }
        selectedMap[sectionId] = sel;
    }

    function countSelected(sectionId: string): number {
        const sel = selectedMap[sectionId] ?? {};
        return Object.values(sel).filter(Boolean).length;
    }

    function craftColor(tier: string): string {
        switch (tier) {
            case "poor": return "var(--dh2e-danger, #c0392b)";
            case "good": return "var(--dh2e-info, #5dade2)";
            case "best": return "var(--dh2e-gold, #c8a84e)";
            default: return "var(--dh2e-text-secondary, #a0a0a8)";
        }
    }
</script>

<div class="salvage-loot-dialog">
    <div class="header-info">
        <span class="dos-badge">{dos} DoS</span>
        <span class="sections-count">{sections.length} section(s) unlocked</span>
    </div>

    {#if sections.length === 0}
        <p class="no-items">{game.i18n.localize("DH2E.Loot.NoItems")}</p>
    {:else}
        {#each sections as section (section.id)}
            <div class="section">
                <div class="section-header">
                    <span class="section-label">{section.label}</span>
                    <span class="section-dos">DoS {section.dosRequired}+</span>
                    <button class="link-btn" onclick={() => selectAllInSection(section.id, section)}>All</button>
                </div>
                <div class="section-items">
                    {#each section.items as entry, idx (idx)}
                        <label class="item-row" class:claimed={entry.claimed}>
                            {#if !entry.claimed}
                                <input
                                    type="checkbox"
                                    checked={selectedMap[section.id]?.[idx] ?? false}
                                    onchange={(e) => toggleItem(section.id, idx, e.currentTarget.checked)}
                                />
                            {:else}
                                <span class="claimed-check"><i class="fa-solid fa-check"></i></span>
                            {/if}
                            <img class="item-icon" src={entry.itemData.img ?? "icons/svg/item-bag.svg"} alt="" />
                            <span class="item-name">{entry.itemData.name ?? "Unknown"}</span>
                            {#if entry.quantity > 1}
                                <span class="item-qty">x{entry.quantity}</span>
                            {/if}
                            {#if entry.itemData.system && (entry.itemData.system as any).craftsmanship}
                                <span class="craft-badge" style="color: {craftColor((entry.itemData.system as any).craftsmanship)}">
                                    {(entry.itemData.system as any).craftsmanship}
                                </span>
                            {/if}
                            {#if entry.claimed}
                                <span class="claimed-tag">{entry.claimedBy ?? game.i18n.localize("DH2E.Loot.Claimed")}</span>
                            {/if}
                        </label>
                    {/each}
                </div>
                <button
                    class="claim-btn"
                    disabled={countSelected(section.id) === 0}
                    onclick={() => claimSection(section.id)}
                >
                    {game.i18n.localize("DH2E.Loot.Claim")} ({countSelected(section.id)})
                </button>
            </div>
        {/each}
    {/if}
</div>

<style lang="scss">
    .salvage-loot-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .dos-badge {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        background: rgba(200, 168, 78, 0.1);
        padding: 2px 8px;
        border-radius: var(--dh2e-radius-sm, 3px);
        border: 1px solid var(--dh2e-gold, #c8a84e);
    }

    .sections-count {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .no-items {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .section {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .section-label {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .section-dos {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 600;
    }

    .link-btn {
        background: none;
        border: none;
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-decoration: underline;
        padding: 0;
    }

    .section-items {
        padding: var(--dh2e-space-xs, 0.25rem);
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        &.claimed {
            opacity: 0.5;
            cursor: default;
        }
    }

    .claimed-check {
        width: 16px;
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.65rem;
    }

    .item-icon {
        width: 18px;
        height: 18px;
        border: none;
    }

    .item-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .item-qty {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .craft-badge {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        text-transform: capitalize;
    }

    .claimed-tag {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .claim-btn {
        margin: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #0d0d12);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
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
