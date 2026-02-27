<script lang="ts">
    import PersonalObjectives from "./personal-objectives.svelte";
    import PersonalNotes from "./personal-notes.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const objectives = $derived(ctx.items?.objectives ?? []);
    const notes = $derived(ctx.items?.notes ?? []);
</script>

<div class="notes-tab">
    <!-- Personal Objectives -->
    <PersonalObjectives
        {objectives}
        editable={ctx.editable}
        onAdd={() => ctx.addPersonalObjective?.()}
        onOpen={(obj) => ctx.openObjective?.(obj)}
        onComplete={(obj) => ctx.completeObjective?.(obj)}
        onFail={(obj) => ctx.failObjective?.(obj)}
        onReactivate={(obj) => ctx.reactivateObjective?.(obj)}
        onDelete={(obj) => ctx.deleteObjective?.(obj)}
    />

    <!-- Personal Notes -->
    <PersonalNotes
        {notes}
        editable={ctx.editable}
        onAdd={() => ctx.addPersonalNote?.()}
        onOpen={(note) => ctx.openNote?.(note)}
        onDelete={(note) => ctx.deleteNote?.(note)}
    />
</div>

<style lang="scss">
    .notes-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: var(--dh2e-space-md, 0.75rem);
        min-height: 300px;
    }
</style>
