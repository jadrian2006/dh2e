<script lang="ts">
    import { calculateArmourByLocation } from "../../../item/armour/helpers.ts";
    import type { HitLocationKey } from "../../../actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const locations: { key: HitLocationKey; label: string }[] = [
        { key: "head", label: "Head" },
        { key: "rightArm", label: "R. Arm" },
        { key: "leftArm", label: "L. Arm" },
        { key: "body", label: "Body" },
        { key: "rightLeg", label: "R. Leg" },
        { key: "leftLeg", label: "L. Leg" },
    ];

    const armourByLocation = $derived(() => {
        const armourItems = ctx.items?.armour ?? [];
        return calculateArmourByLocation(armourItems);
    });
</script>

<div class="armour-display">
    <h4 class="section-label">Armour by Location</h4>
    <div class="location-grid">
        {#each locations as loc}
            <div class="location-cell" class:protected={armourByLocation()[loc.key] > 0}>
                <span class="loc-label">{loc.label}</span>
                <span class="loc-ap">{armourByLocation()[loc.key]}</span>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .armour-display {
        margin-top: var(--dh2e-space-sm, 0.5rem);
    }

    .section-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
    }

    .location-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .location-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);

        &.protected {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }
    }

    .loc-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .loc-ap {
        font-size: var(--dh2e-text-md, 0.9rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .protected .loc-ap {
        color: var(--dh2e-gold-bright, #e8c84e);
    }
</style>
