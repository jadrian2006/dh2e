<script lang="ts">
    import type { FXMasterPreset } from "./presets.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const presets: FXMasterPreset[] = ctx.presets ?? [];
    let activePresets: Set<string> = $state(new Set(ctx.activePresets ?? []));

    async function togglePreset(preset: FXMasterPreset) {
        if (activePresets.has(preset.id)) {
            // Remove this preset's effects
            await ctx.removePreset?.(preset);
            activePresets.delete(preset.id);
            activePresets = new Set(activePresets);
        } else {
            // Apply this preset's effects
            await ctx.applyPreset?.(preset);
            activePresets.add(preset.id);
            activePresets = new Set(activePresets);
        }
    }

    async function clearAll() {
        await ctx.clearAll?.();
        activePresets = new Set();
    }
</script>

<div class="fxmaster-menu">
    <div class="preset-grid">
        {#each presets as preset (preset.id)}
            <button
                class="preset-card"
                class:active={activePresets.has(preset.id)}
                onclick={() => togglePreset(preset)}
                title={game.i18n.localize(preset.descKey)}
            >
                <i class={preset.icon}></i>
                <span class="preset-name">{game.i18n.localize(preset.nameKey)}</span>
            </button>
        {/each}
    </div>

    <footer class="menu-footer">
        <button class="clear-btn" onclick={clearAll}>
            <i class="fa-solid fa-xmark"></i>
            {game.i18n.localize("DH2E.FXMaster.ClearAll")}
        </button>
    </footer>
</div>

<style lang="scss">
    .fxmaster-menu {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }
    .preset-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--dh2e-space-sm, 0.5rem);
    }
    .preset-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: var(--dh2e-space-md, 0.75rem);
        border: 1px solid var(--dh2e-border, #3a3a44);
        border-radius: 4px;
        background: var(--dh2e-bg-mid, #1e1e24);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        transition: all 0.15s ease;

        i {
            font-size: 1.4rem;
        }
        .preset-name {
            font-size: 0.7rem;
            text-align: center;
        }

        &:hover {
            border-color: var(--dh2e-gold-dark, #8a7030);
            color: var(--dh2e-gold, #c8a84e);
        }
        &.active {
            background: var(--dh2e-gold-dark, #8a7030);
            color: var(--dh2e-bg-darkest, #0a0a0e);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }
    .menu-footer {
        display: flex;
        justify-content: center;
        padding-top: var(--dh2e-space-sm, 0.5rem);
        border-top: 1px solid var(--dh2e-border, #3a3a44);
    }
    .clear-btn {
        font-size: 0.75rem;
        padding: 5px 14px;
        border: 1px solid var(--dh2e-border, #3a3a44);
        border-radius: 3px;
        background: var(--dh2e-bg-dark, #141418);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;

        &:hover {
            border-color: #aa3333;
            color: #ff6666;
        }
        i { margin-right: 4px; }
    }
</style>
