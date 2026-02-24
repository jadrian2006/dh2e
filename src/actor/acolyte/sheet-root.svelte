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
    import TabGroup from "../../sheet/components/tab-group.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

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
</script>

<div class="acolyte-sheet">
    <Header {ctx} />

    <TabGroup {tabs} bind:activeTab>
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
    </TabGroup>
</div>

<style lang="scss">
    .acolyte-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark);
    }
</style>
