<script lang="ts">
    import type { LootSection } from "./data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const system = $derived(ctx.system);
    const sections: LootSection[] = $derived(system?.sections ?? []);
    const editable = $derived(ctx.editable ?? false);

    let newSectionLabel = $state("");
    let newSectionDoS = $state(0);

    function addSection() {
        if (!newSectionLabel.trim()) return;
        ctx.onAddSection?.(newSectionLabel.trim(), newSectionDoS);
        newSectionLabel = "";
        newSectionDoS = 0;
    }

    function removeSection(sectionId: string) {
        ctx.onRemoveSection?.(sectionId);
    }

    function removeItem(sectionId: string, idx: number) {
        ctx.onRemoveItem?.(sectionId, idx);
    }

    function resetSearched() {
        ctx.onResetSearched?.();
    }

    const skillChoices = [
        { value: "awareness", label: "Awareness" },
        { value: "scrutiny", label: "Scrutiny" },
        { value: "inquiry", label: "Inquiry" },
    ];

    function craftColor(tier: string): string {
        switch (tier) {
            case "poor": return "var(--dh2e-danger, #c0392b)";
            case "good": return "var(--dh2e-info, #5dade2)";
            case "best": return "var(--dh2e-gold, #c8a84e)";
            default: return "var(--dh2e-text-secondary, #a0a0a8)";
        }
    }
</script>

<div class="loot-sheet">
    <!-- Header -->
    <div class="loot-header">
        <img class="portrait" src={ctx.img} alt="" />
        <div class="header-fields">
            <input
                class="name-input"
                type="text"
                value={ctx.name}
                disabled={!editable}
                onchange={(e) => ctx.actor?.update({ name: e.currentTarget.value })}
            />
            <div class="header-row">
                <label class="field-label">{game.i18n.localize("DH2E.Loot.SalvageSkill")}</label>
                <select
                    value={system?.salvageSkill ?? "awareness"}
                    disabled={!editable}
                    onchange={(e) => ctx.actor?.update({ "system.salvageSkill": e.currentTarget.value })}
                >
                    {#each skillChoices as choice (choice.value)}
                        <option value={choice.value}>{choice.label}</option>
                    {/each}
                </select>
                <label class="field-label">{game.i18n.localize("DH2E.Loot.SalvageModifier")}</label>
                <input
                    type="number"
                    class="modifier-input"
                    value={system?.salvageModifier ?? 0}
                    disabled={!editable}
                    onchange={(e) => ctx.actor?.update({ "system.salvageModifier": Number(e.currentTarget.value) })}
                />
            </div>
            <div class="header-row">
                <span class="status-badge" class:searched={system?.searched}>
                    {system?.searched ? game.i18n.localize("DH2E.Loot.AlreadySearched") : "Not searched"}
                </span>
                {#if system?.searched && editable}
                    <button class="link-btn" onclick={resetSearched}>Reset</button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Sections -->
    <div class="sections">
        {#each sections as section, si (section.id)}
            <div class="section" data-section-id={section.id}>
                <div class="section-header">
                    <span class="section-label">{section.label}</span>
                    <span class="section-dos">DoS {section.dosRequired}+</span>
                    {#if editable}
                        <button class="icon-btn danger" onclick={() => removeSection(section.id)} title={game.i18n.localize("DH2E.Loot.RemoveSection")}>
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    {/if}
                </div>
                <div class="section-items" data-section-id={section.id}>
                    {#if section.items.length === 0}
                        <p class="drop-hint">Drag items from compendium here</p>
                    {:else}
                        {#each section.items as entry, idx (idx)}
                            <div class="item-row" class:claimed={entry.claimed}>
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
                                    <span class="claimed-tag">{game.i18n.localize("DH2E.Loot.Claimed")}</span>
                                {/if}
                                {#if editable && !entry.claimed}
                                    <button class="icon-btn danger" onclick={() => removeItem(section.id, idx)}>
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- Add section form -->
    {#if editable}
        <div class="add-section">
            <input
                type="text"
                placeholder={game.i18n.localize("DH2E.Loot.SectionLabel")}
                bind:value={newSectionLabel}
            />
            <label class="field-label">{game.i18n.localize("DH2E.Loot.DosRequired")}</label>
            <input type="number" class="dos-input" min="0" bind:value={newSectionDoS} />
            <button class="add-btn" onclick={addSection}>
                <i class="fa-solid fa-plus"></i>
                {game.i18n.localize("DH2E.Loot.AddSection")}
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .loot-sheet {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .loot-header {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        align-items: flex-start;
    }

    .portrait {
        width: 64px;
        height: 64px;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
    }

    .header-fields {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .name-input {
        font-family: var(--dh2e-font-header, serif);
        font-size: 1.1rem;
        font-weight: 700;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        color: var(--dh2e-text-primary, #d0cfc8);
        padding: 0 0 var(--dh2e-space-xxs, 0.125rem);

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
            outline: none;
        }
    }

    .header-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
    }

    select, .modifier-input, .dos-input {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .modifier-input {
        width: 50px;
    }

    .dos-input {
        width: 50px;
    }

    .status-badge {
        font-size: var(--dh2e-text-xs, 0.7rem);
        padding: 1px 6px;
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);

        &.searched {
            background: rgba(192, 57, 43, 0.2);
            color: var(--dh2e-danger, #c0392b);
        }
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

    .sections {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        flex: 1;
        overflow-y: auto;
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

    .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: 2px 4px;

        &:hover {
            color: var(--dh2e-text-primary, #d0cfc8);
        }

        &.danger:hover {
            color: var(--dh2e-danger, #c0392b);
        }
    }

    .section-items {
        padding: var(--dh2e-space-xs, 0.25rem);
        min-height: 32px;
    }

    .drop-hint {
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
        padding: var(--dh2e-space-xs, 0.25rem);
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        &.claimed {
            opacity: 0.5;
        }
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

    .add-section {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) 0;
        border-top: 1px solid var(--dh2e-border, #4a4a55);

        input[type="text"] {
            flex: 1;
            padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            font-size: var(--dh2e-text-sm, 0.8rem);
        }
    }

    .add-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        white-space: nowrap;

        &:hover {
            background: var(--dh2e-border, #4a4a55);
        }
    }
</style>
