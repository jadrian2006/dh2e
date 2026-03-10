<script lang="ts">
    import CombatActionRow from "./combat-action-row.svelte";
    import { COMBAT_ACTIONS, type CombatAction, type ActionGroup } from "./combat-actions.ts";
    import { executeCombatAction } from "./execute-combat-action.ts";
    import { isActorInCombat, getCombatantForActor } from "../combat-state.ts";

    let {
        actor,
        favoritesOnly = false,
    }: {
        actor: any;
        favoritesOnly?: boolean;
    } = $props();

    const inCombat = $derived(actor?.id ? isActorInCombat(actor.id) : false);
    const combatant = $derived(actor?.id ? getCombatantForActor(actor.id) : null);
    const actorRollOptions = $derived(
        (actor as any)?.synthetics?.rollOptions as Set<string> | undefined,
    );

    /** Check if actor has equipment for an action */
    function hasEquipment(action: CombatAction): boolean {
        if (!actor) return true;
        const items = actor.items ?? [];
        if (action.requiresMelee) {
            return items.some(
                (i: Item) => i.type === "weapon" && (i.system as any)?.class === "melee" && (i.system as any)?.equipped,
            );
        }
        if (action.requiresRanged) {
            return items.some((i: Item) => {
                const sys = (i.system as any);
                if (sys?.class !== "ranged" && sys?.class !== "pistol") return false;
                if (!sys?.equipped) return false;
                const fm = action.attackOptions?.fireMode;
                if (fm === "semi" && !(sys.rof?.semi > 0)) return false;
                if (fm === "full" && !(sys.rof?.full > 0)) return false;
                return true;
            });
        }
        return true;
    }

    /** Filter actions by visibility predicate and equipment */
    const visibleActions = $derived.by(() => {
        return COMBAT_ACTIONS.filter((a) => {
            // Deduplicate: skip charge in movement group (already in attack)
            if (a.slug === "charge" && a.group === "movement") return false;
            // Visibility predicate (talent-gated)
            if (a.visibilityPredicate && !actorRollOptions?.has(a.visibilityPredicate)) return false;
            // Equipment check
            if (!hasEquipment(a)) return false;
            return true;
        });
    });

    /** Check if an action is available based on current action economy */
    function isActionAvailable(action: CombatAction): boolean {
        if (!inCombat || !combatant) return true;
        const actions = combatant.actionsUsed ?? {};
        const maxReactions = combatant.maxReactions ?? 1;
        const reactionsUsed = actions.reactionsUsed ?? 0;

        if (action.actionCost === "free") return true;
        if (action.actionCost === "varies") return true;
        if (action.actionCost === "reaction") return reactionsUsed < maxReactions;
        if (action.actionCost === "half") return !actions.half && !actions.full;
        if (action.actionCost === "full") return !actions.full && !actions.half;
        return true;
    }

    /** Get favorites from actor flags */
    function isFavorite(slug: string): boolean {
        const favs = actor?.getFlag?.("dh2e", "favoriteCombatActions");
        return favs?.[slug] ?? false;
    }

    /** Check if any action in the group has a favorite */
    function groupHasFavorite(actions: CombatAction[]): boolean {
        return actions.some((a) => isFavorite(a.slug));
    }

    function toggleFavorite(slug: string) {
        if (!actor?.update) return;
        const favs = actor.getFlag?.("dh2e", "favoriteCombatActions") ?? {};
        if (favs[slug]) {
            actor.update({ [`flags.dh2e.favoriteCombatActions.-=${slug}`]: null });
        } else {
            actor.update({ [`flags.dh2e.favoriteCombatActions.${slug}`]: true });
        }
    }

    function handleClick(action: CombatAction, e: MouseEvent) {
        executeCombatAction(actor, action, { shiftKey: e.shiftKey });
    }

    /** Group actions by their group field */
    type GroupEntry = { key: ActionGroup; label: string; actions: CombatAction[] };
    const groups: GroupEntry[] = $derived.by(() => {
        const groupDefs: { key: ActionGroup; labelKey: string; fallback: string }[] = [
            { key: "attack", labelKey: "DH2E.CombatAction.Group.Attack", fallback: "Attack Actions" },
            { key: "movement", labelKey: "DH2E.CombatAction.Group.Movement", fallback: "Movement" },
            { key: "miscellaneous", labelKey: "DH2E.CombatAction.Group.Miscellaneous", fallback: "Other Actions" },
            { key: "reaction", labelKey: "DH2E.CombatAction.Group.Reaction", fallback: "Reactions" },
        ];

        return groupDefs
            .map((g) => ({
                key: g.key,
                label: game.i18n?.localize(g.labelKey) ?? g.fallback,
                actions: visibleActions
                    .filter((a) => a.group === g.key)
                    .sort((a, b) => a.sortOrder - b.sortOrder),
            }))
            .filter((g) => g.actions.length > 0);
    });

    /** Track expanded groups */
    let expanded: Record<string, boolean> = $state({
        attack: true,
        movement: true,
        miscellaneous: true,
        reaction: true,
    });

    function toggleGroup(key: string) {
        expanded[key] = !expanded[key];
    }
</script>

<div class="combat-actions-view">
    {#each groups as group}
        {@const hasFav = groupHasFavorite(group.actions)}
        {#if !favoritesOnly || hasFav}
        <div class="action-group">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="action-group-header"
                onclick={() => toggleGroup(group.key)}
                onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") toggleGroup(group.key); }}
                role="button"
                tabindex="0"
                aria-expanded={expanded[group.key]}
            >
                <i class="fas {expanded[group.key] ? 'fa-chevron-down' : 'fa-chevron-right'} chevron"></i>
                <span class="group-label">{group.label}</span>
                <span class="group-count">{group.actions.length}</span>
            </div>

            {#if expanded[group.key]}
            <div class="action-list">
                {#each group.actions as action}
                    {#if !favoritesOnly || isFavorite(action.slug)}
                    <CombatActionRow
                        {action}
                        available={isActionAvailable(action)}
                        favorite={isFavorite(action.slug)}
                        onToggleFavorite={() => toggleFavorite(action.slug)}
                        onClick={(e) => handleClick(action, e)}
                    />
                    {/if}
                {/each}
            </div>
            {/if}
        </div>
        {/if}
    {/each}
</div>

<style lang="scss">
    .combat-actions-view {
        display: flex;
        flex-direction: column;
    }

    .action-group-header {
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

    .group-label {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .group-count {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .action-list {
        border-left: 2px solid var(--dh2e-border, #4a4a55);
        margin-left: var(--dh2e-space-md, 0.75rem);
    }
</style>
