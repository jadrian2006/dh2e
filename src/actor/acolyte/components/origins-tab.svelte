<script lang="ts">
    import { DIVINATION_EFFECTS } from "../../../character-creation/wizard.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const details = $derived(ctx.system?.details ?? {});

    // Origin items (embedded on actor)
    const originItems = $derived({
        homeworld: ctx.items?.homeworlds?.[0] ?? null,
        background: ctx.items?.backgrounds?.[0] ?? null,
        role: ctx.items?.roles?.[0] ?? null,
    });

    function openItem(item: any) {
        item?.sheet?.render(true);
    }

    /** Pending field saves — batched to avoid re-render killing focus on Tab */
    let pendingUpdates: Record<string, string> = {};
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    function saveField(field: string, value: string) {
        const actor = ctx.actor;
        if (!actor || !ctx.editable) return;
        pendingUpdates[`system.details.${field}`] = value;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            const updates = pendingUpdates;
            pendingUpdates = {};
            saveTimer = null;
            // Capture which field currently has focus before the re-render
            const focusedField = (document.activeElement as HTMLElement)?.dataset?.field;
            await actor.update(updates);
            // Restore focus after Svelte remount
            if (focusedField) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const el = document.querySelector<HTMLElement>(`[data-field="${focusedField}"]`);
                        el?.focus();
                    });
                });
            }
        }, 150);
    }

    /** Show bonus description in a tooltip popover */
    function showBonusDescription(event: MouseEvent, title: string, description: string) {
        if (!description) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div><strong>${title}</strong><br/>${description}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        } else {
            ui.notifications?.info(`${title}: ${description}`);
        }
    }

    function formatDivinationEffect(fx: Record<string, any>): string {
        const parts: string[] = [];
        if (fx.characteristics) {
            for (const [k, v] of Object.entries(fx.characteristics))
                parts.push(`${(v as number) > 0 ? "+" : ""}${v} ${k.toUpperCase()}`);
        }
        if (fx.talent) parts.push(`Grants talent: ${fx.talent}`);
        if (fx.skill) parts.push(`Grants skill: ${fx.skill}`);
        if (fx.fate) parts.push(`+${fx.fate} Fate Threshold`);
        return parts.join(", ") || (game.i18n?.localize("DH2E.Divination.NarrativeOnly") ?? "Narrative effect only");
    }

    function showDivinationEffect(event: MouseEvent) {
        const text = details.divination;
        if (!text) return;
        const fx = DIVINATION_EFFECTS[text];
        const description = fx ? formatDivinationEffect(fx) : (game.i18n?.localize("DH2E.Divination.NarrativeOnly") ?? "Narrative effect only");
        showBonusDescription(event, game.i18n?.localize("DH2E.Divination.Effect") ?? "Divination Effect", description);
    }

    /** Open an item from the actor's embedded items or the compendium by name */
    async function openNamedItem(name: string, type: string) {
        if (!name) return;
        // Clean up "X or Y" format — try the first option
        const cleanName = name.includes(" or ") ? name.split(" or ")[0].trim() : name.trim();

        // Check actor's embedded items first
        const actor = ctx.actor;
        if (actor) {
            const embedded = actor.items?.find(
                (i: Item) => i.type === type && i.name === cleanName,
            );
            if (embedded) {
                embedded.sheet?.render(true);
                return;
            }
        }

        // Try the compendium
        const packName = type === "skill" ? "dh2e-data.skills"
            : type === "talent" ? "dh2e-data.talents"
            : type === "weapon" ? "dh2e-data.weapons"
            : type === "gear" ? "dh2e-data.gear"
            : type === "armour" ? "dh2e-data.armour"
            : null;
        if (packName) {
            const pack = game.packs?.get(packName);
            if (pack) {
                const entry = pack.index.find((e: any) => e.name === cleanName);
                if (entry) {
                    const doc = await pack.getDocument(entry._id);
                    (doc as any)?.sheet?.render(true);
                    return;
                }
            }
        }

        // Fallback: notify
        ui.notifications?.info(`${cleanName} (${type})`);
    }
</script>

