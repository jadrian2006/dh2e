<script lang="ts">
    import Header from "./components/header.svelte";
    import SummaryTab from "./components/summary-tab.svelte";
    import SkillsTab from "./components/skills-tab.svelte";
    import TabGroup from "../../sheet/components/tab-group.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    let activeTab = $state("summary");

    const tabs = [
        { id: "summary", label: "Summary" },
        { id: "skills", label: "Skills" },
        { id: "combat", label: "Combat" },
        { id: "equipment", label: "Equipment" },
    ];
</script>

<div class="acolyte-sheet">
    <Header {ctx} />

    <TabGroup {tabs} bind:activeTab>
        {#if activeTab === "summary"}
            <SummaryTab {ctx} />
        {:else if activeTab === "skills"}
            <SkillsTab {ctx} />
        {:else if activeTab === "combat"}
            <div class="placeholder-tab">Combat tab — coming in Milestone 5</div>
        {:else if activeTab === "equipment"}
            <div class="placeholder-tab">Equipment tab — coming in Milestone 8</div>
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
    .placeholder-tab {
        color: var(--dh2e-text-secondary);
        font-style: italic;
        padding: var(--dh2e-space-xl);
        text-align: center;
    }
</style>
