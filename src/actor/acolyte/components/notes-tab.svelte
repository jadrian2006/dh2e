<script lang="ts">
    import PersonalObjectives from "./personal-objectives.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const objectives = $derived(ctx.items?.objectives ?? []);

    let notesContent = $derived(ctx.system?.details?.notes ?? "");
    let editorEl: HTMLDivElement | undefined = $state();

    /** Save notes to actor */
    async function saveNotes() {
        const actor = ctx.actor;
        if (!actor || !ctx.editable) return;
        const current = editorEl?.innerHTML ?? notesContent;
        if (current !== (ctx.system?.details?.notes ?? "")) {
            await actor.update({ "system.details.notes": current });
        }
    }

    // Save on unmount
    $effect(() => {
        return () => { saveNotes(); };
    });
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

    {#if ctx.editable}
        <div
            class="notes-editor"
            contenteditable="true"
            bind:this={editorEl}
            onblur={saveNotes}
        >{@html notesContent}</div>
    {:else}
        <div class="notes-readonly">{@html ctx.system?.details?.notes ?? ""}</div>
    {/if}
</div>

<style lang="scss">
    .notes-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 300px;
    }

    .notes-editor {
        flex: 1;
        min-height: 300px;
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.5;
        overflow-y: auto;
        outline: none;

        &:focus {
            border-color: var(--dh2e-gold, #b49545);
            box-shadow: 0 0 4px var(--dh2e-gold-dark, #7a6228);
        }
    }

    .notes-readonly {
        flex: 1;
        min-height: 300px;
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.5;
        overflow-y: auto;
    }
</style>
