<script lang="ts">
    import SkillUseRow from "./skill-use-row.svelte";
    import type { SkillUse } from "../../../item/skill/data.ts";
    import { CANONICAL_SKILL_USES, CANONICAL_SKILL_CHARS } from "../../../item/skill/uses.ts";

    let { skills, actor, onUseRoll }: {
        skills: any[];
        actor: any;
        onUseRoll: (skill: any, use: SkillUse, shiftKey: boolean) => void;
    } = $props();

    const charAbbrevMap: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    const rankNames = ["Untrained", "Known", "Trained (+10)", "Experienced (+20)", "Veteran (+30)"];
    const maxPips = 4;

    /** Track expanded state per skill — trained skills start expanded */
    let expanded: Record<string, boolean> = $state({});

    function isExpanded(skillName: string, isTrained: boolean): boolean {
        return expanded[skillName] ?? isTrained;
    }

    function toggleExpanded(skillName: string, isTrained: boolean) {
        expanded[skillName] = !isExpanded(skillName, isTrained);
    }

    /** Resolve uses: embedded data first, then canonical fallback by skill name */
    function getUses(skill: any): SkillUse[] {
        const embedded = skill.uses ?? skill.skillSystem?.uses ?? skill.system?.uses;
        if (embedded && embedded.length > 0) return embedded;
        return CANONICAL_SKILL_USES[skill.name] ?? [];
    }

    /**
     * Build merged list: actor-owned skills + synthetic entries for unowned canonical skills.
     * Every non-specialist skill with uses appears, regardless of whether the actor owns it.
     */
    const allSkillsWithUses = $derived(() => {
        // Index owned skills by name
        const ownedByName = new Map<string, any>();
        for (const s of skills) {
            ownedByName.set(s.name, s);
        }

        const result: any[] = [];

        for (const [skillName, uses] of Object.entries(CANONICAL_SKILL_USES)) {
            if (uses.length === 0) continue;

            const owned = ownedByName.get(skillName);
            if (owned) {
                // Use the real actor item
                result.push(owned);
            } else {
                // Synthesize an entry from canonical data + actor's characteristic
                const linkedChar = CANONICAL_SKILL_CHARS[skillName] ?? "ws";
                const charValue = actor?.system?.characteristics?.[linkedChar]?.value
                    ?? actor?.system?.characteristics?.[linkedChar]?.base
                    ?? 0;
                result.push({
                    name: skillName,
                    displayName: skillName,
                    linkedCharacteristic: linkedChar,
                    advancement: 0,
                    advancementBonus: 0,
                    totalTarget: charValue,
                    isTrained: false,
                    _synthetic: true,
                });
            }
        }

        return result.sort((a: any, b: any) =>
            (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
        );
    });

    function getAdvancement(skill: any): number {
        return skill.skillSystem?.advancement ?? skill.system?.advancement ?? skill.advancement ?? 0;
    }

    function isTrained(skill: any): boolean {
        return skill.isTrained ?? (getAdvancement(skill) >= 1);
    }

    function getLinkedChar(skill: any): string {
        return skill.skillSystem?.linkedCharacteristic ?? skill.system?.linkedCharacteristic ?? skill.linkedCharacteristic ?? "ws";
    }

    function getTotalTarget(skill: any): number {
        if (skill._synthetic) return skill.totalTarget;
        return skill.totalTarget ?? 0;
    }

    /** Build a safe flag key from skill name + use slug */
    function useFavKey(skillName: string, useSlug: string): string {
        return `${skillName.toLowerCase().replace(/\s+/g, "-")}--${useSlug}`;
    }

    /** Read favorite state from actor flags */
    function isUseFavorite(skillName: string, useSlug: string): boolean {
        const favs = actor?.getFlag?.("dh2e", "favoriteUses");
        return favs?.[useFavKey(skillName, useSlug)] ?? false;
    }

    /** Toggle favorite on a skill use via actor flag */
    function toggleUseFavorite(skillName: string, useSlug: string) {
        if (!actor?.update) return;
        const key = useFavKey(skillName, useSlug);
        const favs = actor.getFlag?.("dh2e", "favoriteUses") ?? {};
        if (favs[key]) {
            actor.update({ [`flags.dh2e.favoriteUses.-=${key}`]: null });
        } else {
            actor.update({ [`flags.dh2e.favoriteUses.${key}`]: true });
        }
    }
</script>

<div class="skill-actions-view">
    {#each allSkillsWithUses() as skill}
        {@const trained = isTrained(skill)}
        {@const adv = getAdvancement(skill)}
        {@const open = isExpanded(skill.name, trained)}
        <div class="skill-group" class:untrained={!trained}>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="skill-group-header"
                onclick={() => toggleExpanded(skill.name, trained)}
                onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") toggleExpanded(skill.name, trained); }}
                role="button"
                tabindex="0"
                aria-expanded={open}
            >
                <i class="fas {open ? 'fa-chevron-down' : 'fa-chevron-right'} chevron"></i>
                <span class="skill-name">{skill.displayName ?? skill.name}</span>
                <span class="skill-char">{charAbbrevMap[getLinkedChar(skill)] ?? getLinkedChar(skill)}</span>
                <span class="skill-pips" title={rankNames[adv] ?? "Untrained"}>
                    {#each Array(maxPips) as _, i}
                        <span class="pip" class:filled={i < adv}></span>
                    {/each}
                </span>
                <span class="skill-target">{getTotalTarget(skill)}</span>
            </div>

            {#if open}
                <div class="skill-uses">
                    {#each getUses(skill) as use}
                        <SkillUseRow
                            {use}
                            isTrained={trained}
                            skillName={skill.name}
                            favorite={isUseFavorite(skill.name, use.slug)}
                            onToggleFavorite={() => toggleUseFavorite(skill.name, use.slug)}
                            onRoll={(e) => onUseRoll(skill, use, e?.shiftKey ?? false)}
                        />
                    {/each}
                </div>
            {/if}
        </div>
    {/each}

    {#if allSkillsWithUses().length === 0}
        <p class="empty-msg">No skills with actions found.</p>
    {/if}
</div>

<style lang="scss">
    .skill-actions-view {
        display: flex;
        flex-direction: column;
    }

    .skill-group {
        &.untrained {
            > .skill-group-header {
                opacity: 0.6;
            }
        }
    }

    .skill-group-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        cursor: pointer;
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }

    .chevron {
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.6rem;
        width: 0.8rem;
        flex-shrink: 0;
        text-align: center;
    }

    .skill-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .skill-char {
        width: 2rem;
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
    }

    .skill-pips {
        display: flex;
        gap: 2px;
        padding: 2px 4px;
    }

    .pip {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #b49545);
        }
    }

    .skill-target {
        width: 2.5rem;
        text-align: right;
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold-bright, #c8a84e);
    }

    .skill-uses {
        border-left: 2px solid var(--dh2e-border, #4a4a55);
        margin-left: var(--dh2e-space-md, 0.75rem);
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
    }
</style>
