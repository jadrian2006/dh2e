<script lang="ts">
    import Homeworld from "./steps/homeworld.svelte";
    import Background from "./steps/background.svelte";
    import Role from "./steps/role.svelte";
    import Divination from "./steps/divination.svelte";
    import Characteristics from "./steps/characteristics.svelte";
    import Advancement from "./steps/advancement.svelte";
    import type {
        CreationData,
        HomeworldOption,
        BackgroundOption,
        RoleOption,
        DivinationResult,
        WizardPurchase,
    } from "./types.ts";
    import type { CharacteristicAbbrev } from "../actor/types.ts";
    import { getSetting } from "../ui/settings/settings.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    // Static data from the wizard (loaded once, never changes)
    const data: CreationData = ctx.data;
    const charGenMethod = (ctx.charGenMethod ?? "rolled") as "rolled" | "rolled25" | "points";
    const startingXP = (ctx.startingXP ?? 1000) as number;
    const wizardScale = (ctx.wizardScale ?? 100) as number;
    const divinationRerolls = (ctx.divinationRerolls ?? 1) as number;
    const onFinish = ctx.onFinish as (state: Record<string, unknown>) => void;
    const onCancel = ctx.onCancel as () => void;

    // All wizard state lives HERE, in Svelte-reactive $state
    let step = $state(0);
    let homeworld = $state<HomeworldOption | null>(null);
    let background = $state<BackgroundOption | null>(null);
    let role = $state<RoleOption | null>(null);
    let divination = $state<DivinationResult | null>(null);
    let woundsRoll = $state<number | null>(null);

    // Gear choices state (for background "or" equipment)
    let gearChoices = $state<Record<number, string>>({});

    // Advancement state
    let purchases = $state<WizardPurchase[]>([]);
    let xpSpent = $state(0);

    // Reset gear choices when background changes
    $effect(() => {
        background; // track dependency
        gearChoices = {};
    });

    const charOrder = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"] as const;
    const charNames: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    // Characteristics state — owned here, bound to the Characteristics step
    let characteristics = $state<Record<CharacteristicAbbrev, number>>(
        Object.fromEntries(charOrder.map(k => [k, 25])) as Record<CharacteristicAbbrev, number>,
    );

    // Dynamic step labels — insert Advancement step if startingXP > 0
    const showAdvancement = $derived(startingXP > 0);
    const stepLabels = $derived([
        "Homeworld", "Background", "Role", "Divination", "Characteristics",
        ...(showAdvancement ? ["Advancement"] : []),
        "Review",
    ]);
    const lastStep = $derived(stepLabels.length - 1);

    function next() {
        if (step < lastStep) step++;
    }

    function prev() {
        if (step > 0) step--;
    }

    function finish() {
        onFinish({
            homeworld,
            background,
            role,
            divination,
            characteristics: { ...characteristics },
            woundsRoll,
            gearChoices: { ...gearChoices },
            purchases: [...purchases],
            xpSpent,
        });
    }
</script>

