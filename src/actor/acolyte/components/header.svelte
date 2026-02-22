<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    $effect(() => {
        // Keep derived values reactive
    });
</script>

<header class="acolyte-header">
    <img src={ctx.img} alt={ctx.name} class="portrait" />

    <div class="identity">
        <h1 class="name">{ctx.name}</h1>
        <div class="details-line">
            {#if ctx.system?.details?.homeworld}
                <span class="detail">{ctx.system.details.homeworld}</span>
            {/if}
            {#if ctx.system?.details?.background}
                <span class="detail">{ctx.system.details.background}</span>
            {/if}
            {#if ctx.system?.details?.role}
                <span class="detail">{ctx.system.details.role}</span>
            {/if}
        </div>
    </div>

    <div class="vital-stats">
        <div class="stat wounds" class:critical={ctx.system?.wounds?.value <= 0}>
            <span class="stat-label">W</span>
            <span class="stat-value">{ctx.system?.wounds?.value ?? 0}/{ctx.system?.wounds?.max ?? 0}</span>
        </div>
        <div class="stat fate">
            <span class="stat-label">F</span>
            <span class="stat-value">{ctx.system?.fate?.value ?? 0}/{ctx.system?.fate?.max ?? 0}</span>
        </div>
        <div class="stat corruption">
            <span class="stat-label">C</span>
            <span class="stat-value">{ctx.system?.corruption ?? 0}</span>
        </div>
        <div class="stat insanity">
            <span class="stat-label">I</span>
            <span class="stat-value">{ctx.system?.insanity ?? 0}</span>
        </div>
        <div class="stat influence">
            <span class="stat-label">Inf</span>
            <span class="stat-value">{ctx.system?.influence ?? 0}</span>
        </div>
    </div>
</header>

<style lang="scss">
    .acolyte-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md);
        padding: var(--dh2e-space-md);
        background: var(--dh2e-bg-darkest);
        border-bottom: 2px solid var(--dh2e-gold-dark);
    }

    .portrait {
        width: 72px;
        height: 72px;
        border: 2px solid var(--dh2e-gold);
        border-radius: var(--dh2e-radius-md);
        object-fit: cover;
        cursor: pointer;
        flex-shrink: 0;
    }

    .identity {
        flex: 1;
        min-width: 0;
    }
    .name {
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-xxl);
        color: var(--dh2e-gold);
        line-height: 1;
        margin-bottom: var(--dh2e-space-xs);
    }
    .details-line {
        display: flex;
        gap: var(--dh2e-space-sm);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-secondary);
    }
    .detail::after {
        content: "/";
        margin-left: var(--dh2e-space-sm);
        opacity: 0.4;
    }
    .detail:last-child::after {
        content: "";
    }

    .vital-stats {
        display: flex;
        gap: var(--dh2e-space-sm);
        flex-shrink: 0;
    }
    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-mid);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        min-width: 42px;
    }
    .stat-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        font-weight: 600;
    }
    .stat-value {
        font-size: var(--dh2e-text-md);
        font-weight: 700;
        color: var(--dh2e-text-primary);
    }
    .wounds .stat-value {
        color: var(--dh2e-success);
    }
    .wounds.critical .stat-value {
        color: var(--dh2e-red-bright);
    }
    .fate .stat-value {
        color: var(--dh2e-gold-bright);
    }
</style>
