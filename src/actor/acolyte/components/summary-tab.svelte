<script lang="ts">
    import CharGrid from "./char-grid.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import type { CharacteristicAbbrev } from "../../../actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const charOrder = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"] as const;

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

    function onCharClick(key: string) {
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
        });
    }
</script>

<div class="summary-tab">
    <section class="characteristics-section">
        <h2 class="section-title">Characteristics</h2>
        <div class="char-grid">
            {#each charOrder as key}
                {@const char = ctx.system?.characteristics?.[key]}
                <CharGrid
                    abbreviation={charLabels[key].abbrev}
                    label={charLabels[key].label}
                    value={char?.value ?? char?.base ?? 0}
                    bonus={char?.bonus ?? Math.floor((char?.value ?? char?.base ?? 0) / 10)}
                    onclick={() => onCharClick(key)}
                />
            {/each}
        </div>
    </section>

    <section class="xp-section">
        <h2 class="section-title">Experience</h2>
        <div class="xp-row">
            <div class="xp-item">
                <span class="xp-label">Total</span>
                <span class="xp-value">{ctx.system?.xp?.total ?? 0}</span>
            </div>
            <div class="xp-item">
                <span class="xp-label">Spent</span>
                <span class="xp-value">{ctx.system?.xp?.spent ?? 0}</span>
            </div>
            <div class="xp-item available">
                <span class="xp-label">Available</span>
                <span class="xp-value">{(ctx.system?.xp?.total ?? 0) - (ctx.system?.xp?.spent ?? 0)}</span>
            </div>
        </div>
    </section>

    <section class="details-section">
        <h2 class="section-title">Details</h2>
        <div class="details-grid">
            <div class="detail-field">
                <span class="detail-label">Homeworld</span>
                <span>{ctx.system?.details?.homeworld || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Background</span>
                <span>{ctx.system?.details?.background || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Role</span>
                <span>{ctx.system?.details?.role || "—"}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Divination</span>
                <span>{ctx.system?.details?.divination || "—"}</span>
            </div>
        </div>
    </section>
</div>

<style lang="scss">
    .summary-tab {
        display: flex;
        flex-direction: column;
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

    .char-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--dh2e-space-sm);
    }

    .xp-row {
        display: flex;
        gap: var(--dh2e-space-lg);
    }
    .xp-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-light);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
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
    .xp-item.available .xp-value {
        color: var(--dh2e-gold-bright);
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm);
    }
    .detail-field {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs);

        .detail-label {
            font-size: var(--dh2e-text-xs);
            color: var(--dh2e-text-secondary);
            text-transform: uppercase;
        }
        span {
            font-size: var(--dh2e-text-md);
            color: var(--dh2e-text-primary);
        }
    }
</style>