<div class="wizard" style:zoom={wizardScale / 100}>
    <nav class="progress-bar">
        {#each stepLabels as label, i}
            <div class="progress-step" class:active={i === step} class:done={i < step}>
                <span class="step-number">{i + 1}</span>
                <span class="step-label">{label}</span>
            </div>
            {#if i < stepLabels.length - 1}
                <span class="progress-line" class:filled={i < step}></span>
            {/if}
        {/each}
    </nav>

    <div class="wizard-body">
        {#if step === 0}
            <Homeworld {data} bind:selected={homeworld} />
        {:else if step === 1}
            <Background {data} bind:selected={background} bind:gearChoices />
        {:else if step === 2}
            <Role {data} bind:selected={role} />
        {:else if step === 3}
            <Divination {data} bind:selected={divination} maxRerolls={divinationRerolls} />
        {:else if step === 4}
            <Characteristics
                method={charGenMethod}
                {homeworld}
                bind:characteristics
                bind:woundsRoll
                maxWoundsRerolls={getSetting<number>("woundsRerolls")}
            />
        {:else if showAdvancement && step === 5}
            <Advancement
                {startingXP}
                {homeworld}
                {background}
                {role}
                bind:purchases
                bind:xpSpent
            />
        {:else if step === lastStep}
            <div class="review-step">
                <h3 class="step-title">Review</h3>
                <p class="step-desc">Review your choices before creating the character.</p>

                <div class="char-review">
                    {#each charOrder as key}
                        {@const isPositive = homeworld?.characteristicBonuses?.positive?.includes(key)}
                        {@const isNegative = homeworld?.characteristicBonuses?.negative?.includes(key)}
                        <div class="char-field" class:has-bonus={isPositive} class:has-penalty={isNegative}>
                            <span class="char-label">{charNames[key]}</span>
                            <span class="char-value">{characteristics[key]}</span>
                            {#if isPositive}
                                <span class="char-mod bonus">+</span>
                            {:else if isNegative}
                                <span class="char-mod penalty">-</span>
                            {/if}
                        </div>
                    {/each}
                </div>

                <div class="review-summary">
                    <div class="review-item">
                        <span class="review-label">Homeworld</span>
                        <span class="review-value">{homeworld?.name || "—"}</span>
                        {#if homeworld?.characteristicBonuses}
                            <span class="review-detail bonus">
                                +5 {homeworld.characteristicBonuses.positive.map((k: string) => k.toUpperCase()).join(", ")}
                            </span>
                            <span class="review-detail penalty">
                                -5 {homeworld.characteristicBonuses.negative.map((k: string) => k.toUpperCase()).join(", ")}
                            </span>
                        {/if}
                    </div>
                    <div class="review-item">
                        <span class="review-label">Background</span>
                        <span class="review-value">{background?.name || "—"}</span>
                        {#if background?.aptitude}
                            <span class="review-detail">Aptitude: {background.aptitude}</span>
                        {/if}
                    </div>
                    <div class="review-item">
                        <span class="review-label">Role</span>
                        <span class="review-value">{role?.name || "—"}</span>
                        {#if role?.aptitudes}
                            <span class="review-detail">
                                {role.aptitudes.join(", ")}
                            </span>
                        {/if}
                    </div>
                    <div class="review-item">
                        <span class="review-label">Divination</span>
                        <span class="review-value divination-text">{divination?.text || "—"}</span>
                        {#if divination?.effect}
                            <span class="review-detail">{divination.effect}</span>
                        {/if}
                    </div>
                </div>

                <!-- Wounds Roll -->
                <div class="review-wounds">
                    <span class="review-label">Wounds</span>
                    {#if woundsRoll !== null}
                        <span class="review-value wounds-rolled">{woundsRoll}</span>
                        <span class="review-detail">rolled from {homeworld?.woundsFormula ?? "?"}</span>
                    {:else}
                        <span class="review-value">{homeworld?.wounds ?? "—"}</span>
                        <span class="review-detail warning">Not rolled — using flat value</span>
                    {/if}
                </div>

                <!-- Advancement Purchases -->
                {#if purchases.length > 0}
                    <div class="review-purchases">
                        <span class="review-label">Advancement ({purchases.length} purchase{purchases.length > 1 ? "s" : ""})</span>
                        <span class="review-detail">{xpSpent} XP spent, {startingXP - xpSpent} remaining</span>
                        {#each purchases as p}
                            <span class="review-detail">{p.label} — {p.sublabel} ({p.cost} XP)</span>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <footer class="wizard-footer">
        <button class="btn cancel-btn" type="button" onclick={onCancel}>Cancel</button>
        <div class="footer-spacer"></div>
        {#if step > 0}
            <button class="btn prev-btn" type="button" onclick={prev}>Back</button>
        {/if}
        {#if step < lastStep}
            <button class="btn next-btn" type="button" onclick={next}>Next</button>
        {:else}
            <button class="btn finish-btn" type="button" onclick={finish}>Create Character</button>
        {/if}
    </footer>
</div>

<style lang="scss">
    .wizard {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .progress-bar {
        display: flex;
        align-items: center;
        gap: 0;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-darkest, #111114);
        border-bottom: 2px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .progress-step {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        opacity: 0.4;

        &.active { opacity: 1; }
        &.done { opacity: 0.7; }
    }

    .step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        font-size: 0.6rem;
        font-weight: 700;
    }

    .active .step-number {
        background: var(--dh2e-gold-dark, #9c7a28);
        border-color: var(--dh2e-gold, #c8a84e);
        color: var(--dh2e-bg-darkest, #111114);
    }

    .done .step-number {
        background: var(--dh2e-success, #4a8);
        border-color: var(--dh2e-success, #4a8);
        color: #fff;
    }

    .step-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .active .step-label { color: var(--dh2e-gold, #c8a84e); }

    .progress-line {
        flex: 1;
        height: 1px;
        background: var(--dh2e-border, #4a4a55);
        margin: 0 var(--dh2e-space-xs, 0.25rem);

        &.filled { background: var(--dh2e-success, #4a8); }
    }

    .wizard-body {
        flex: 1;
        overflow-y: auto;
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .wizard-footer {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }

    .footer-spacer { flex: 1; }

    .btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-lg, 1rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-weight: 600;
    }

    .cancel-btn {
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .prev-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .next-btn, .finish-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);

        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    .step-title {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .step-desc {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-bottom: var(--dh2e-space-md, 0.75rem);
    }

    .char-review {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--dh2e-space-sm, 0.5rem);
        margin-bottom: var(--dh2e-space-md, 0.75rem);
    }

    .char-field {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .char-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 700;
    }

    .char-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .char-mod {
        font-size: 0.65rem;
        font-weight: 700;
        &.bonus { color: #6c6; }
        &.penalty { color: #c66; }
    }

    .has-bonus .char-label { color: #6c6; }
    .has-penalty .char-label { color: #c66; }

    .review-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .review-item {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .review-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .review-value {
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .review-detail {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);

        &.bonus { color: #5a5; }
        &.penalty { color: #c55; }
    }

    .divination-text {
        font-style: italic;
    }

    .review-wounds, .review-purchases {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
        margin-top: var(--dh2e-space-sm, 0.5rem);
    }

    .wounds-rolled {
        color: var(--dh2e-success, #4a8);
        font-weight: 700;
    }

    .review-detail.warning {
        color: #d4a843;
    }

</style>
