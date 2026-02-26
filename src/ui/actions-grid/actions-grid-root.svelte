<script lang="ts">
    import SkillActionsView from "../../actor/acolyte/components/skill-actions-view.svelte";
    import type { SkillUse } from "../../item/skill/data.ts";
    import { executeSkillUseRoll } from "../../item/skill/roll-skill-use.ts";
    import { CheckDH2e } from "../../check/check.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let favoritesOnly = $state(false);

    function onUseRoll(skill: any, use: SkillUse, shiftKey: boolean) {
        const actor = ctx.actor;
        if (!actor) return;
        executeSkillUseRoll(actor, skill, use, CheckDH2e.shouldSkipDialog(shiftKey));
    }
</script>

<div class="actions-grid-root">
    {#if ctx.actor}
        <div class="ag-header">
            <span class="ag-actor-name">{ctx.actor.name}</span>
            <label class="ag-filter">
                <input type="checkbox" bind:checked={favoritesOnly} />
                <span>{game.i18n?.localize?.("DH2E.ActionsGrid.FavoritesOnly") ?? "Favorites Only"}</span>
            </label>
        </div>

        <div class="ag-content">
            <SkillActionsView
                skills={ctx.skills ?? []}
                actor={ctx.actor}
                {onUseRoll}
                {favoritesOnly}
            />
        </div>
    {:else}
        <div class="ag-no-actor">
            <i class="fas fa-user-slash"></i>
            <p>{game.i18n?.localize?.("DH2E.Macro.NoActor") ?? "No actor found. Assign a character or select a token."}</p>
        </div>
    {/if}
</div>

<style lang="scss">
    .actions-grid-root {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .ag-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        flex-shrink: 0;
    }

    .ag-actor-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
    }

    .ag-filter {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;

        input { cursor: pointer; }
    }

    .ag-content {
        flex: 1;
        overflow-y: auto;
        padding: var(--dh2e-space-sm, 0.5rem);

    }

    .ag-no-actor {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-md, 0.75rem);
        height: 100%;
        color: var(--dh2e-text-secondary, #a0a0a8);

        i { font-size: 2rem; }
        p {
            font-size: var(--dh2e-text-sm, 0.8rem);
            text-align: center;
            margin: 0;
        }
    }
</style>
