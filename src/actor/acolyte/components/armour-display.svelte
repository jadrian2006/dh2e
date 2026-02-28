<script lang="ts">
    import type { HitLocationKey } from "../../../actor/types.ts";

    let { ctx, role = "", background = "" }: { ctx: Record<string, any>; role?: string; background?: string } = $props();

    const VALID_ROLES = new Set([
        "assassin", "chirurgeon", "crusader", "desperado", "hierophant",
        "mystic", "sage", "seeker", "warrior",
    ]);

    const BACKGROUND_SLUGS: Record<string, string> = {
        "adeptus administratum": "adeptus-administratum",
        "adeptus arbites": "adeptus-arbites",
        "adeptus astra telepathica": "adeptus-astra-telepathica",
        "adeptus mechanicus": "adeptus-mechanicus",
        "adeptus ministorum": "adeptus-ministorum",
        "imperial guard": "imperial-guard",
        "outcast": "outcast",
    };

    const silhouetteSrc = $derived(() => {
        // Background-based PNG takes priority
        const bgKey = (background ?? "").toLowerCase().trim();
        const bgSlug = BACKGROUND_SLUGS[bgKey];
        if (bgSlug) return `systems/dh2e/icons/paperdoll/${bgSlug}.png`;
        // Fall back to role-based SVG
        const roleKey = (role ?? "").toLowerCase().trim();
        const roleSlug = VALID_ROLES.has(roleKey) ? roleKey : "default";
        return `systems/dh2e/icons/silhouettes/${roleSlug}.svg`;
    });

    /** Read armour from actor's derived data (includes equipped armour + cybernetic modifiers) */
    function ap(key: HitLocationKey): number {
        return ctx.system?.armour?.[key] ?? 0;
    }

    /** Build tooltip text showing armour source breakdown for a location */
    function apTooltip(key: HitLocationKey): string {
        const sources: { label: string; value: number }[] = ctx.system?.armourSources?.[key] ?? [];
        if (sources.length === 0) return "No armour";
        return sources.map(s => `${s.label}: ${s.value}`).join("\n");
    }
</script>

<div class="armour-paperdoll">
    <svg viewBox="0 0 200 320" class="silhouette" xmlns="http://www.w3.org/2000/svg">
        <!-- Role-based silhouette image -->
        <image
            href={silhouetteSrc()}
            x="0" y="0"
            width="200" height="320"
            preserveAspectRatio="xMidYMid meet"
        />

        <!-- AP value badges (hover for source breakdown) -->
        <!-- Head -->
        <g class="ap-badge" class:protected={ap("head") > 0}>
            <title>{apTooltip("head")}</title>
            <circle cx="100" cy="32" r="14" />
            <text x="100" y="37">{ap("head")}</text>
        </g>
        <!-- Body -->
        <g class="ap-badge" class:protected={ap("body") > 0}>
            <title>{apTooltip("body")}</title>
            <circle cx="100" cy="112" r="14" />
            <text x="100" y="117">{ap("body")}</text>
        </g>
        <!-- Right Arm (viewer's left) -->
        <g class="ap-badge" class:protected={ap("rightArm") > 0}>
            <title>{apTooltip("rightArm")}</title>
            <circle cx="44" cy="110" r="14" />
            <text x="44" y="115">{ap("rightArm")}</text>
        </g>
        <!-- Left Arm (viewer's right) -->
        <g class="ap-badge" class:protected={ap("leftArm") > 0}>
            <title>{apTooltip("leftArm")}</title>
            <circle cx="156" cy="110" r="14" />
            <text x="156" y="115">{ap("leftArm")}</text>
        </g>
        <!-- Right Leg (viewer's left) -->
        <g class="ap-badge" class:protected={ap("rightLeg") > 0}>
            <title>{apTooltip("rightLeg")}</title>
            <circle cx="80" cy="248" r="14" />
            <text x="80" y="253">{ap("rightLeg")}</text>
        </g>
        <!-- Left Leg (viewer's right) -->
        <g class="ap-badge" class:protected={ap("leftLeg") > 0}>
            <title>{apTooltip("leftLeg")}</title>
            <circle cx="120" cy="248" r="14" />
            <text x="120" y="253">{ap("leftLeg")}</text>
        </g>

        <!-- Location labels -->
        <text class="loc-label" x="100" y="8">Head</text>
        <text class="loc-label" x="16" y="98">R.Arm</text>
        <text class="loc-label" x="184" y="98">L.Arm</text>
        <text class="loc-label" x="100" y="88">Body</text>
        <text class="loc-label" x="62" y="228">R.Leg</text>
        <text class="loc-label" x="138" y="228">L.Leg</text>
    </svg>
</div>

<style lang="scss">
    .armour-paperdoll {
        display: flex;
        justify-content: center;
        padding: var(--dh2e-space-sm, 0.5rem) 0;
    }

    .silhouette {
        width: 180px;
        height: auto;
    }

    .ap-badge {
        cursor: help;

        circle {
            fill: var(--dh2e-bg-light, #3a3a45);
            stroke: var(--dh2e-border, #4a4a55);
            stroke-width: 1.5;
        }
        text {
            fill: var(--dh2e-text-secondary, #a0a0a8);
            font-size: 14px;
            font-weight: 700;
            text-anchor: middle;
            font-family: var(--dh2e-font-body, sans-serif);
        }

        &.protected {
            circle {
                fill: var(--dh2e-gold-dark, #7a6228);
                stroke: var(--dh2e-gold, #b49545);
            }
            text {
                fill: var(--dh2e-parchment-light, #e2d6c0);
            }
        }
    }

    .loc-label {
        fill: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 9px;
        text-anchor: middle;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-family: var(--dh2e-font-body, sans-serif);
    }
</style>
