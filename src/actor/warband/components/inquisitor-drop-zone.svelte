<script lang="ts">
    let { editable }: { editable: boolean } = $props();
</script>

{#if editable}
    <div class="inquisitor-drop-zone" data-drop-target="inquisitor">
        <i class="fa-solid fa-shield-halved zone-icon"></i>
        <span class="zone-hint">Drag an Acolyte or NPC here to set as Inquisitor</span>
    </div>
{/if}

<style lang="scss">
    .inquisitor-drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-md);
        border: 2px dashed var(--dh2e-gold-dark);
        border-radius: var(--dh2e-radius-md);
        background: var(--dh2e-bg-mid);
        min-height: 60px;
        transition: border-color var(--dh2e-transition-fast), background var(--dh2e-transition-fast);

        &:hover {
            border-color: var(--dh2e-gold);
            background: var(--dh2e-bg-darkest);
        }
    }
    .zone-icon {
        font-size: 1.5rem;
        color: var(--dh2e-gold-dark);
        opacity: 0.6;
    }
    .zone-hint {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
    }
</style>
