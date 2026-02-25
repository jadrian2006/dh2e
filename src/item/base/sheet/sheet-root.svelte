<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const type = $derived(ctx.type ?? "gear");
    const hasRules = $derived(Array.isArray(sys.rules));
</script>

<div class="item-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <span class="item-type">{type}</span>
        </div>
        {#if ctx.isGM && sys.description}
            <button class="header-vox-btn" onclick={ctx.sendViaVox} title={game.i18n.localize("DH2E.Vox.SendViaVox")}>
                <i class="fa-solid fa-tower-broadcast"></i>
            </button>
        {/if}
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
                        <span class="meta-value">{sys.skills.join(", ")}</span>
                    </div>
                {/if}
                {#if sys.talents?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Talents</span>
                        <span class="meta-value">{sys.talents.join(", ")}</span>
                    </div>
                {/if}
                {#if sys.equipment?.length}
                    <div class="meta-item" style="flex-basis: 100%">
                        <span class="meta-label">Equipment</span>
                        <span class="meta-value">{sys.equipment.join(", ")}</span>
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
        {/if}

        {#if sys.description}
            <div class="description">
                <h3 class="section-title">Description</h3>
                <div class="description-text">{sys.description}</div>
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

    .header-vox-btn {
        background: none;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 0.85rem;
        align-self: center;
        transition: color 0.15s, border-color 0.15s;
        flex-shrink: 0;

        &:hover {
            color: #33ff33;
            border-color: #33ff33;
        }
    }

    .item-name {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-xl, 1.4rem);
        color: var(--dh2e-gold, #c8a84e);
    }

    .item-type {
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-transform: capitalize;
        color: var(--dh2e-text-secondary, #a0a0a8);
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
    .homeworld-meta, .background-meta, .role-meta {
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
</style>
