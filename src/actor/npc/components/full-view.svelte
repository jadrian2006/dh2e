<script lang="ts">
    import CharCell from "../../acolyte/components/char-grid.svelte";
    import TabGroup from "../../../sheet/components/tab-group.svelte";
    import WeaponRow from "../../acolyte/components/weapon-row.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import type { CharacteristicAbbrev } from "../../../actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    // Read initial tab from sheet class (persists across remounts)
    let activeTab = $state(ctx.activeTab ?? "summary");

    // Sync tab changes back to the sheet class so they persist across re-renders
    $effect(() => {
        ctx.setActiveTab?.(activeTab);
    });

    const tabs = [
        { id: "summary", label: "Summary", icon: "fa-solid fa-id-card" },
        { id: "combat", label: "Combat", icon: "fa-solid fa-crosshairs" },
        { id: "skills", label: "Skills", icon: "fa-solid fa-book" },
        { id: "talents", label: "Talents", icon: "fa-solid fa-star" },
        { id: "traits", label: "Traits", icon: "fa-solid fa-paw" },
        { id: "powers", label: "Powers", icon: "fa-solid fa-hat-wizard" },
        { id: "notes", label: "Notes", icon: "fa-solid fa-pen-fancy" },
    ];

    const charKeys: { key: string; abbrev: string; label: string }[] = [
        { key: "ws",  abbrev: "WS",  label: "Weapon Skill" },
        { key: "bs",  abbrev: "BS",  label: "Ballistic Skill" },
        { key: "s",   abbrev: "S",   label: "Strength" },
        { key: "t",   abbrev: "T",   label: "Toughness" },
        { key: "ag",  abbrev: "Ag",  label: "Agility" },
        { key: "int", abbrev: "Int", label: "Intelligence" },
        { key: "per", abbrev: "Per", label: "Perception" },
        { key: "wp",  abbrev: "WP",  label: "Willpower" },
        { key: "fel", abbrev: "Fel", label: "Fellowship" },
    ];

    function getChar(key: string) {
        const char = ctx.system?.characteristics?.[key];
        return {
            value: char?.value ?? char?.base ?? 0,
            bonus: char?.bonus ?? Math.floor((char?.value ?? char?.base ?? 0) / 10),
        };
    }

    function onCharClick(key: string, shiftKey = false) {
        const actor = ctx.actor;
        if (!actor) return;
        const info = charKeys.find((c) => c.key === key)!;
        const char = getChar(key);
        CheckDH2e.roll({
            actor,
            characteristic: key as CharacteristicAbbrev,
            baseTarget: char.value,
            label: `${info.label} Test`,
            domain: `characteristic:${key}`,
            skipDialog: CheckDH2e.shouldSkipDialog(shiftKey),
        });
    }

    function editItem(item: any) {
        item.sheet?.render(true);
    }

    async function deleteItem(item: any) {
        await item.delete();
    }

    /** Show rich tooltip for an item's description */
    function showDescription(event: MouseEvent, item: any) {
        const desc = item.system?.description;
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:320px"><strong>${item.name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }

    /** Toggle favorite flag on an item */
    function toggleFavorite(item: any) {
        const current = item.getFlag?.("dh2e", "favorite");
        if (current) item.unsetFlag("dh2e", "favorite");
        else item.setFlag("dh2e", "favorite", true);
    }

    function isFavorite(item: any): boolean {
        return !!item.getFlag?.("dh2e", "favorite");
    }

    /** All favorited items for the summary tab */
    const favorites = $derived(
        [...(ctx.items?.weapons ?? []),
         ...(ctx.items?.talents ?? []),
         ...(ctx.items?.traits ?? []),
         ...(ctx.items?.powers ?? []),
         ...(ctx.items?.skills ?? []),
         ...(ctx.items?.gear ?? []),
         ...(ctx.items?.cybernetics ?? []),
        ].filter((i: any) => i.getFlag?.("dh2e", "favorite")),
    );

    /** Strip HTML for a plain text excerpt */
    function stripHtml(html: string, max = 120): string {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const text = tmp.textContent ?? tmp.innerText ?? "";
        return text.length > max ? text.slice(0, max) + "..." : text;
    }
</script>

<div class="npc-full-view">
    <div class="char-grid">
        {#each charKeys as { key, abbrev, label }}
            {@const c = getChar(key)}
            <CharCell
                abbreviation={abbrev}
                {label}
                value={c.value}
                bonus={c.bonus}
                onclick={(e) => onCharClick(key, e.shiftKey)}
            />
        {/each}
    </div>

    <div class="resource-bar">
        <div class="resource">
            <span class="res-label">Wounds</span>
            <span class="res-value">{ctx.system?.wounds?.value ?? 0}/{ctx.system?.wounds?.max ?? 0}</span>
        </div>
        <div class="resource">
            <span class="res-label">Armour</span>
            <span class="res-value">H:{ctx.system?.armour?.head ?? 0} B:{ctx.system?.armour?.body ?? 0} A:{ctx.system?.armour?.rightArm ?? 0}/{ctx.system?.armour?.leftArm ?? 0} L:{ctx.system?.armour?.rightLeg ?? 0}/{ctx.system?.armour?.leftLeg ?? 0}</span>
        </div>
    </div>

    {#if (ctx.items?.conditions ?? []).length > 0}
        <div class="condition-strip">
            {#each ctx.items.conditions as cond}
                <span class="condition-tag" title={cond.name}>{cond.name}</span>
            {/each}
        </div>
    {/if}

    <TabGroup {tabs} bind:activeTab>
        {#if activeTab === "summary"}
            <div class="tab-content summary-tab">
                {#if favorites.length > 0}
                    <h4><i class="fa-solid fa-star"></i> Favorites</h4>
                    {#each favorites as item}
                        <div class="item-row clickable" onclick={() => editItem(item)} onmouseenter={(e) => showDescription(e, item)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") editItem(item); }}>
                            <span class="item-icon"><i class={item.type === "weapon" ? "fa-solid fa-crosshairs" : item.type === "trait" ? "fa-solid fa-paw" : item.type === "power" ? "fa-solid fa-hat-wizard" : item.type === "skill" ? "fa-solid fa-book" : "fa-solid fa-star"}></i></span>
                            <span class="item-name">{item.name}</span>
                            {#if item.system?.description}
                                <span class="item-excerpt">{stripHtml(item.system.description)}</span>
                            {/if}
                        </div>
                    {/each}
                {:else}
                    <p class="empty-msg fav-hint"><i class="fa-regular fa-star"></i> Star items on other tabs to pin them here.</p>
                {/if}

                {#if (ctx.items?.traits ?? []).length > 0}
                    <h4><i class="fa-solid fa-paw"></i> Traits</h4>
                    <div class="trait-pills">
                        {#each ctx.items.traits as trait}
                            <button class="trait-pill" type="button" onclick={() => editItem(trait)} onmouseenter={(e) => showDescription(e, trait)}>
                                {trait.name}{#if trait.system?.hasRating}({trait.system.rating}){/if}
                            </button>
                        {/each}
                    </div>
                {/if}

                {#if (ctx.items?.talents ?? []).length > 0}
                    <h4><i class="fa-solid fa-star"></i> Talents</h4>
                    {#each ctx.items.talents as talent}
                        <div class="item-row clickable" onclick={() => editItem(talent)} onmouseenter={(e) => showDescription(e, talent)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") editItem(talent); }}>
                            <span class="item-name">{talent.name}</span>
                            {#if talent.system?.description}
                                <span class="item-excerpt">{stripHtml(talent.system.description, 80)}</span>
                            {/if}
                        </div>
                    {/each}
                {/if}

                {#if ctx.system?.details?.notes}
                    <h4><i class="fa-solid fa-pen-fancy"></i> Notes</h4>
                    <p class="notes-excerpt">{ctx.system.details.notes}</p>
                {/if}
            </div>
        {:else if activeTab === "combat"}
            <div class="tab-content">
                <h4>Weapons</h4>
                {#each ctx.items?.weapons ?? [] as weapon}
                    <WeaponRow {weapon} actor={ctx.actor} />
                    {#if ctx.editable}
                        <div class="weapon-manage">
                            <button class="fav-btn" onclick={() => toggleFavorite(weapon)} title="Favorite"><i class={isFavorite(weapon) ? "fa-solid fa-star" : "fa-regular fa-star"}></i></button>
                            <button class="icon-btn" onclick={() => editItem(weapon)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="icon-btn delete" onclick={() => deleteItem(weapon)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    {/if}
                {/each}
                <h4>Armour</h4>
                {#each ctx.items?.armour ?? [] as arm}
                    <div class="item-row">
                        <span class="item-name">{arm.name}</span>
                        <span class="item-detail">{arm.system?.equipped ? "Equipped" : "Unequipped"}</span>
                        {#if ctx.editable}
                            <button class="icon-btn" onclick={() => editItem(arm)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else if activeTab === "skills"}
            <div class="tab-content">
                {#each ctx.items?.skills ?? [] as skill}
                    <div class="item-row clickable" onmouseenter={(e) => showDescription(e, skill)} role="button" tabindex="0" onclick={() => editItem(skill)} onkeydown={(e) => { if (e.key === "Enter") editItem(skill); }}>
                        <span class="item-name">{skill.name}</span>
                        <span class="item-detail">+{(skill.system?.advancement ?? 0) * 10}</span>
                        {#if ctx.editable}
                            <button class="fav-btn" onclick={(e) => { e.stopPropagation(); toggleFavorite(skill); }} title="Favorite"><i class={isFavorite(skill) ? "fa-solid fa-star" : "fa-regular fa-star"}></i></button>
                            <button class="icon-btn" onclick={(e) => { e.stopPropagation(); editItem(skill); }} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No skills.</p>
                {/each}
            </div>
        {:else if activeTab === "talents"}
            <div class="tab-content">
                {#each ctx.items?.talents ?? [] as talent}
                    <div class="item-row clickable" onmouseenter={(e) => showDescription(e, talent)} role="button" tabindex="0" onclick={() => editItem(talent)} onkeydown={(e) => { if (e.key === "Enter") editItem(talent); }}>
                        <span class="item-name">{talent.name}</span>
                        <span class="item-detail">Tier {talent.system?.tier ?? 1}</span>
                        {#if ctx.editable}
                            <button class="fav-btn" onclick={(e) => { e.stopPropagation(); toggleFavorite(talent); }} title="Favorite"><i class={isFavorite(talent) ? "fa-solid fa-star" : "fa-regular fa-star"}></i></button>
                            <button class="icon-btn" onclick={(e) => { e.stopPropagation(); editItem(talent); }} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No talents.</p>
                {/each}
            </div>
        {:else if activeTab === "traits"}
            <div class="tab-content traits-tab">
                {#if (ctx.items?.traits ?? []).length > 0}
                    <div class="trait-pills">
                        {#each ctx.items.traits as trait}
                            <button class="trait-pill" type="button" onclick={() => editItem(trait)} onmouseenter={(e) => showDescription(e, trait)}>
                                {trait.name}{#if trait.system?.hasRating} ({trait.system.rating}){/if}
                                {#if ctx.editable}
                                    <span class="pill-delete" onclick={(e) => { e.stopPropagation(); deleteItem(trait); }} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") { e.stopPropagation(); deleteItem(trait); } }} title="Remove"><i class="fa-solid fa-xmark"></i></span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {:else}
                    <p class="empty-msg">No traits. Drag traits from the compendium to add.</p>
                {/if}
            </div>
        {:else if activeTab === "powers"}
            <div class="tab-content">
                {#each ctx.items?.powers ?? [] as power}
                    <div class="item-row clickable" onmouseenter={(e) => showDescription(e, power)} role="button" tabindex="0" onclick={() => editItem(power)} onkeydown={(e) => { if (e.key === "Enter") editItem(power); }}>
                        <span class="item-name">{power.name}</span>
                        <span class="item-detail">{power.system?.discipline ?? ""}</span>
                        {#if ctx.editable}
                            <button class="fav-btn" onclick={(e) => { e.stopPropagation(); toggleFavorite(power); }} title="Favorite"><i class={isFavorite(power) ? "fa-solid fa-star" : "fa-regular fa-star"}></i></button>
                            <button class="icon-btn" onclick={(e) => { e.stopPropagation(); editItem(power); }} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No psychic powers.</p>
                {/each}
            </div>
        {:else if activeTab === "notes"}
            <div class="tab-content notes-tab">
                <h4><i class="fa-solid fa-pen-fancy"></i> Notes</h4>
                {#if ctx.editable}
                    <textarea class="notes-edit"
                        value={ctx.system?.details?.notes ?? ""}
                        placeholder="Add notes about this NPC..."
                        onchange={(e) => ctx.actor?.update({ "system.details.notes": (e.target as HTMLTextAreaElement).value })}
                    ></textarea>
                {:else}
                    <p class="notes-text">{ctx.system?.details?.notes || "No notes."}</p>
                {/if}

                {#if ctx.isGM}
                    <h4><i class="fa-solid fa-eye-slash"></i> GM Notes</h4>
                    {#if ctx.editable}
                        <textarea class="notes-edit gm-notes"
                            value={ctx.system?.details?.gmNotes ?? ""}
                            placeholder="Private GM notes (not visible to players)..."
                            onchange={(e) => ctx.actor?.update({ "system.details.gmNotes": (e.target as HTMLTextAreaElement).value })}
                        ></textarea>
                    {:else}
                        <p class="notes-text gm-notes-text">{ctx.system?.details?.gmNotes || "No GM notes."}</p>
                    {/if}
                {/if}
            </div>
        {/if}
    </TabGroup>
</div>

<style lang="scss">
    .npc-full-view {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        flex: 1;
        overflow-y: auto;
    }

    .char-grid {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        gap: 2px;
    }

    .resource-bar {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
        justify-content: center;
        flex-wrap: wrap;
    }

    .resource {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        background: var(--dh2e-bg-light, #3a3a45);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .res-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .res-value {
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .condition-strip {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
        justify-content: center;
    }

    .condition-tag {
        font-size: 0.65rem;
        padding: 1px 6px;
        background: var(--dh2e-red-dim, #4a2020);
        border-radius: 3px;
        color: var(--dh2e-red-bright, #d44);
    }

    .tab-content {
        padding: var(--dh2e-space-sm, 0.5rem);

        h4 {
            font-family: var(--dh2e-font-header, serif);
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-gold, #b49545);
            margin: var(--dh2e-space-sm, 0.5rem) 0 var(--dh2e-space-xs, 0.25rem);
            border-bottom: 1px solid var(--dh2e-gold-muted, #7a6a3e);
            padding-bottom: 2px;
        }
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }

        &.clickable {
            cursor: pointer;

            &:hover .item-name {
                color: var(--dh2e-gold, #c8a84e);
            }
        }
    }

    .item-icon {
        width: 1rem;
        text-align: center;
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        flex-shrink: 0;
    }

    .item-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        transition: color 0.15s;
    }

    .item-detail {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
    }

    .item-excerpt {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 40%;
        flex-shrink: 1;
    }

    .weapon-manage {
        display: flex;
        justify-content: flex-end;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 0 var(--dh2e-space-sm, 0.5rem);
    }

    .fav-btn {
        width: 1.2rem;
        height: 1.2rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
        }

        .fa-solid {
            color: var(--dh2e-gold, #c8a84e);
        }
    }

    .icon-btn {
        width: 1.2rem;
        height: 1.2rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
        &.delete:hover { color: var(--dh2e-red-bright, #d44); }
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .fav-hint {
        font-size: 0.7rem;
    }

    .summary-tab .notes-excerpt {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: pre-wrap;
        font-style: italic;
    }

    /* Trait pills */
    .trait-pills {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .trait-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-text-primary, #d0cfc8);
        background: var(--dh2e-bg-light, #3a3a45);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 12px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }

    .pill-delete {
        font-size: 0.55rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-left: 2px;
        cursor: pointer;

        &:hover {
            color: var(--dh2e-red-bright, #d44);
        }
    }

    /* Notes tab */
    .notes-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: pre-wrap;
    }

    .notes-edit {
        width: 100%;
        min-height: 5rem;
        padding: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-family: inherit;
        color: var(--dh2e-text-primary, #d0cfc8);
        background: var(--dh2e-bg-dark, #1a1a22);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        resize: vertical;
        outline: none;
        white-space: pre-wrap;

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
        }

        &.gm-notes {
            border-color: var(--dh2e-gold-muted, #7a6a3e);
            background: rgba(180, 149, 69, 0.05);
        }
    }

    .gm-notes-text {
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-style: italic;
    }

    /* Allow text selection in read-only content (overrides Foundry's default user-select: none) */
    .tab-content {
        user-select: text;
    }
</style>
