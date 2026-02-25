<script lang="ts">
    import SkillRow from "./skill-row.svelte";
    import SkillActionsView from "./skill-actions-view.svelte";
    import { CheckDH2e } from "../../../check/check.ts";
    import type { SkillUse } from "../../../item/skill/data.ts";
    import { executeSkillUseRoll } from "../../../item/skill/roll-skill-use.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    type FilterMode = "all" | "trained" | "combat" | "actions";
    let filter: FilterMode = $state("all");

    /** Combat-related skill names */
    const combatSkills = new Set([
        "Athletics", "Acrobatics", "Dodge", "Parry",
        "Awareness", "Stealth", "Intimidate",
    ]);

    const skills = $derived(() => {
        const items: any[] = ctx.items?.skills ?? [];
        let filtered = items;

        if (filter === "trained") {
            filtered = items.filter((s: any) => s.advancement >= 1);
        } else if (filter === "combat") {
            filtered = items.filter((s: any) => combatSkills.has(s.name));
        }

        // Sort alphabetically
        return filtered.sort((a: any, b: any) =>
            (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
        );
    });

    function onSkillRoll(skill: any, shiftKey = false) {
        const actor = ctx.actor;
        if (!actor) return;
        CheckDH2e.roll({
            actor,
            characteristic: skill.linkedCharacteristic,
            baseTarget: skill.totalTarget,
            label: `${skill.displayName ?? skill.name} Test`,
            domain: `skill:${skill.name.toLowerCase().replace(/\s+/g, "-")}`,
            skillDescription: skill.system?.description ?? "",
            skipDialog: CheckDH2e.shouldSkipDialog(shiftKey),
        });
    }

    function onUseRoll(skill: any, use: SkillUse, shiftKey: boolean) {
        const actor = ctx.actor;
        if (!actor) return;
        executeSkillUseRoll(actor, skill, use, CheckDH2e.shouldSkipDialog(shiftKey));
    }

</script>

<div class="skills-tab">
    <div class="skills-filter">
        <button class="filter-btn" class:active={filter === "all"} onclick={() => filter = "all"}>All</button>
        <button class="filter-btn" class:active={filter === "trained"} onclick={() => filter = "trained"}>Trained</button>
        <button class="filter-btn" class:active={filter === "combat"} onclick={() => filter = "combat"}>Combat</button>
        <button class="filter-btn" class:active={filter === "actions"} onclick={() => filter = "actions"}>{game.i18n?.localize?.("DH2E.Skill.Actions") ?? "Actions"}</button>
    </div>

    {#if filter === "actions"}
        <SkillActionsView
            skills={ctx.items?.skills ?? []}
            actor={ctx.actor}
            {onUseRoll}
        />
    {:else}
        <div class="skills-list">
            <div class="skills-header">
                <span class="col-name">Skill</span>
                <span class="col-char">Char</span>
                <span class="col-pips" title="Training rank — each pip = one advance">Rank</span>
                <span class="col-target">Target</span>
            </div>
            {#each skills() as skill}
                <SkillRow
                    skill={{
                        name: skill.name,
                        displayName: skill.displayName ?? skill.name,
                        linkedCharacteristic: skill.skillSystem?.linkedCharacteristic ?? skill.system?.linkedCharacteristic ?? "ws",
                        advancement: skill.skillSystem?.advancement ?? skill.system?.advancement ?? 0,
                        advancementBonus: skill.advancementBonus ?? 0,
                        totalTarget: skill.totalTarget ?? 0,
                        isTrained: skill.isTrained ?? false,
                    }}
                    item={skill}
                    onRoll={(e) => onSkillRoll(skill, e?.shiftKey)}
                />
            {/each}
            {#if skills().length === 0}
                <p class="empty-msg">No skills match the current filter.</p>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .skills-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm);
    }

    .skills-filter {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .filter-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }

        &:hover:not(.active) {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }

    .skills-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .col-name { flex: 1; }
    .col-char { width: 2rem; text-align: center; }
    .col-pips { width: 2.5rem; text-align: center; }
    .col-target { width: 2.5rem; text-align: right; }

    .skills-list {
        display: flex;
        flex-direction: column;
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
    }
</style>
