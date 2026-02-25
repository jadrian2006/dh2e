<script lang="ts">
    import PortraitSection from "./components/portrait-section.svelte";
    import CharGrid from "./components/char-grid.svelte";
    import ActionBar from "./components/action-bar.svelte";
    import HudHotbar from "./components/hud-hotbar.svelte";
    import WeaponTray from "./components/weapon-tray.svelte";
    import QuickActions from "./components/quick-actions.svelte";
    import ConditionStrip from "./components/condition-strip.svelte";
    import TargetInfo from "./components/target-info.svelte";
    import ErrorBoundary from "../../ui/error-boundary.svelte";
    import SkillActionsView from "../../actor/acolyte/components/skill-actions-view.svelte";
    import type { SkillUse } from "../../item/skill/data.ts";
    import { executeSkillUseRoll } from "../../item/skill/roll-skill-use.ts";
    import { CheckDH2e } from "../../check/check.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    /** Which pop-out panel is open (null = none) */
    let openPanel: "weapons" | "actions" | "quick" | null = $state(
        ctx._openPanel ?? null,
    );

    function togglePanel(panel: typeof openPanel) {
        openPanel = openPanel === panel ? null : panel;
        // Store on ctx so combat-hud.ts can persist it across re-renders
        ctx._openPanel = openPanel;
    }

    function onClickOutsidePanel(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.closest(".popout-panel") || target.closest(".panel-trigger")) return;
        openPanel = null;
        ctx._openPanel = null;
    }

    function onActionsUseRoll(skill: any, use: SkillUse, shiftKey: boolean) {
        const actor = ctx.actor;
        if (!actor) return;
        executeSkillUseRoll(actor, skill, use, CheckDH2e.shouldSkipDialog(shiftKey));
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="combat-hud-panel"
    class:my-turn={ctx.isMyTurn}
    onclick={onClickOutsidePanel}
    role="toolbar"
    aria-label="Combat HUD"
>
    {#if ctx.actor}
        <!-- Row 1: Portrait + Wounds + Fate -->
        <div class="hud-row portrait-row">
            <ErrorBoundary label="Portrait">
                <PortraitSection
                    tokenImg={ctx.tokenImg ?? ctx.actor?.img ?? "icons/svg/mystery-man.svg"}
                    name={ctx.actor?.name ?? "Unknown"}
                    background={ctx.system?.background ?? ""}
                    wounds={ctx.system?.wounds ?? { value: 0, max: 0 }}
                    fate={ctx.system?.fate ?? { current: 0, max: 0 }}
                />
            </ErrorBoundary>
        </div>

        <!-- Row 2: Characteristics grid -->
        <div class="hud-row char-row">
            <ErrorBoundary label="Characteristics">
                <CharGrid characteristics={ctx.characteristics ?? {}} />
            </ErrorBoundary>
        </div>

        <!-- Row 3: Action economy + Round -->
        <div class="hud-row action-row">
            <ErrorBoundary label="Action Bar">
                <ActionBar actions={ctx.actions} combatant={ctx.combatant} round={ctx.round} />
            </ErrorBoundary>
        </div>

        <!-- Row 4: Hotbar (10 configurable slots) -->
        <div class="hud-row hotbar-row">
            <ErrorBoundary label="HUD Hotbar">
                <HudHotbar slots={ctx.hudSlots ?? []} actor={ctx.actor} />
            </ErrorBoundary>
        </div>

        <!-- Row 5: Panel triggers -->
        <div class="hud-row panel-row">
            <button class="panel-trigger" class:active={openPanel === "weapons"} onclick={(e) => { e.stopPropagation(); togglePanel("weapons"); }}>
                <i class="fa-solid fa-crosshairs"></i>
                <span>{game.i18n?.localize?.("DH2E.HUD.Weapons") ?? "Weapons"}</span>
            </button>
            <button class="panel-trigger" class:active={openPanel === "actions"} onclick={(e) => { e.stopPropagation(); togglePanel("actions"); }}>
                <i class="fa-solid fa-bolt"></i>
                <span>{game.i18n?.localize?.("DH2E.HUD.Actions") ?? "Actions"}</span>
            </button>
            <button class="panel-trigger" class:active={openPanel === "quick"} onclick={(e) => { e.stopPropagation(); togglePanel("quick"); }}>
                <i class="fa-solid fa-person-running"></i>
                <span>{game.i18n?.localize?.("DH2E.HUD.Quick") ?? "Quick"}</span>
            </button>
        </div>

        <!-- Row 6: Conditions strip -->
        <div class="hud-row condition-row">
            <ErrorBoundary label="Conditions">
                <ConditionStrip conditions={ctx.conditions ?? []} />
            </ErrorBoundary>
        </div>

        <!-- Pop-out panels (appear ABOVE the HUD) -->
        {#if openPanel === "weapons"}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="popout-panel weapons-popout" onclick={(e) => e.stopPropagation()}>
                <ErrorBoundary label="Weapon Tray">
                    <WeaponTray weapons={ctx.weapons ?? []} actor={ctx.actor} />
                </ErrorBoundary>
            </div>
        {/if}

        {#if openPanel === "actions"}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="popout-panel actions-popout" onclick={(e) => e.stopPropagation()}>
                <ErrorBoundary label="Actions Grid">
                    <div class="popout-scroll">
                        <SkillActionsView
                            skills={ctx.skills ?? []}
                            actor={ctx.actor}
                            onUseRoll={onActionsUseRoll}
                        />
                    </div>
                </ErrorBoundary>
            </div>
        {/if}

        {#if openPanel === "quick"}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="popout-panel quick-popout" onclick={(e) => e.stopPropagation()}>
                <ErrorBoundary label="Quick Actions">
                    <QuickActions actor={ctx.actor} actions={ctx.actions} combatant={ctx.combatant} />
                </ErrorBoundary>
            </div>
        {/if}

        <!-- Floating target info (to the right) -->
        {#if ctx.targetInfo}
            <div class="target-float">
                <ErrorBoundary label="Target Info">
                    <TargetInfo info={ctx.targetInfo} />
                </ErrorBoundary>
            </div>
        {/if}
    {:else}
        <div class="hud-no-actor">
            <span>No character assigned</span>
        </div>
    {/if}
</div>

<style lang="scss">
    .combat-hud-panel {
        position: fixed;
        bottom: 16px;
        left: 16px;
        width: 380px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: linear-gradient(
            to top,
            rgba(17, 17, 20, 0.97),
            rgba(17, 17, 20, 0.92)
        );
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        backdrop-filter: blur(6px);
        z-index: 100;
        pointer-events: auto;
        animation: dh2e-slide-up 0.3s ease-out;

        &.my-turn {
            border-color: var(--dh2e-gold, #c8a84e);
            box-shadow: 0 0 12px rgba(200, 168, 78, 0.2);
        }
    }

    .hud-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        width: 100%;
    }

    .portrait-row {
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .char-row {
        padding: var(--dh2e-space-xxs, 0.125rem) 0;
    }

    .action-row {
        padding: var(--dh2e-space-xxs, 0.125rem) 0;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .hotbar-row {
        padding: var(--dh2e-space-xs, 0.25rem) 0;
    }

    .panel-row {
        display: flex;
        gap: 3px;
    }

    .panel-trigger {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        padding: 3px 8px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.6rem;
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);

        i { font-size: 0.55rem; }

        &:hover {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
            color: var(--dh2e-text-primary, #d0cfc8);
        }

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-bg-darkest, #111114);
        }
    }

    .condition-row {
        padding-top: var(--dh2e-space-xxs, 0.125rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }

    /* Pop-out panels — positioned above the HUD */
    .popout-panel {
        position: absolute;
        bottom: 100%;
        left: 0;
        width: 100%;
        margin-bottom: 4px;
        background: rgba(17, 17, 20, 0.97);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        backdrop-filter: blur(6px);
        padding: var(--dh2e-space-sm, 0.5rem);
        animation: dh2e-fade-in 0.15s ease-out;
        z-index: 101;
    }

    .popout-scroll {
        max-height: 300px;
        overflow-y: auto;
    }

    /* Target info floats to the right */
    .target-float {
        position: absolute;
        left: calc(100% + 8px);
        bottom: 0;
        min-width: 120px;
        max-width: 180px;
        background: rgba(17, 17, 20, 0.95);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
    }

    .hud-no-actor {
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-style: italic;
    }

    @keyframes dh2e-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
