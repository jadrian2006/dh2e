<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();
</script>

<div class="item-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <span class="item-type">{ctx.type}</span>
        </div>
    </header>
    <section class="sheet-body">
        <p class="placeholder">Item sheet — work in progress</p>
    </section>
</div>

<style lang="scss">
    .item-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .sheet-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
    }
    .item-img {
        width: 48px;
        height: 48px;
        border-radius: 4px;
        object-fit: cover;
    }
    .header-info {
        display: flex;
        flex-direction: column;
    }
    .item-name {
        margin: 0;
        font-size: 1.25rem;
    }
    .item-type {
        font-size: 0.8rem;
        text-transform: capitalize;
        opacity: 0.7;
    }
    .sheet-body {
        flex: 1;
        padding: 0.5rem;
    }
    .placeholder {
        color: #666;
        font-style: italic;
    }
</style>
