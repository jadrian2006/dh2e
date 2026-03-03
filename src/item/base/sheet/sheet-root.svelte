<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";
    import { WEAPON_GROUPS } from "@item/weapon/data.ts";
    import { findInAllPacks, findInMultipleTypes } from "@util/pack-discovery.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const type = $derived(ctx.type ?? "gear");
    const hasRules = $derived(Array.isArray(sys.rules));

    /** Open a compendium item by type and name (async pack search) */
    async function openCompendiumItem(event: MouseEvent, itemType: string, itemName: string) {
        event.preventDefault();
        const typeMap: Record<string, string> = {
            skill: "skills", talent: "talents", weapon: "weapons",
            gear: "gear", armour: "armour", ammunition: "ammunition",
            cybernetic: "cybernetics",
        };
        const packType = typeMap[itemType];
        if (packType) {
            const doc = await findInAllPacks(packType as any, itemName);
            if (doc) {
                (doc as any).sheet?.render(true);
                return;
            }
        }
        // Equipment could be in multiple pack types
        if (!packType) {
            const doc = await findInMultipleTypes(["weapons", "armour", "gear", "ammunition", "cybernetics"], itemName);
            if (doc) {
                (doc as any).sheet?.render(true);
                return;
            }
        }
        ui.notifications?.info(`${itemName} — not found in compendium packs.`);
    }

    /** Show a tooltip on hover for grant links */
    function showItemTooltip(event: MouseEvent, itemType: string, itemName: string) {
        const el = event.currentTarget as HTMLElement;
        if ((game as any).tooltip) {
            const typeLabel = itemType.charAt(0).toUpperCase() + itemType.slice(1);
            (game as any).tooltip.activate(el, {
                html: `<div><strong>${itemName}</strong><br/><em>${typeLabel}</em></div>`,
                direction: "UP",
            });
        }
    }
</script>

