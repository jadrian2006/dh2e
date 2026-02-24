<script lang="ts">
    import MemberCard from "./components/member-card.svelte";
    import CharComparison from "./components/char-comparison.svelte";
    import SkillComparison from "./components/skill-comparison.svelte";
    import TabGroup from "../../sheet/components/tab-group.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let activeTab = $state(ctx.activeTab ?? "overview");

    $effect(() => {
        ctx.setActiveTab?.(activeTab);
    });

    const tabs = [
        { id: "overview", label: "Overview", icon: "fa-solid fa-chart-bar" },
        { id: "skills", label: "Skills", icon: "fa-solid fa-book" },
    ];

    const isEmpty = $derived((ctx.memberCards?.length ?? 0) === 0);
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

    {#if !isEmpty}
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
    .member-strip {
        display: flex;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        overflow-x: auto;
        border-bottom: 1px solid var(--dh2e-border);
        background: var(--dh2e-bg-darkest);
    }
</style>
