<script lang="ts">
    import CharGrid from "./char-grid.svelte";
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

    const weapons = $derived((ctx.items?.weapons ?? []).filter((w: any) => w.system?.equipped));
    const skills = $derived((ctx.items?.skills ?? []).filter((s: any) => s.getFlag?.("dh2e", "favorite")));
    const enc = $derived(ctx.system?.encumbrance ?? { current: 0, carry: 0, overloaded: false, overencumbered: false });
    const armourSummary = $derived(() => {
        const ap = ctx.system?.armour ?? {};
        return ["head", "rightArm", "leftArm", "body", "rightLeg", "leftLeg"]
            .map((loc) => ap[loc] ?? 0)
            .join("/");
    });

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

    async function attackWith(weapon: any) {
        const { AttackResolver } = await import("@combat/attack.ts");
        await AttackResolver.resolve({ actor: ctx.actor, weapon, fireMode: "single" });
    }
</script>

<div class="compact-view">
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

    <div class="compact-body">
        <!-- Left: Key Skills -->
        <div class="compact-section">
            <h3 class="section-title">Starred Skills</h3>
            {#if skills.length > 0}
                <div class="skill-list">
                    {#each skills as skill}
                        {@const sys = skill.skillSystem ?? skill.system ?? {}}
                        <button
                            class="skill-row"
                            onclick={(e) => {
                                CheckDH2e.roll({
                                    actor: ctx.actor,
                                    characteristic: sys.linkedCharacteristic ?? "ws",
                                    baseTarget: skill.totalTarget ?? 0,
                                    label: `${skill.displayName ?? skill.name} Test`,
                                    domain: `skill:${skill.name.toLowerCase().replace(/\s+/g, "-")}`,
                                    skipDialog: CheckDH2e.shouldSkipDialog(e.shiftKey),
                                });
                            }}
                        >
                            <span class="skill-name">{skill.displayName ?? skill.name}</span>
                            <span class="skill-target">{skill.totalTarget ?? 0}</span>
                        </button>
                    {/each}
                </div>
            {:else}
                <p class="empty-hint">Star skills on the Skills tab to show them here.</p>
            {/if}
        </div>

        <!-- Center: Equipped Weapons -->
        <div class="compact-section">
            <h3 class="section-title">Equipped Weapons</h3>
            {#each weapons as weapon}
                {@const sys = weapon.system ?? {}}
                <button class="weapon-row" onclick={() => attackWith(weapon)}>
                    <i class="fa-solid fa-crosshairs"></i>
                    <span class="weapon-name">{weapon.name}</span>
                    <span class="weapon-dmg">{sys.damage?.formula ?? "?"} {sys.damageType ?? ""}</span>
                </button>
            {:else}
                <p class="empty-hint">No equipped weapons.</p>
            {/each}
        </div>

        <!-- Right: Armour + Movement -->
        <div class="compact-section">
            <h3 class="section-title">Defence</h3>
            <div class="stat-line">
                <span class="stat-label">Armour (H/RA/LA/B/RL/LL)</span>
                <span class="stat-value">{armourSummary()}</span>
            </div>
            <div class="stat-line">
                <span class="stat-label">TB</span>
                <span class="stat-value">{ctx.system?.characteristics?.t?.bonus ?? 0}</span>
            </div>
            <MovementDisplay movement={ctx.system?.movement ?? { half: 0, full: 0, charge: 0, run: 0 }} />
            <div class="stat-line" class:enc-warn={enc.overloaded || enc.overencumbered}>
                <span class="stat-label">
                    {#if enc.overencumbered}
                        <i class="fas fa-exclamation-triangle"></i>
                    {:else if enc.overloaded}
                        <i class="fas fa-weight-hanging"></i>
                    {/if}
                    Encumbrance
                </span>
                <span class="stat-value">{enc.current.toFixed(1)} / {enc.carry} kg</span>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .compact-view {
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
    .compact-body {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--dh2e-space-md, 0.75rem);
        align-items: start;
    }
    .compact-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .section-title {
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0;
        padding-bottom: 2px;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }
    .skill-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .skill-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        &:hover { border-color: var(--dh2e-gold, #c8a84e); }
    }
    .skill-name { font-weight: 600; }
    .skill-target { color: var(--dh2e-gold, #c8a84e); font-weight: 700; }
    .weapon-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 3px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        &:hover { border-color: var(--dh2e-gold, #c8a84e); }
        i { color: var(--dh2e-gold-muted, #8a7a3e); font-size: 0.6rem; }
    }
    .weapon-name { flex: 1; font-weight: 600; }
    .weapon-dmg { color: var(--dh2e-text-secondary, #a0a0a8); font-size: 0.6rem; }
    .stat-line {
        display: flex;
        justify-content: space-between;
        font-size: var(--dh2e-text-xs, 0.7rem);
        padding: 2px 0;
    }
    .stat-label { color: var(--dh2e-text-secondary, #a0a0a8); }
    .stat-value { color: var(--dh2e-text-primary, #d0cfc8); font-weight: 700; }
    .enc-warn .stat-label { color: var(--dh2e-red-bright, #d44); }
    .enc-warn .stat-value { color: var(--dh2e-red-bright, #d44); }
    .empty-hint {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }
</style>
