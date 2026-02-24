<script lang="ts">
    import WeaponTray from "./components/weapon-tray.svelte";
    import ActionBar from "./components/action-bar.svelte";
    import QuickActions from "./components/quick-actions.svelte";
    import ConditionStrip from "./components/condition-strip.svelte";
    import TargetInfo from "./components/target-info.svelte";
    import ErrorBoundary from "../../ui/error-boundary.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
</script>

<div class="combat-hud-bar" class:my-turn={ctx.isMyTurn} role="toolbar" aria-label="Combat HUD">
    <div class="hud-section weapons">
        <ErrorBoundary label="Weapon Tray">
            <WeaponTray weapons={ctx.weapons ?? []} actor={ctx.actor} />
        </ErrorBoundary>
    </div>

    <div class="hud-section actions">
        <ErrorBoundary label="Action Bar">
            <ActionBar actions={ctx.actions} combatant={ctx.combatant} round={ctx.round} />
        </ErrorBoundary>
    </div>

    <div class="hud-section quick">
        <ErrorBoundary label="Quick Actions">
            <QuickActions actor={ctx.actor} actions={ctx.actions} combatant={ctx.combatant} />
        </ErrorBoundary>
    </div>

    <div class="hud-section conditions">
        <ErrorBoundary label="Conditions">
            <ConditionStrip conditions={ctx.conditions ?? []} />
        </ErrorBoundary>
    </div>

    {#if ctx.targetInfo}
        <div class="hud-section target">
            <ErrorBoundary label="Target Info">
                <TargetInfo info={ctx.targetInfo} />
            </ErrorBoundary>
        </div>
    {/if}
</div>

<style lang="scss">
    .combat-hud-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 100px;
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: 0 var(--dh2e-space-lg, 1rem);
        background: linear-gradient(
            to top,
            rgba(17, 17, 20, 0.95),
            rgba(17, 17, 20, 0.85)
        );
        border-top: 2px solid var(--dh2e-gold-dark, #9c7a28);
        backdrop-filter: blur(4px);
        z-index: 100;
        pointer-events: auto;
        animation: dh2e-slide-up 0.3s ease-out;

        &.my-turn {
            border-top-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .hud-section {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        height: 100%;
        padding: var(--dh2e-space-sm, 0.5rem) 0;

        &.weapons { flex: 2; }
        &.actions { flex: 1; }
        &.quick { flex: 1.5; }
        &.conditions { flex: 1; }
        &.target { flex: 1; }
    }
</style>
