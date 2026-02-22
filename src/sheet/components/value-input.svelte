<script lang="ts">
    let { value = $bindable(0), label = "", disabled = false, min, max, width = "3rem" }: {
        value: number;
        label?: string;
        disabled?: boolean;
        min?: number;
        max?: number;
        width?: string;
    } = $props();
</script>

<div class="value-input">
    {#if label}
        <label class="input-label">{label}</label>
    {/if}
    <input
        type="number"
        bind:value
        {disabled}
        {min}
        {max}
        style:width
    />
</div>

<style lang="scss">
    .value-input {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-xxs);
    }
    .input-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    input {
        text-align: center;
        font-size: var(--dh2e-text-md);
        font-weight: 600;
        padding: var(--dh2e-space-xs);
    }
</style>
