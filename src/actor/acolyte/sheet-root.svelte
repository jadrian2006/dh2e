<script lang="ts">
    import Header from "./components/header.svelte";
    import OriginsTab from "./components/origins-tab.svelte";
    import SummaryTab from "./components/summary-tab.svelte";
    import SkillsTab from "./components/skills-tab.svelte";
    import TalentsTab from "./components/talents-tab.svelte";
    import PowersTab from "./components/powers-tab.svelte";
    import CombatTab from "./components/combat-tab.svelte";
    import EquipmentTab from "./components/equipment-tab.svelte";
    import NotesTab from "./components/notes-tab.svelte";
    import LogTab from "./components/log-tab.svelte";
    import CompactView from "./components/compact-view.svelte";
    import CombatView from "./components/combat-view.svelte";
    import TabGroup from "../../sheet/components/tab-group.svelte";
    import ErrorBoundary from "../../ui/error-boundary.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const viewMode: string = ctx.viewMode ?? "full";

    // Read initial tab from sheet class (persisted across remounts)
    let activeTab = $state(ctx.activeTab ?? "summary");

    // Sync tab changes back to the sheet class so they persist across re-renders
    $effect(() => {
        ctx.setActiveTab?.(activeTab);
    });

    /** Show Powers tab if character has any power items or a Psy Rating talent */
    const showPowers = $derived(
        (ctx.items?.powers?.length ?? 0) > 0
        || (ctx.items?.talents ?? []).some((t: any) => t.name === "Psy Rating"),
    );

    const tabs = $derived([
        { id: "summary", label: "Summary", icon: "fa-solid fa-scroll" },
        { id: "origins", label: "Origins", icon: "fa-solid fa-globe" },
        { id: "skills", label: "Skills", icon: "fa-solid fa-book" },
        { id: "talents", label: "Talents", icon: "fa-solid fa-star" },
        ...(showPowers ? [{ id: "powers", label: "Powers", icon: "fa-solid fa-hat-wizard" }] : []),
        { id: "combat", label: "Combat", icon: "fa-solid fa-crosshairs" },
        { id: "equipment", label: "Equipment", icon: "fa-solid fa-suitcase" },
        { id: "notes", label: "Notes", icon: "fa-solid fa-pen-fancy" },
        { id: "log", label: "Log", icon: "fa-solid fa-clock-rotate-left" },
    ]);

    const viewModes = [
        { id: "full", icon: "fa-solid fa-table-columns", title: "Full View" },
        { id: "compact", icon: "fa-solid fa-compress", title: "Compact View" },
        { id: "combat", icon: "fa-solid fa-crosshairs", title: "Combat View" },
    ];
</script>

<div class="acolyte-sheet">
    <Header {ctx} />

    <!-- View mode selector -->
    <div class="view-mode-bar">
        <div class="bar-left">
            {#if !ctx.system?.details?.homeworld && ctx.openWizard}
                <button class="bar-action-btn wizard" type="button" onclick={() => ctx.openWizard?.()}>
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Creation Wizard
                </button>
            {/if}
            {#if ctx.system?.details?.homeworld}
                <button class="bar-action-btn levelup" type="button" onclick={() => ctx.openShop?.()}>
                    <i class="fa-solid fa-arrow-up"></i> Level Up
                </button>
            {/if}
        </div>
        <div class="bar-right" role="tablist" aria-label="Sheet view mode">
            {#each viewModes as vm}
                <button
                    class="view-mode-btn"
                    class:active={viewMode === vm.id}
                    onclick={() => ctx.setViewMode?.(vm.id)}
                    title={vm.title}
                    role="tab"
                    aria-selected={viewMode === vm.id}
                    aria-label={vm.title}
                >
                    <i class={vm.icon}></i>
                </button>
            {/each}
        </div>
    </div>

    {#if viewMode === "compact"}
        <div class="view-content">
            <ErrorBoundary label="Compact View">
                <CompactView {ctx} />
            </ErrorBoundary>
        </div>
    {:else if viewMode === "combat"}
        <div class="view-content">
            <ErrorBoundary label="Combat View">
                <CombatView {ctx} />
            </ErrorBoundary>
        </div>
    {:else}
        <TabGroup {tabs} bind:activeTab>
            <ErrorBoundary label={activeTab}>
                {#if activeTab === "summary"}
                    <SummaryTab {ctx} />
                {:else if activeTab === "origins"}
                    <OriginsTab {ctx} />
                {:else if activeTab === "skills"}
                    <SkillsTab {ctx} />
                {:else if activeTab === "talents"}
                    <TalentsTab {ctx} />
                {:else if activeTab === "powers"}
                    <PowersTab {ctx} />
                {:else if activeTab === "combat"}
                    <CombatTab {ctx} />
                {:else if activeTab === "equipment"}
                    <EquipmentTab {ctx} />
                {:else if activeTab === "notes"}
                    <NotesTab {ctx} />
                {:else if activeTab === "log"}
                    <LogTab {ctx} />
                {/if}
            </ErrorBoundary>
        </TabGroup>
    {/if}
</div>

<style lang="scss">
    .acolyte-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark);
    }
    .view-mode-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }
    .bar-left {
        display: flex;
        gap: 4px;
    }
    .bar-right {
        display: flex;
        gap: 2px;
    }
    .bar-action-btn {
        background: none;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 2px 8px;
        font-size: 0.65rem;
        display: flex;
        align-items: center;
        gap: 4px;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }
        &.wizard {
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }
        &.levelup i { font-size: 0.6rem; }
    }
    .view-mode-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        padding: 3px 8px;
        font-size: 0.75rem;
        &:hover { color: var(--dh2e-gold, #c8a84e); }
        &.active {
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }
    .view-content {
        flex: 1;
        overflow-y: auto;
    }
</style>
