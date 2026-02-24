<script lang="ts">
    import CharCell from "../../acolyte/components/char-grid.svelte";
    import TabGroup from "../../../sheet/components/tab-group.svelte";
    import WeaponRow from "../../acolyte/components/weapon-row.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import type { CharacteristicAbbrev } from "../../../actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let activeTab = $state("combat");

    const tabs = [
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
        {#if activeTab === "combat"}
            <div class="tab-content">
                <h4>Weapons</h4>
                {#each ctx.items?.weapons ?? [] as weapon}
                    <WeaponRow {weapon} actor={ctx.actor} />
                    {#if ctx.editable}
                        <div class="weapon-manage">
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
                    <div class="item-row">
                        <span class="item-name">{skill.name}</span>
                        <span class="item-detail">+{(skill.system?.advancement ?? 0) * 10}</span>
                        {#if ctx.editable}
                            <button class="icon-btn" onclick={() => editItem(skill)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No skills.</p>
                {/each}
            </div>
        {:else if activeTab === "talents"}
            <div class="tab-content">
                {#each ctx.items?.talents ?? [] as talent}
                    <div class="item-row">
                        <span class="item-name">{talent.name}</span>
                        <span class="item-detail">Tier {talent.system?.tier ?? 1}</span>
                        {#if ctx.editable}
                            <button class="icon-btn" onclick={() => editItem(talent)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No talents.</p>
                {/each}
            </div>
        {:else if activeTab === "traits"}
            <div class="tab-content">
                {#each ctx.items?.traits ?? [] as trait}
                    <div class="item-row">
                        <span class="item-name">{trait.name}{#if trait.system?.hasRating} ({trait.system.rating}){/if}</span>
                        <span class="item-detail">{trait.system?.category ?? ""}</span>
                        {#if ctx.editable}
                            <button class="icon-btn" onclick={() => editItem(trait)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="icon-btn delete" onclick={() => deleteItem(trait)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No traits.</p>
                {/each}
            </div>
        {:else if activeTab === "powers"}
            <div class="tab-content">
                {#each ctx.items?.powers ?? [] as power}
                    <div class="item-row">
                        <span class="item-name">{power.name}</span>
                        <span class="item-detail">{power.system?.discipline ?? ""}</span>
                        {#if ctx.editable}
                            <button class="icon-btn" onclick={() => editItem(power)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        {/if}
                    </div>
                {:else}
                    <p class="empty-msg">No psychic powers.</p>
                {/each}
            </div>
        {:else if activeTab === "notes"}
            <div class="tab-content notes-tab">
                <p>{ctx.system?.details?.notes ?? "No notes."}</p>
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
    }

    .item-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .item-detail {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
    }

    .weapon-manage {
        display: flex;
        justify-content: flex-end;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 0 var(--dh2e-space-sm, 0.5rem);
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

    .notes-tab p {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: pre-wrap;
    }
</style>
