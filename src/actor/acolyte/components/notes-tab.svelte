<script lang="ts">
    import PersonalObjectives from "./personal-objectives.svelte";
    import PersonalNotes from "./personal-notes.svelte";
    import RichTextEditor from "@sheet/components/rich-text-editor.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const objectives = $derived(ctx.items?.objectives ?? []);
    const notes = $derived(ctx.items?.notes ?? []);

    /** Save freeform notes to actor */
    async function saveFreeformNotes(html: string) {
        const actor = ctx.actor;
        if (!actor || !ctx.editable) return;
        if (html !== (ctx.system?.details?.notes ?? "")) {
            await actor.update({ "system.details.notes": html });
        }
    }
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

    <!-- Freeform Notes -->
    <div class="freeform-section">
        <h3 class="section-title">
            <i class="fa-solid fa-pen-nib"></i>
            Freeform Notes
        </h3>
        <div class="freeform-editor">
            <RichTextEditor
                content={ctx.system?.details?.notes ?? ""}
                editable={ctx.editable}
                onSave={saveFreeformNotes}
                document={ctx.actor}
                fieldName="system.details.notes"
            />
        </div>
    </div>
</div>

<style lang="scss">
    .notes-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: var(--dh2e-space-md, 0.75rem);
        min-height: 300px;
    }

    .freeform-section {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .section-title {
        font-family: var(--dh2e-font-header);
        font-size: 0.8rem;
        color: var(--dh2e-gold);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
        i { margin-right: 4px; font-size: 0.7rem; }
    }

    .freeform-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 200px;
    }
</style>
