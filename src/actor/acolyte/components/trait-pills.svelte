<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    interface TraitItem {
        name: string;
        _id?: string;
        system: {
            description?: string;
            hasRating?: boolean;
            rating?: number;
            category?: string;
        };
        sheet?: { render: (force: boolean) => void };
        delete: () => Promise<void>;
    }

    const traits = $derived<TraitItem[]>((ctx.items?.traits ?? []).toSorted((a: TraitItem, b: TraitItem) => a.name.localeCompare(b.name)));

    const categoryLabels: Record<string, string> = {
        physical: "Physical",
        mental: "Mental",
        warp: "Warp",
    };

    function editTrait(trait: TraitItem) {
        trait.sheet?.render(true);
    }

    async function deleteTrait(trait: TraitItem) {
        await trait.delete();
    }
</script>

{#if traits.length > 0}
    <div class="trait-pills">
        {#each traits as trait}
            <button
                class="trait-pill cat-{trait.system?.category ?? 'physical'}"
                type="button"
                onclick={() => editTrait(trait)}
                title={trait.system?.description ?? ""}
            >
                <span class="trait-cat-badge">{categoryLabels[trait.system?.category ?? "physical"] ?? "Physical"}</span>
                {trait.name}{#if trait.system?.hasRating} ({trait.system.rating}){/if}
                {#if ctx.editable}
                    <span class="trait-delete" onclick={(e) => { e.stopPropagation(); deleteTrait(trait); }} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter") { e.stopPropagation(); deleteTrait(trait); } }}>&times;</span>
                {/if}
            </button>
        {/each}
    </div>
{/if}

<style lang="scss">
    .trait-pills {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .trait-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.5rem;
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        border: 1px solid transparent;
        transition: border-color var(--dh2e-transition-fast, 0.15s);

        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); }

        &.cat-physical {
            background: rgba(102, 180, 102, 0.12);
            border-color: rgba(102, 180, 102, 0.25);
        }
        &.cat-mental {
            background: rgba(102, 140, 220, 0.12);
            border-color: rgba(102, 140, 220, 0.25);
        }
        &.cat-warp {
            background: rgba(180, 102, 220, 0.12);
            border-color: rgba(180, 102, 220, 0.25);
        }
    }

    .trait-cat-badge {
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.6;
    }

    .trait-delete {
        font-size: 0.85rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        margin-left: 0.1rem;
        &:hover { color: var(--dh2e-red-bright, #d44); }
    }
</style>
