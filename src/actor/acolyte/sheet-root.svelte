<script lang="ts">
    let { state }: { state: Record<string, any> } = $props();
</script>

<div class="acolyte-sheet">
    <header class="sheet-header">
        <img src={state.img} alt={state.name} class="profile-img" />
        <h1 class="actor-name">{state.name}</h1>
    </header>
    <section class="sheet-body">
        <p class="placeholder">Acolyte sheet — work in progress</p>
    </section>
</div>

<style lang="scss">
    .acolyte-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .sheet-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem;
    }
    .profile-img {
        width: 64px;
        height: 64px;
        border-radius: 4px;
        object-fit: cover;
    }
    .actor-name {
        margin: 0;
        font-size: 1.5rem;
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
