<script lang="ts">
    import CharGrid from "./char-grid.svelte";
    import MovementDisplay from "./movement-display.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import { FateDialog } from "../../../ui/fate-dialog.ts";
    import type { CharacteristicAbbrev } from "../../../actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    /** Favorites: items with the "favorite" flag set */
    const favorites = $derived(() => {
        const skills: any[] = ctx.items?.skills ?? [];
        const powers: any[] = ctx.items?.powers ?? [];
        const weapons: any[] = ctx.items?.weapons ?? [];
        const armour: any[] = ctx.items?.armour ?? [];
        const gear: any[] = ctx.items?.gear ?? [];
        return [...skills, ...powers, ...weapons, ...armour, ...gear]
            .filter((i: any) => i.getFlag?.("dh2e", "favorite"))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
    });

    function favIcon(type: string): string {
        if (type === "skill") return "fa-solid fa-graduation-cap";
        if (type === "power") return "fa-solid fa-hat-wizard";
        if (type === "weapon") return "fa-solid fa-crosshairs";
        if (type === "armour") return "fa-solid fa-shield-halved";
        if (type === "gear") return "fa-solid fa-box-open";
        return "fa-solid fa-circle";
    }

    function useFavorite(fav: any, shiftKey = false) {
        const actor = ctx.actor;
        if (!actor) return;
        if (fav.type === "skill") {
            const sys = fav.skillSystem ?? fav.system ?? {};
            CheckDH2e.roll({
                actor,
                characteristic: sys.linkedCharacteristic ?? "ws",
                baseTarget: fav.totalTarget ?? 0,
                label: `${fav.displayName ?? fav.name} Test`,
                domain: `skill:${fav.name.toLowerCase().replace(/\s+/g, "-")}`,
                skillDescription: fav.system?.description ?? "",
                skipDialog: CheckDH2e.shouldSkipDialog(shiftKey),
            });
        } else if (fav.type === "weapon") {
            const sys = fav.system ?? {};
            const isRanged = sys.class !== "Melee";
            const charKey = isRanged ? "bs" : "ws";
            const charVal = ctx.system?.characteristics?.[charKey]?.value ?? 0;
            CheckDH2e.roll({
                actor,
                characteristic: charKey as CharacteristicAbbrev,
                baseTarget: charVal,
                label: `${fav.name} Attack`,
                domain: `attack:${fav.name.toLowerCase().replace(/\s+/g, "-")}`,
                skipDialog: CheckDH2e.shouldSkipDialog(shiftKey),
            });
        } else {
            fav.sheet?.render(true);
        }
    }

    /** DH2e paired layout: WS↔Int, BS↔Per, S↔WP, T↔Fel, Ag centered */
    const charPairs: [string, string][] = [
        ["ws", "int"],
        ["bs", "per"],
        ["s", "wp"],
        ["t", "fel"],
    ];

    const charLabels: Record<string, { label: string; abbrev: string }> = {
        ws:  { label: "Weapon Skill",    abbrev: "WS" },
        bs:  { label: "Ballistic Skill", abbrev: "BS" },
        s:   { label: "Strength",        abbrev: "S" },
        t:   { label: "Toughness",       abbrev: "T" },
        ag:  { label: "Agility",         abbrev: "Ag" },
        int: { label: "Intelligence",    abbrev: "Int" },
        per: { label: "Perception",      abbrev: "Per" },
        wp:  { label: "Willpower",       abbrev: "WP" },
        fel: { label: "Fellowship",      abbrev: "Fel" },
    };

    function onCharClick(key: string, shiftKey = false) {
        const actor = ctx.actor;
        if (!actor) return;
        const char = ctx.system?.characteristics?.[key];
        const value = char?.value ?? char?.base ?? 0;
        CheckDH2e.roll({
            actor,
            characteristic: key as CharacteristicAbbrev,
            baseTarget: value,
            label: `${charLabels[key].label} Test`,
            domain: `characteristic:${key}`,
            skipDialog: CheckDH2e.shouldSkipDialog(shiftKey),
        });
    }

    function getChar(key: string) {
        const char = ctx.system?.characteristics?.[key];
        return {
            value: char?.value ?? char?.base ?? 0,
            bonus: char?.bonus ?? Math.floor((char?.value ?? char?.base ?? 0) / 10),
        };
    }

    function openFateDialog() {
        if (ctx.actor) FateDialog.execute(ctx.actor);
    }

    const woundPercent = $derived(() => {
        const max = ctx.system?.wounds?.max ?? 1;
        const val = ctx.system?.wounds?.value ?? 0;
        return Math.max(0, Math.min(100, (val / max) * 100));
    });

    const woundClass = $derived(() => {
        const pct = woundPercent();
        if (pct <= 0) return "critical";
        if (pct < 50) return "wounded";
        return "healthy";
    });