<div class="origins-tab">
    <!-- Character Details (top) -->
    <section class="fluff-section">
        <h3 class="section-title">Character Details</h3>

        <div class="fluff-row">
            <label class="fluff-field small">
                <span class="fluff-label">Age</span>
                {#if ctx.editable}
                    <input type="text" value={details.age ?? ""} data-field="age"
                        onblur={(e) => saveField("age", e.currentTarget.value)}
                        onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                {:else}
                    <span class="fluff-value">{details.age || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Sex</span>
                {#if ctx.editable}
                    <input type="text" value={details.sex ?? ""} data-field="sex"
                        onblur={(e) => saveField("sex", e.currentTarget.value)}
                        onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                {:else}
                    <span class="fluff-value">{details.sex || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Height</span>
                {#if ctx.editable}
                    <input type="text" value={details.height ?? ""} data-field="height"
                        onblur={(e) => saveField("height", e.currentTarget.value)}
                        onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                {:else}
                    <span class="fluff-value">{details.height || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Weight</span>
                {#if ctx.editable}
                    <input type="text" value={details.weight ?? ""} data-field="weight"
                        onblur={(e) => saveField("weight", e.currentTarget.value)}
                        onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                {:else}
                    <span class="fluff-value">{details.weight || "—"}</span>
                {/if}
            </label>
        </div>

        <label class="fluff-field wide">
            <span class="fluff-label">Appearance</span>
            {#if ctx.editable}
                <textarea rows="3" data-field="appearance"
                    onblur={(e) => saveField("appearance", e.currentTarget.value)}
                    onkeydown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                >{details.appearance ?? ""}</textarea>
            {:else}
                <div class="fluff-value">{details.appearance || "—"}</div>
            {/if}
        </label>

        <label class="fluff-field wide">
            <span class="fluff-label">Biography</span>
            {#if ctx.editable}
                <textarea rows="5" data-field="biography"
                    onblur={(e) => saveField("biography", e.currentTarget.value)}
                    onkeydown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                >{details.biography ?? ""}</textarea>
            {:else}
                <div class="fluff-value">{details.biography || "—"}</div>
            {/if}
        </label>
    </section>

    <!-- Divination -->
    {#if details.divination}
        <button class="divination-block clickable" type="button"
            onclick={(e) => showDivinationEffect(e)}
            title={game.i18n?.localize("DH2E.Divination.Effect") ?? "Divination Effect"}>
            <span class="divination-label">Divination</span>
            <span class="divination-text">{details.divination}</span>
        </button>
    {/if}

    <!-- Origin Cards -->
    <section class="origin-cards">
        <!-- Homeworld -->
        <div class="origin-card" class:has-item={!!originItems.homeworld}>
            <button class="origin-card-header" type="button" onclick={() => openItem(originItems.homeworld)}>
                <div class="origin-type">Homeworld</div>
                <div class="origin-name">{originItems.homeworld?.name ?? details.homeworld ?? "—"}</div>
            </button>
            {#if originItems.homeworld}
                {@const sys = (originItems.homeworld as any).system ?? {}}
                <div class="origin-body">
                    {#if sys.characteristicBonuses}
                        <div class="origin-traits">
                            <span class="trait bonus">+5 {(sys.characteristicBonuses.positive ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                            <span class="trait penalty">-5 {(sys.characteristicBonuses.negative ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                        </div>
                    {/if}
                    {#if sys.aptitude}
                        <div class="origin-traits">
                            <span class="trait">{sys.aptitude}</span>
                        </div>
                    {/if}
                    {#if sys.homeSkill}
                        <div class="origin-badges">
                            <span class="badge-label">Home Skill:</span>
                            <button class="badge skill-badge" type="button" onclick={() => openNamedItem(sys.homeSkill, "skill")} title="Open {sys.homeSkill}">
                                {sys.homeSkill}
                            </button>
                        </div>
                    {/if}
                    {#if sys.bonus}
                        <button
                            class="origin-bonus clickable"
                            type="button"
                            onclick={(e) => showBonusDescription(e, sys.bonus, sys.bonusDescription)}
                            title={sys.bonusDescription || "Click for details"}
                        >
                            <i class="fa-solid fa-circle-info"></i> {sys.bonus}
                        </button>
                    {/if}
                </div>
            {:else if details.homeworld}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </div>

        <!-- Role -->
        <div class="origin-card" class:has-item={!!originItems.role}>
            <button class="origin-card-header" type="button" onclick={() => openItem(originItems.role)}>
                <div class="origin-type">Role</div>
                <div class="origin-name">{originItems.role?.name ?? details.role ?? "—"}</div>
            </button>
            {#if originItems.role}
                {@const sys = (originItems.role as any).system ?? {}}
                <div class="origin-body">
                    {#if sys.aptitudes?.length}
                        <div class="origin-traits">
                            {#each sys.aptitudes as apt}
                                <span class="trait">{apt}</span>
                            {/each}
                        </div>
                    {/if}
                    {#if sys.talent}
                        <div class="origin-badges">
                            <span class="badge-label">Talent:</span>
                            <button class="badge talent-badge" type="button" onclick={() => openNamedItem(sys.talent, "talent")} title="Open {sys.talent}">
                                {sys.talent}
                            </button>
                        </div>
                    {/if}
                    {#if sys.eliteAdvances?.length}
                        <div class="origin-badges">
                            <span class="badge-label">Elite:</span>
                            {#each sys.eliteAdvances as ea}
                                <span class="badge elite-badge">{ea}</span>
                            {/each}
                        </div>
                    {/if}
                    {#if sys.bonus}
                        <button
                            class="origin-bonus clickable"
                            type="button"
                            onclick={(e) => showBonusDescription(e, sys.bonus, sys.bonusDescription)}
                            title={sys.bonusDescription || "Click for details"}
                        >
                            <i class="fa-solid fa-circle-info"></i> {sys.bonus}
                        </button>
                    {/if}
                </div>
            {:else if details.role}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </div>

        <!-- Background -->
        <div class="origin-card" class:has-item={!!originItems.background}>
            <button class="origin-card-header" type="button" onclick={() => openItem(originItems.background)}>
                <div class="origin-type">Background</div>
                <div class="origin-name">{originItems.background?.name ?? details.background ?? "—"}</div>
            </button>
            {#if originItems.background}
                {@const sys = (originItems.background as any).system ?? {}}
                <div class="origin-body">
                    {#if sys.aptitude}
                        <div class="origin-traits">
                            <span class="trait">{sys.aptitude}</span>
                        </div>
                    {/if}
                    {#if sys.skills?.length}
                        <div class="origin-badges">
                            <span class="badge-label">Skills:</span>
                            {#each sys.skills as skillName}
                                <button class="badge skill-badge" type="button" onclick={() => openNamedItem(skillName, "skill")} title="Open {skillName}">
                                    {skillName}
                                </button>
                            {/each}
                        </div>
                    {/if}
                    {#if sys.talents?.length}
                        <div class="origin-badges">
                            <span class="badge-label">Talents:</span>
                            {#each sys.talents as talentName}
                                <button class="badge talent-badge" type="button" onclick={() => openNamedItem(talentName, "talent")} title="Open {talentName}">
                                    {talentName}
                                </button>
                            {/each}
                        </div>
                    {/if}
                    {#if sys.equipment?.length}
                        <div class="origin-badges">
                            <span class="badge-label">Equipment:</span>
                            {#each sys.equipment as eqName}
                                <span class="badge equip-badge" title={eqName}>
                                    {eqName}
                                </span>
                            {/each}
                        </div>
                    {/if}
                    {#if sys.bonus}
                        <button
                            class="origin-bonus clickable"
                            type="button"
                            onclick={(e) => showBonusDescription(e, sys.bonus, sys.bonusDescription)}
                            title={sys.bonusDescription || "Click for details"}
                        >
                            <i class="fa-solid fa-circle-info"></i> {sys.bonus}
                        </button>
                    {/if}
                </div>
            {:else if details.background}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .origins-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    /* Origin cards — Homeworld + Role share a row, Background gets full width */
    .origin-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .origin-card {
        display: flex;
        flex-direction: column;
        gap: 0;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        overflow: hidden;

        /* Background card spans full width — it has the most content */
        &:nth-child(3) {
            grid-column: 1 / -1;
        }
    }

    .origin-card-header {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--dh2e-space-xxs, 0.125rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: none;
        border: none;
        cursor: default;
        text-align: left;
        color: inherit;
        font: inherit;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        .has-item & {
            cursor: pointer;
            &:hover {
                background: rgba(200, 168, 78, 0.05);
            }
        }
    }

    .origin-body {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-sm, 0.5rem);

        /* Full-width card body flows as a compact 2-column grid */
        .origin-card:nth-child(3) & {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: start;
            gap: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        }
    }

    .origin-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .origin-name {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
    }

    .origin-traits {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
    }

    .trait {
        font-size: 0.6rem;
        padding: 1px 4px;
        border-radius: 2px;
        background: rgba(200, 168, 78, 0.1);
        color: var(--dh2e-text-secondary, #a0a0a8);

        &.bonus { color: #6c6; background: rgba(102, 204, 102, 0.1); }
        &.penalty { color: #c66; background: rgba(204, 102, 102, 0.1); }
    }

    /* Clickable badges for skills/talents/equipment */
    .origin-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        align-items: center;
    }
    .badge-label {
        font-size: 0.55rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
        white-space: nowrap;
    }
    .badge {
        font-size: 0.6rem;
        padding: 1px 5px;
        border-radius: 2px;
        border: 1px solid transparent;
        background: rgba(200, 168, 78, 0.08);
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    button.badge {
        cursor: pointer;
        &:hover {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
            color: var(--dh2e-gold, #c8a84e);
            background: rgba(200, 168, 78, 0.15);
        }
    }
    .skill-badge { color: #8cb8e0; background: rgba(100, 160, 220, 0.1); }
    button.skill-badge:hover { color: #a0d0ff; border-color: rgba(100, 160, 220, 0.4); }
    .talent-badge { color: #c8a84e; background: rgba(200, 168, 78, 0.1); }
    button.talent-badge:hover { color: #e0c060; border-color: rgba(200, 168, 78, 0.4); }
    .equip-badge { color: var(--dh2e-text-secondary, #a0a0a8); }
    .elite-badge { color: #c080e0; background: rgba(168, 78, 200, 0.1); }

    .origin-bonus {
        font-size: 0.6rem;
        font-style: italic;
        color: var(--dh2e-gold-dark, #9c7a28);
        grid-column: 1 / -1; /* span full width in grid layout */

        &.clickable {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 0;
            text-align: left;
            font: inherit;
            font-style: italic;
            display: flex;
            align-items: baseline;
            gap: 4px;

            i {
                font-style: normal;
                font-size: 0.55rem;
                opacity: 0.7;
            }

            &:hover {
                color: var(--dh2e-gold, #c8a84e);
                i { opacity: 1; }
            }
        }
    }

    .origin-hint {
        font-size: 0.6rem;
        font-style: italic;
        color: var(--dh2e-text-secondary, #a0a0a8);
        opacity: 0.6;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
    }

    /* Divination */
    .divination-block {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: baseline;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        width: 100%;
        text-align: left;
        color: inherit;
        font: inherit;
        cursor: default;

        &.clickable {
            cursor: pointer;
            &:hover {
                border-color: var(--dh2e-gold-muted, #8a7a3e);
                background: rgba(200, 168, 78, 0.05);
            }
        }
    }

    .divination-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
        white-space: nowrap;
    }

    .divination-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-style: italic;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    /* Fluff fields */
    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        margin: 0 0 var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-field {
        display: flex;
        flex-direction: column;
        gap: 2px;

        &.wide {
            width: 100%;
        }
    }

    .fluff-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .fluff-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .fluff-field input,
    .fluff-field textarea {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-family: inherit;
        resize: vertical;

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
            outline: none;
            box-shadow: 0 0 4px var(--dh2e-gold-dark, #7a6228);
        }
    }
</style>