<div class="item-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <div class="header-meta">
                <span class="item-type">{type}</span>
                {#if sys.source}
                    <span class="source-badge" data-source={sys.source}>
                        {game.i18n?.localize(`DH2E.Source.${sys.source}`) ?? sys.source}
                    </span>
                {/if}
            </div>
        </div>
    </header>

    <section class="sheet-body">
        {#if type === "talent"}
            <div class="talent-meta">
                <div class="meta-item">
                    <span class="meta-label">Tier</span>
                    <span class="meta-value tier-{sys.tier ?? 1}">{sys.tier ?? 1}</span>
                </div>
                {#if sys.aptitudes?.length}
                    <div class="meta-item">
                        <span class="meta-label">Aptitudes</span>
                        <span class="meta-value">{sys.aptitudes.join(", ")}</span>
                    </div>
                {/if}
                {#if sys.prerequisites}
                    <div class="meta-item">
                        <span class="meta-label">Prerequisites</span>
                        <span class="meta-value prereq">{sys.prerequisites}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "skill"}
            <div class="skill-meta">
                <div class="meta-item">
                    <span class="meta-label">Linked Characteristic</span>
                    <span class="meta-value char">{(sys.linkedCharacteristic ?? "—").toUpperCase()}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Advancement</span>
                    <span class="meta-value">{sys.advancement ?? 0}</span>
                </div>
                {#if sys.isSpecialist}
                    <div class="meta-item">
                        <span class="meta-label">Specialization</span>
                        <span class="meta-value">{sys.specialization || "—"}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "power"}
            <div class="power-meta">
                {#if sys.discipline}
                    <div class="meta-item">
                        <span class="meta-label">Discipline</span>
                        <span class="meta-value discipline">{sys.discipline}</span>
                    </div>
                {/if}
                <div class="meta-item">
                    <span class="meta-label">Action</span>
                    <span class="meta-value">{sys.action || "Half Action"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Focus Test</span>
                    <span class="meta-value char">{(sys.focusTest ?? "WP").toUpperCase()}{sys.focusModifier > 0 ? ` +${sys.focusModifier}` : sys.focusModifier < 0 ? ` ${sys.focusModifier}` : ""}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Range</span>
                    <span class="meta-value">{sys.range || "Self"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Sustained</span>
                    <span class="meta-value">{sys.sustained ? "Yes" : "No"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">XP Cost</span>
                    <span class="meta-value">{sys.cost ?? 200}</span>
                </div>
            </div>

        {:else if type === "gear"}
            <div class="gear-meta">
                <div class="meta-item">
                    <span class="meta-label">Weight</span>
                    <span class="meta-value">{sys.weight ?? 0} kg</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Quantity</span>
                    <span class="meta-value">{sys.quantity ?? 1}</span>
                </div>
            </div>

        {:else if type === "ammunition"}
            <div class="ammo-meta">
                <div class="meta-item">
                    <span class="meta-label">Damage Mod</span>
                    <span class="meta-value" class:bonus={sys.damageModifier > 0} class:penalty={sys.damageModifier < 0}>{sys.damageModifier > 0 ? "+" : ""}{sys.damageModifier ?? 0}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Pen Mod</span>
                    <span class="meta-value" class:bonus={sys.penetrationModifier > 0} class:penalty={sys.penetrationModifier < 0}>{sys.penetrationModifier > 0 ? "+" : ""}{sys.penetrationModifier ?? 0}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Quantity</span>
                    <span class="meta-value">{sys.quantity ?? 1}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Weight</span>
                    <span class="meta-value">{sys.weight ?? 0} kg</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Weapon Group</span>
                    {#if ctx.editable}
                        <select value={sys.weaponGroup ?? ""}>
                            <option value="">Universal</option>
                            {#each WEAPON_GROUPS as group}
                                <option value={group}>{group.charAt(0).toUpperCase() + group.slice(1)}</option>
                            {/each}
                        </select>
                    {:else}
                        <span class="meta-value">{sys.weaponGroup ? sys.weaponGroup.charAt(0).toUpperCase() + sys.weaponGroup.slice(1) : "Universal"}</span>
                    {/if}
                </div>
                {#if sys.qualities?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Qualities</span>
                        <span class="meta-value">{sys.qualities.join(", ")}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "condition"}
            <div class="condition-meta">
                {#if sys.duration}
                    <div class="meta-item">
                        <span class="meta-label">Duration</span>
                        <span class="meta-value">{sys.duration}</span>
                    </div>
                {/if}
                <div class="meta-item">
                    <span class="meta-label">Stackable</span>
                    <span class="meta-value">{sys.stackable ? "Yes" : "No"}</span>
                </div>
            </div>

        {:else if type === "homeworld"}
            <div class="homeworld-meta">
                {#if sys.characteristicBonuses}
                    <div class="meta-item">
                        <span class="meta-label">Bonuses</span>
                        <span class="meta-value bonus">+5 {(sys.characteristicBonuses.positive ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Penalties</span>
                        <span class="meta-value penalty">-5 {(sys.characteristicBonuses.negative ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                    </div>
                {/if}
                {#if sys.fate}
                    <div class="meta-item">
                        <span class="meta-label">Fate</span>
                        <span class="meta-value">{sys.fate.threshold} / {sys.fate.blessing}</span>
                    </div>
                {/if}
                <div class="meta-item">
                    <span class="meta-label">Wounds Formula</span>
                    <span class="meta-value char">{sys.woundsFormula || "—"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Aptitude</span>
                    <span class="meta-value">{sys.aptitude || "—"}</span>
                </div>
                {#if sys.homeSkill}
                    <div class="meta-item">
                        <span class="meta-label">Home Skill</span>
                        <span class="meta-value">{sys.homeSkill}</span>
                    </div>
                {/if}
                {#if sys.bonus}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Bonus</span>
                        <span class="meta-value">{sys.bonus}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "background"}
            <div class="background-meta">
                {#if sys.skills?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Skills</span>
                        <div class="grant-list">
                            {#each sys.skills as entry, i}
                                {#if i > 0}<span class="grant-sep">,</span>{/if}
                                {#if entry.isChoice}
                                    <span class="grant-choice">
                                        {#each entry.names as name, j}
                                            {#if j > 0}<span class="grant-or">or</span>{/if}
                                            <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, name)} onclick={(e) => openCompendiumItem(e, entry.type, name)}>{name}</button>
                                        {/each}
                                    </span>
                                {:else}
                                    <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, entry.names[0])} onclick={(e) => openCompendiumItem(e, entry.type, entry.names[0])}>{entry.label}</button>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
                {#if sys.talents?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Talents</span>
                        <div class="grant-list">
                            {#each sys.talents as entry, i}
                                {#if i > 0}<span class="grant-sep">,</span>{/if}
                                {#if entry.isChoice}
                                    <span class="grant-choice">
                                        {#each entry.names as name, j}
                                            {#if j > 0}<span class="grant-or">or</span>{/if}
                                            <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, name)} onclick={(e) => openCompendiumItem(e, entry.type, name)}>{name}</button>
                                        {/each}
                                    </span>
                                {:else}
                                    <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, entry.names[0])} onclick={(e) => openCompendiumItem(e, entry.type, entry.names[0])}>{entry.label}</button>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
                {#if sys.equipment?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Starting Equipment</span>
                        <div class="grant-list">
                            {#each sys.equipment as entry, i}
                                {#if i > 0}<span class="grant-sep">,</span>{/if}
                                {#if entry.isChoice}
                                    <span class="grant-choice">
                                        {#each entry.names as name, j}
                                            {#if j > 0}<span class="grant-or">or</span>{/if}
                                            <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, name)} onclick={(e) => openCompendiumItem(e, entry.type, name)}>{name}</button>
                                        {/each}
                                    </span>
                                {:else}
                                    <button class="grant-link" type="button" onmouseenter={(e) => showItemTooltip(e, entry.type, entry.names[0])} onclick={(e) => openCompendiumItem(e, entry.type, entry.names[0])}>{entry.label}</button>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
                <div class="meta-item">
                    <span class="meta-label">Aptitude</span>
                    <span class="meta-value">{sys.aptitude || "—"}</span>
                </div>
                {#if sys.bonus}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Bonus</span>
                        <span class="meta-value">{sys.bonus}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "role"}
            <div class="role-meta">
                {#if sys.aptitudes?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Aptitudes</span>
                        <span class="meta-value">{sys.aptitudes.join(", ")}</span>
                    </div>
                {/if}
                {#if sys.talent}
                    <div class="meta-item">
                        <span class="meta-label">Talent</span>
                        <span class="meta-value">{sys.talent}</span>
                    </div>
                {/if}
                {#if sys.bonus}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Bonus</span>
                        <span class="meta-value">{sys.bonus}</span>
                    </div>
                {/if}
            </div>

        {:else if type === "modification"}
            <div class="gear-meta">
                <div class="meta-item">
                    <span class="meta-label">{game.i18n?.localize("DH2E.Modification.Slot") ?? "Slot"}</span>
                    <span class="meta-value">{game.i18n?.localize(`DH2E.ModSlot.${sys.slot ?? "general"}`) ?? sys.slot ?? "General"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Type</span>
                    <span class="meta-value" style="text-transform: capitalize">{sys.modType ?? "weapon"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Weight</span>
                    <span class="meta-value">{sys.weight ?? 0} kg</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">{game.i18n?.localize("DH2E.Modification.Install") ?? "Installation"}</span>
                    <span class="meta-value">{sys.installTest ?? "Tech-Use"} ({sys.installDifficulty > 0 ? "+" : ""}{sys.installDifficulty ?? 0}), {sys.installTime ?? "1d5 hours"}</span>
                </div>
            </div>
        {/if}

        {#if sys.description}
            <div class="description">
                <h3 class="section-title">Description</h3>
                <div class="description-text">{@html sys.description}</div>
            </div>
        {/if}

        {#if hasRules}
            <RuleElementEditor
                rules={sys.rules}
                item={ctx.item}
                editable={ctx.editable && ctx.ruleEditingAllowed !== false}
            />
        {/if}
    </section>
</div>

<style lang="scss">
    .item-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark, #1a1a1f);
    }

    .sheet-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-darkest, #111114);
        border-bottom: 2px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .item-img {
        width: 48px;
        height: 48px;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
    }

    .header-info {
        display: flex;
        flex-direction: column;
        flex: 1;
    }


    .item-name {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-xl, 1.4rem);
        color: var(--dh2e-gold, #c8a84e);
    }

    .header-meta {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .item-type {
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-transform: capitalize;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .source-badge {
        font-size: 0.6rem;
        padding: 1px 6px;
        border-radius: 2px;
        background: rgba(200, 168, 78, 0.1);
        color: var(--dh2e-gold-dark, #9c7a28);
        border: 1px solid rgba(200, 168, 78, 0.2);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .sheet-body {
        flex: 1;
        padding: var(--dh2e-space-md, 0.75rem);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .talent-meta, .skill-meta, .gear-meta, .condition-meta, .power-meta,
    .homeworld-meta, .background-meta, .role-meta, .ammo-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .meta-item {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        flex: 1;
        min-width: 120px;
    }

    .meta-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .meta-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);

        &.tier-1 { color: #8a8; }
        &.tier-2 { color: var(--dh2e-gold, #c8a84e); }
        &.tier-3 { color: #c66; }
        &.char { font-weight: 700; color: var(--dh2e-gold, #c8a84e); }
        &.bonus { font-weight: 700; color: #6c6; }
        &.penalty { font-weight: 700; color: #c66; }
        &.prereq { font-style: italic; }
        &.discipline { font-weight: 700; color: #a080e0; }
    }

    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        margin: 0;
    }

    .description {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .description-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        line-height: 1.5;
        white-space: pre-wrap;
    }

    .grant-list {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.15em;
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.6;
    }

    .grant-link {
        /* Button reset */
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        /* Link styling */
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        text-decoration: none;
        border-bottom: 1px dotted var(--dh2e-gold-muted, #8a7a3e);
        transition: color 0.15s, border-color 0.15s;

        &:hover {
            color: var(--dh2e-gold-light, #e8d07e);
            border-bottom-style: solid;
        }
    }

    .grant-sep {
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-right: 0.15em;
    }

    .grant-or {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        font-size: 0.85em;
        margin: 0 0.2em;
    }

    .grant-choice {
        display: inline-flex;
        align-items: baseline;
        background: rgba(200, 168, 78, 0.06);
        border: 1px solid rgba(200, 168, 78, 0.15);
        border-radius: 3px;
        padding: 0 0.3em;
    }
</style>