</script>

<div class="summary-tab">
    <!-- LEFT COLUMN: Characteristics -->
    <section class="char-panel">
        <h2 class="section-title">Characteristics</h2>
        <div class="char-pairs">
            {#each charPairs as [left, right]}
                {@const lc = getChar(left)}
                {@const rc = getChar(right)}
                <div class="char-pair-row">
                    <CharGrid
                        abbreviation={charLabels[left].abbrev}
                        label={charLabels[left].label}
                        value={lc.value}
                        bonus={lc.bonus}
                        onclick={(e) => onCharClick(left, e.shiftKey)}
                    />
                    <CharGrid
                        abbreviation={charLabels[right].abbrev}
                        label={charLabels[right].label}
                        value={rc.value}
                        bonus={rc.bonus}
                        onclick={(e) => onCharClick(right, e.shiftKey)}
                    />
                </div>
            {/each}
            <!-- Centered Agility -->
            <div class="char-pair-row centered">
                <CharGrid
                    abbreviation={charLabels.ag.abbrev}
                    label={charLabels.ag.label}
                    value={getChar("ag").value}
                    bonus={getChar("ag").bonus}
                    onclick={(e) => onCharClick("ag", e.shiftKey)}
                />
            </div>
        </div>
    </section>

    <!-- RIGHT COLUMN: Attributes -->
    <section class="attr-panel">
        <!-- Wounds -->
        <div class="attr-block wounds-block" class:wounded={woundClass() === "wounded"} class:critical={woundClass() === "critical"}>
            <div class="attr-row">
                <span class="attr-label">Wounds</span>
                <span class="attr-value">{ctx.system?.wounds?.value ?? 0} / {ctx.system?.wounds?.max ?? 0}</span>
            </div>
            <div class="wound-bar">
                <div class="wound-fill" style="width: {woundPercent()}%"></div>
            </div>
        </div>

        <!-- Fate -->
        <button class="attr-block fate-block clickable" onclick={openFateDialog} title="Invoke Fate">
            <span class="attr-label">Fate</span>
            <span class="attr-value fate-value">{ctx.system?.fate?.value ?? 0} / {ctx.system?.fate?.max ?? 0}</span>
        </button>

        <!-- XP -->
        <span class="section-label">Experience</span>
        <div class="xp-row">
            <div class="xp-item">
                <span class="xp-label">Total</span>
                {#if ctx.canEditXP}
                    <input
                        class="xp-value xp-input"
                        type="number"
                        min="0"
                        value={ctx.system?.xp?.total ?? 0}
                        onblur={(e) => {
                            const val = parseInt(e.currentTarget.value, 10);
                            if (!Number.isNaN(val) && val !== (ctx.system?.xp?.total ?? 0)) {
                                ctx.actor.update({"system.xp.total": Math.max(0, val)});
                            }
                        }}
                        onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    />
                {:else}
                    <span class="xp-value">{ctx.system?.xp?.total ?? 0}</span>
                {/if}
            </div>
            <div class="xp-item">
                <span class="xp-label">Spent</span>
                <span class="xp-value">{ctx.system?.xp?.spent ?? 0}</span>
            </div>
            <div class="xp-item available">
                <span class="xp-label">Available</span>
                <span class="xp-value">{ctx.system?.xp?.available ?? (ctx.system?.xp?.total ?? 0) - (ctx.system?.xp?.spent ?? 0)}</span>
            </div>
        </div>

        <!-- Corruption / Insanity / Influence -->
        <div class="triple-row">
            <div class="triple-item">
                <span class="triple-label">Corruption</span>
                <span class="triple-value">{ctx.system?.corruption ?? 0}</span>
            </div>
            <div class="triple-item">
                <span class="triple-label">Insanity</span>
                <span class="triple-value">{ctx.system?.insanity ?? 0}</span>
            </div>
            <div class="triple-item">
                <span class="triple-label">Influence</span>
                <span class="triple-value">{ctx.system?.influence ?? 0}</span>
            </div>
        </div>

        <!-- Movement -->
        <div class="movement-section">
            <span class="section-label">Movement</span>
            <MovementDisplay movement={ctx.system?.movement ?? { half: 0, full: 0, charge: 0, run: 0 }} />
        </div>

        <!-- Quick Actions (Favorites) -->
        {#if favorites().length > 0}
            <div class="favorites-section">
                <span class="section-label">Quick Actions</span>
                <div class="favorites-list">
                    {#each favorites() as fav}
                        <button class="fav-row" onclick={(e) => useFavorite(fav, e.shiftKey)}>
                            <i class={favIcon(fav.type)}></i>
                            <span class="fav-name">{fav.name}</span>
                            {#if fav.type === "skill"}
                                <span class="fav-target">{fav.totalTarget ?? "?"}</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Details -->
        <div class="details-grid">
            <div class="detail-field">
                <span class="detail-label">HW</span>
                <span class="detail-value">{ctx.system?.details?.homeworld || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">BG</span>
                <span class="detail-value">{ctx.system?.details?.background || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Role</span>
                <span class="detail-value">{ctx.system?.details?.role || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Div</span>
                <span class="detail-value">{ctx.system?.details?.divination || "—"}</span>
            </div>
        </div>

        <!-- Compact fluff -->
        <div class="details-grid">
            {#if ctx.system?.details?.sex}
                <div class="detail-field">
                    <span class="detail-label">Sex</span>
                    <span class="detail-value">{ctx.system.details.sex}</span>
                </div>
            {/if}
            {#if ctx.system?.details?.height}
                <div class="detail-field">
                    <span class="detail-label">Height</span>
                    <span class="detail-value">{ctx.system.details.height}</span>
                </div>
            {/if}
            {#if ctx.system?.details?.weight}
                <div class="detail-field">
                    <span class="detail-label">Weight</span>
                    <span class="detail-value">{ctx.system.details.weight}</span>
                </div>
            {/if}
            {#if ctx.system?.details?.age}
                <div class="detail-field">
                    <span class="detail-label">Age</span>
                    <span class="detail-value">{ctx.system.details.age}</span>
                </div>
            {/if}
        </div>

        <!-- Wizard / Level Up buttons -->
        {#if !ctx.system?.details?.homeworld && ctx.openWizard}
            <button class="btn wizard-btn" type="button" onclick={() => ctx.openWizard?.()}>
                Character Creation Wizard
            </button>
        {/if}
        {#if ctx.system?.details?.homeworld}
            <button class="btn levelup-btn" type="button" onclick={() => ctx.openShop?.()}>
                Level Up / Spend XP
            </button>
        {/if}
    </section>
</div>

<style lang="scss">
    .summary-tab {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--dh2e-space-lg);
    }

    .section-title {
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-md);
        color: var(--dh2e-gold);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-sm);
        padding-bottom: var(--dh2e-space-xs);
        border-bottom: 1px solid var(--dh2e-gold-muted);
    }

    /* Left column — Characteristics */
    .char-panel {
        min-width: 220px;
    }
    .char-pairs {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs);
    }
    .char-pair-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-xs);

        &.centered {
            grid-template-columns: 1fr;
            max-width: 50%;
            margin: 0 auto;
        }
    }

    /* Right column — Attributes */
    .attr-panel {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm);
    }

    .attr-block {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
    }
    .attr-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .attr-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        font-weight: 600;
    }
    .attr-value {
        font-size: var(--dh2e-text-md);
        font-weight: 700;
        color: var(--dh2e-text-primary);
    }

    /* Wounds */
    .wounds-block .attr-value { color: var(--dh2e-success); }
    .wounds-block.wounded .attr-value { color: #d4a843; }
    .wounds-block.critical .attr-value { color: var(--dh2e-red-bright); }
    .wound-bar {
        width: 100%;
        height: 4px;
        background: #333;
        border-radius: 2px;
        margin-top: 4px;
    }
    .wound-fill {
        height: 100%;
        border-radius: 2px;
        background: var(--dh2e-success);
        transition: width 0.3s ease;
    }
    .wounded .wound-fill { background: #d4a843; }
    .critical .wound-fill { background: var(--dh2e-red-bright); }

    /* Fate */
    .fate-block {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        &:hover {
            border-color: var(--dh2e-gold);
            box-shadow: 0 0 4px var(--dh2e-gold-dark);
        }
    }
    .fate-value { color: var(--dh2e-gold-bright) !important; }

    /* XP */
    .xp-row {
        display: flex;
        gap: var(--dh2e-space-sm);
    }
    .xp-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        flex: 1;
    }
    .xp-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
    }
    .xp-value {
        font-size: var(--dh2e-text-lg);
        font-weight: 700;
    }
    .xp-input {
        background: var(--dh2e-bg-mid);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        color: inherit;
        text-align: center;
        width: 100%;
        padding: 0;
        font-size: var(--dh2e-text-lg);
        font-weight: 700;
        -moz-appearance: textfield;
        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        &:focus {
            border-color: var(--dh2e-gold);
            outline: none;
            box-shadow: 0 0 4px var(--dh2e-gold-dark);
        }
    }
    .xp-item.available .xp-value {
        color: var(--dh2e-gold-bright);
    }

    /* Corruption / Insanity / Influence */
    .triple-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--dh2e-space-sm);
    }
    .triple-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs);
    }
    .triple-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
    }
    .triple-value {
        font-size: var(--dh2e-text-md);
        font-weight: 700;
        color: var(--dh2e-text-primary);
    }

    /* Movement */
    .movement-section {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
    }
    .section-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        font-weight: 600;
        display: block;
        margin-bottom: var(--dh2e-space-xxs);
    }

    /* Favorites */
    .favorites-section {
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
    }
    .favorites-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .fav-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-xxs) var(--dh2e-space-xs);
        background: transparent;
        border: none;
        border-radius: var(--dh2e-radius-sm);
        cursor: pointer;
        color: var(--dh2e-text-primary);
        font-size: var(--dh2e-text-sm);
        width: 100%;
        text-align: left;

        &:hover { background: var(--dh2e-bg-mid); }

        i {
            width: 1rem;
            text-align: center;
            font-size: 0.7rem;
            color: var(--dh2e-gold-muted);
        }
    }
    .fav-name {
        flex: 1;
    }
    .fav-target {
        font-weight: 700;
        color: var(--dh2e-gold-bright);
        font-size: var(--dh2e-text-xs);
    }

    /* Details */
    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-xs);
    }
    .detail-field {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .detail-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        font-weight: 600;
    }
    .detail-value {
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Wizard / Level Up */
    .wizard-btn {
        width: 100%;
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        background: var(--dh2e-gold-dark);
        color: var(--dh2e-bg-darkest);
        border: 1px solid var(--dh2e-gold);
        border-radius: var(--dh2e-radius-sm);
        font-family: var(--dh2e-font-header);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        &:hover { background: var(--dh2e-gold); }
    }
    .levelup-btn {
        width: 100%;
        padding: var(--dh2e-space-xs) var(--dh2e-space-md);
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-text-secondary);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        font-size: var(--dh2e-text-sm);
        cursor: pointer;

        &:hover {
            border-color: var(--dh2e-gold-dark);
            color: var(--dh2e-text-primary);
        }
    }
</style>
