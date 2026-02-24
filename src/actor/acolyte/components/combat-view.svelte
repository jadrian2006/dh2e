<script lang="ts">
    import CharGrid from "./char-grid.svelte";
    import WeaponRow from "./weapon-row.svelte";
    import ArmourDisplay from "./armour-display.svelte";
    import MovementDisplay from "./movement-display.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import type { CharacteristicAbbrev } from "../../types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const charKeys: CharacteristicAbbrev[] = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];
    const abbrevMap: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };
    const labelMap: Record<string, string> = {
        ws: "Weapon Skill", bs: "Ballistic Skill", s: "Strength",
        t: "Toughness", ag: "Agility", int: "Intelligence",
        per: "Perception", wp: "Willpower", fel: "Fellowship",
    };

    const weapons = $derived(ctx.items?.weapons ?? []);
    const conditions = $derived(ctx.items?.conditions ?? []);

    function rollChar(key: CharacteristicAbbrev, event: MouseEvent) {
        if (!ctx.actor) return;
        const charVal = ctx.system?.characteristics?.[key]?.value ?? 0;
        CheckDH2e.roll({
            actor: ctx.actor,
            characteristic: key,
            baseTarget: charVal,
            label: `${labelMap[key]} Test`,
            domain: `characteristic:${key}`,
            skipDialog: CheckDH2e.shouldSkipDialog(event.shiftKey),
        });
    }
</script>

<div class="combat-view">
    <!-- Characteristics bar -->
    <div class="char-bar">
        {#each charKeys as key}
            {@const ch = ctx.system?.characteristics?.[key] ?? { value: 0, bonus: 0 }}
            <CharGrid
                abbreviation={abbrevMap[key]}
                label={labelMap[key]}
                value={ch.value}
                bonus={ch.bonus}
                onclick={(e) => rollChar(key, e)}
            />
        {/each}
    </div>

    <div class="combat-body">
        <!-- Left: Armour diagram -->
        <div class="combat-left">
            <ArmourDisplay {ctx} role={(ctx.system?.details?.role ?? "")} />
            <MovementDisplay movement={ctx.system?.movement ?? { half: 0, full: 0, charge: 0, run: 0 }} />
        </div>

        <!-- Right: Weapons + Conditions -->
        <div class="combat-right">
            <section class="weapons-section">
                <h3 class="section-title">Weapons</h3>
                {#each weapons as weapon}
                    <WeaponRow {weapon} actor={ctx.actor} />
                {:else}
                    <p class="empty-hint">No weapons.</p>
                {/each}
            </section>

            <section class="conditions-section">
                <h3 class="section-title">Conditions</h3>
                {#if conditions.length > 0}
                    <div class="condition-list">
                        {#each conditions as cond}
                            <div class="cond-chip" title={cond.system?.description ?? cond.name}>
                                <span class="cond-name">{cond.name}</span>
                                {#if cond.system?.remainingRounds > 0}
                                    <span class="cond-rounds">{cond.system.remainingRounds}r</span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="empty-hint">No active conditions.</p>
                {/if}
            </section>
        </div>
    </div>
</div>

<style lang="scss">
    .combat-view {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
    }
    .char-bar {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .combat-body {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--dh2e-space-lg, 1rem);
        align-items: start;
    }
    .combat-left {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        min-width: 180px;
    }
    .combat-right {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }
    .section-title {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0 0 var(--dh2e-space-xs, 0.25rem);
        padding-bottom: 2px;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }
    .condition-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .cond-chip {
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 2px 6px;
        background: rgba(180, 60, 60, 0.3);
        border: 1px solid rgba(180, 60, 60, 0.5);
        border-radius: 2px;
        font-size: 0.65rem;
        color: #e88;
    }
    .cond-name { font-weight: 700; }
    .cond-rounds { font-size: 0.55rem; color: #c66; }
    .empty-hint {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }
</style>
