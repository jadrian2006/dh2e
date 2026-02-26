<script lang="ts">
    import MemberCard from "./components/member-card.svelte";
    import InquisitorCard from "./components/inquisitor-card.svelte";
    import InquisitorDropZone from "./components/inquisitor-drop-zone.svelte";
    import CharComparison from "./components/char-comparison.svelte";
    import SkillComparison from "./components/skill-comparison.svelte";
    import ObjectivesTab from "./components/objectives-tab.svelte";
    import InventoryTab from "./components/inventory-tab.svelte";
    import PendingRequisitions from "./components/pending-requisitions.svelte";
    import ChronicleTab from "./components/chronicle-tab.svelte";
    import ReinforcementsTab from "./components/reinforcements-tab.svelte";
    import TabGroup from "../../sheet/components/tab-group.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let activeTab = $state(ctx.activeTab ?? "overview");

    $effect(() => {
        ctx.setActiveTab?.(activeTab);
    });

    const tabs = [
        { id: "overview", label: "Overview", icon: "fa-solid fa-chart-bar" },
        { id: "skills", label: "Skills", icon: "fa-solid fa-book" },
        { id: "inventory", label: "Inventory", icon: "fa-solid fa-warehouse" },
        { id: "reinforcements", label: "Reinforcements", icon: "fa-solid fa-users-gear" },
        { id: "objectives", label: "Objectives", icon: "fa-solid fa-scroll" },
        { id: "chronicle", label: "Chronicle", icon: "fa-solid fa-clock-rotate-left" },
    ];

    const isEmpty = $derived((ctx.memberCards?.length ?? 0) === 0 && !ctx.inquisitor);
    const hasInquisitor = $derived(!!ctx.inquisitor);
</script>

<div class="warband-sheet">
    <header class="warband-header">
        <h1 class="warband-name">{ctx.name}</h1>
        {#if isEmpty}
            <p class="drag-hint">
                <i class="fa-solid fa-hand-pointer"></i>
                Drag Acolyte actors here to add members
            </p>
        {/if}
    </header>

    <!-- Inquisitor Section -->
    <section class="inquisitor-section" data-drop-target="inquisitor">
        {#if hasInquisitor}
            <InquisitorCard
                inquisitor={ctx.inquisitor}
                editable={ctx.editable}
                onRemove={() => ctx.removeInquisitor?.()}
                onOpen={() => ctx.openInquisitorSheet?.()}
            />
        {:else}
            <InquisitorDropZone editable={ctx.editable} />
        {/if}
    </section>

    {#if !isEmpty || hasInquisitor}
        <section class="member-strip">
            {#each ctx.memberCards as card (card.uuid)}
                <MemberCard
                    {card}
                    editable={ctx.editable}
                    onRemove={() => ctx.removeMember?.(card.uuid)}
                    onOpen={() => ctx.openMemberSheet?.(card.actor)}
                />
            {/each}
        </section>

        <TabGroup {tabs} bind:activeTab>
            {#if activeTab === "overview"}
                <CharComparison
                    members={ctx.memberCards}
                    charKeys={ctx.charKeys}
                    comparison={ctx.charComparison}
                />
            {:else if activeTab === "skills"}
                <SkillComparison
                    members={ctx.memberCards}
                    skills={ctx.skillComparison}
                />
            {:else if activeTab === "inventory"}
                <InventoryTab {ctx} />
                <PendingRequisitions {ctx} />
            {:else if activeTab === "reinforcements"}
                <ReinforcementsTab {ctx} />
            {:else if activeTab === "objectives"}
                <ObjectivesTab
                    objectives={ctx.objectives ?? []}
                    canManage={ctx.canAssignObjectives ?? false}
                    onAdd={() => ctx.addObjective?.()}
                    onOpenObjective={(obj) => ctx.openObjective?.(obj)}
                    onComplete={(obj) => ctx.changeObjectiveStatus?.(obj, "completed")}
                    onFail={(obj) => ctx.changeObjectiveStatus?.(obj, "failed")}
                    onReactivate={(obj) => ctx.changeObjectiveStatus?.(obj, "active")}
                    onDelete={(obj) => ctx.deleteObjective?.(obj)}
                />
            {:else if activeTab === "chronicle"}
                <ChronicleTab {ctx} />
            {/if}
        </TabGroup>
    {/if}
</div>

<style lang="scss">
    .warband-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark);
    }
    .warband-header {
        padding: var(--dh2e-space-md);
        border-bottom: 2px solid var(--dh2e-gold-dark);
    }
    .warband-name {
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-xxl);
        color: var(--dh2e-gold);
        margin: 0;
    }
    .drag-hint {
        color: var(--dh2e-text-secondary);
        font-style: italic;
        margin: var(--dh2e-space-sm) 0 0;
        i { margin-right: var(--dh2e-space-xs); }
    }
    .inquisitor-section {
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
    }
    .member-strip {
        display: flex;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        overflow-x: auto;
        border-bottom: 1px solid var(--dh2e-border);
        background: var(--dh2e-bg-darkest);
    }
</style>
