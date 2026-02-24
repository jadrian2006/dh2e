<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const format = $derived(sys.format ?? "parchment");
    const status = $derived(sys.status ?? "active");
    const isParchment = $derived(format === "parchment");

    function formatDate(ts: number): string {
        if (!ts) return "—";
        if (isParchment) {
            return new Date(ts).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
            });
        }
        // Vox military format
        const d = new Date(ts);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function statusLabel(s: string): string {
        if (isParchment) {
            return s.charAt(0).toUpperCase() + s.slice(1);
        }
        return `[${s.toUpperCase()}]`;
    }
</script>

<div class="mission-card format-{format}">
    <!-- Format toggle -->
    {#if ctx.editable}
        <button
            class="format-toggle"
            title="Toggle Parchment / Vox"
            onclick={() => ctx.updateField?.("system.format", isParchment ? "vox" : "parchment")}
        >
            <i class="fa-solid {isParchment ? 'fa-terminal' : 'fa-scroll'}"></i>
        </button>
    {/if}

    <header class="card-header">
        {#if isParchment}
            <i class="fa-solid fa-shield-halved seal-icon"></i>
            <span class="header-label">Mission Briefing</span>
        {:else}
            <span class="header-label">&gt;&gt;&gt; Vox Transmission</span>
        {/if}
    </header>

    <div class="card-title">
        {#if ctx.editable}
            <input
                type="text"
                class="title-input"
                value={ctx.name}
                placeholder="Objective Title"
                onchange={(e) => ctx.item?.update({ name: (e.target as HTMLInputElement).value })}
            />
        {:else}
            <h2 class="title-text">{ctx.name}</h2>
        {/if}
    </div>

    <div class="card-body">
        {#if ctx.editable}
            <textarea
                class="description-input"
                placeholder="Describe the objective..."
                value={sys.description ?? ""}
                onchange={(e) => ctx.updateField?.("system.description", (e.target as HTMLTextAreaElement).value)}
            ></textarea>
        {:else}
            <div class="description-text">{sys.description || "No details provided."}</div>
        {/if}
    </div>

    <div class="card-meta">
        {#if ctx.editable}
            <div class="meta-row">
                <label class="meta-label">{isParchment ? "Scope" : "SCOPE"}</label>
                <select
                    class="scope-select"
                    value={sys.scope}
                    onchange={(e) => ctx.updateField?.("system.scope", (e.target as HTMLSelectElement).value)}
                >
                    <option value="personal">Personal</option>
                    <option value="warband">Warband</option>
                </select>
            </div>
            <div class="meta-row">
                <label class="meta-label">{isParchment ? "Assigned By" : "TRANSMITTED BY"}</label>
                <input
                    type="text"
                    class="meta-input"
                    value={sys.assignedBy ?? ""}
                    placeholder={isParchment ? "Inquisitor..." : "CALLSIGN..."}
                    onchange={(e) => ctx.updateField?.("system.assignedBy", (e.target as HTMLInputElement).value)}
                />
            </div>
        {:else}
            {#if sys.assignedBy}
                <span class="meta-field">
                    {isParchment ? "Assigned by" : "TRANSMITTED BY:"} {sys.assignedBy}
                </span>
            {/if}
            <span class="meta-field scope-badge scope-{sys.scope}">
                {isParchment ? (sys.scope === "warband" ? "Warband" : "Personal") : `[${(sys.scope ?? "personal").toUpperCase()}]`}
            </span>
        {/if}
        {#if sys.timestamp}
            <span class="meta-field date-stamp">{formatDate(sys.timestamp)}</span>
        {/if}
    </div>

    <footer class="card-footer">
        <span class="status-badge status-{status}">{statusLabel(status)}</span>

        {#if ctx.editable}
            <div class="status-actions">
                {#if status === "active"}
                    <button class="action-btn complete" onclick={ctx.complete}>
                        <i class="fa-solid fa-check"></i> {isParchment ? "Complete" : "CONFIRM"}
                    </button>
                    <button class="action-btn fail" onclick={ctx.fail}>
                        <i class="fa-solid fa-xmark"></i> {isParchment ? "Fail" : "ABORT"}
                    </button>
                {:else}
                    <button class="action-btn reactivate" onclick={ctx.reactivate}>
                        <i class="fa-solid fa-rotate-left"></i> {isParchment ? "Reactivate" : "REOPEN"}
                    </button>
                {/if}
            </div>
        {/if}
    </footer>
</div>

<style lang="scss">
    /* ===== SHARED ===== */
    .mission-card {
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
        overflow: hidden;
    }
    .format-toggle {
        position: absolute;
        top: 6px;
        right: 8px;
        z-index: 10;
        background: none;
        border: 1px solid transparent;
        cursor: pointer;
        font-size: 0.75rem;
        padding: 3px 6px;
        border-radius: 3px;
        opacity: 0.6;
        transition: opacity 0.2s;
        &:hover { opacity: 1; }
    }
    .card-title {
        padding: 0 var(--dh2e-space-md);
    }
    .title-input, .title-text {
        width: 100%;
        margin: 0;
    }
    .card-body {
        flex: 1;
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        overflow-y: auto;
    }
    .description-input {
        width: 100%;
        height: 100%;
        min-height: 80px;
        resize: vertical;
        border-radius: var(--dh2e-radius-sm);
        padding: var(--dh2e-space-sm);
    }
    .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-md);
        align-items: center;
    }
    .meta-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 120px;
    }
    .meta-label {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .meta-input, .scope-select {
        font-size: 0.75rem;
        padding: 2px 4px;
        border-radius: var(--dh2e-radius-sm);
    }
    .meta-field {
        font-size: 0.7rem;
    }
    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-xs) var(--dh2e-space-md) var(--dh2e-space-sm);
        gap: var(--dh2e-space-sm);
    }
    .status-badge {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 3px;
    }
    .status-actions {
        display: flex;
        gap: var(--dh2e-space-xs);
    }
    .action-btn {
        font-size: 0.7rem;
        padding: 3px 8px;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        transition: filter 0.15s;
        &:hover { filter: brightness(1.2); }
        i { margin-right: 2px; }
    }

    /* ===== PARCHMENT FORMAT ===== */
    .format-parchment {
        background: linear-gradient(175deg, #f5edd6 0%, #e8dab8 30%, #ddd0a8 100%);
        color: #2a1f0e;
        font-family: var(--dh2e-font-header, serif);

        .format-toggle { color: #5a4a2e; }

        .card-header {
            display: flex;
            align-items: center;
            gap: var(--dh2e-space-sm);
            padding: var(--dh2e-space-sm) var(--dh2e-space-md);
            border-bottom: 2px solid #b89c5c;
        }
        .seal-icon {
            color: #8b1a1a;
            font-size: 1.2rem;
        }
        .header-label {
            font-variant: small-caps;
            font-size: 0.7rem;
            letter-spacing: 0.15em;
            color: #5a4a2e;
        }
        .title-input {
            font-family: var(--dh2e-font-header, serif);
            font-size: 1.3rem;
            color: #7a5c1a;
            background: transparent;
            border: none;
            border-bottom: 1px dashed #b89c5c;
            &:focus { outline: none; border-bottom-style: solid; }
        }
        .title-text {
            font-size: 1.3rem;
            color: #7a5c1a;
        }
        .card-body {
            background: rgba(255, 250, 230, 0.4);
            border-radius: 4px;
            margin: 0 var(--dh2e-space-sm);
        }
        .description-input {
            background: rgba(255, 250, 230, 0.5);
            border: 1px solid #c8b888;
            color: #2a1f0e;
            font-family: var(--dh2e-font-header, serif);
        }
        .description-text {
            font-size: 0.85rem;
            line-height: 1.6;
            color: #2a1f0e;
        }
        .meta-label { color: #7a6a3e; }
        .meta-input, .scope-select {
            background: rgba(255, 250, 230, 0.5);
            border: 1px solid #c8b888;
            color: #2a1f0e;
        }
        .meta-field { color: #5a4a2e; }
        .scope-badge {
            background: #c8b888;
            color: #2a1f0e;
            padding: 1px 6px;
            border-radius: 3px;
            font-weight: 600;
        }
        .date-stamp { font-style: italic; color: #7a6a3e; }
        .status-badge {
            background: #c8b888;
            color: #2a1f0e;
            &.status-active { background: #8aaa5a; color: #1a2a0e; }
            &.status-completed { background: #6a9abc; color: #0e1a2a; }
            &.status-failed { background: #c07060; color: #fff; }
        }
        .action-btn {
            font-family: var(--dh2e-font-header, serif);
            &.complete { background: #6a9a4a; color: #fff; }
            &.fail { background: #a04a3a; color: #fff; }
            &.reactivate { background: #5a7a9a; color: #fff; }
        }
    }

    /* ===== VOX FORMAT ===== */
    .format-vox {
        background: #0a0e0a;
        color: #33ff33;
        font-family: "Courier New", monospace;

        .format-toggle { color: #33ff33; }

        .card-header {
            padding: var(--dh2e-space-sm) var(--dh2e-space-md);
            border-bottom: 1px solid #1a3a1a;
        }
        .header-label {
            font-size: 0.7rem;
            letter-spacing: 0.12em;
            color: #22aa22;
            text-transform: uppercase;
        }
        .title-input {
            font-family: "Courier New", monospace;
            font-size: 1.1rem;
            color: #33ff33;
            background: transparent;
            border: none;
            border-bottom: 1px solid #1a3a1a;
            text-shadow: 0 0 4px rgba(51, 255, 51, 0.4);
            &:focus { outline: none; border-color: #33ff33; }
        }
        .title-text {
            font-size: 1.1rem;
            color: #33ff33;
            text-shadow: 0 0 4px rgba(51, 255, 51, 0.4);
        }
        .card-body {
            background: rgba(0, 20, 0, 0.5);
            border-radius: 2px;
            margin: 0 var(--dh2e-space-sm);
        }
        .description-input {
            background: rgba(0, 20, 0, 0.6);
            border: 1px solid #1a3a1a;
            color: #33ff33;
            font-family: "Courier New", monospace;
            text-shadow: 0 0 2px rgba(51, 255, 51, 0.3);
        }
        .description-text {
            font-size: 0.8rem;
            line-height: 1.5;
            color: #33ff33;
            text-shadow: 0 0 2px rgba(51, 255, 51, 0.3);
        }
        .meta-label { color: #22aa22; }
        .meta-input, .scope-select {
            background: rgba(0, 20, 0, 0.6);
            border: 1px solid #1a3a1a;
            color: #33ff33;
            font-family: "Courier New", monospace;
        }
        .meta-field { color: #22aa22; }
        .scope-badge { color: #33ff33; font-weight: 700; }
        .date-stamp { color: #22aa22; }
        .status-badge {
            font-family: "Courier New", monospace;
            background: transparent;
            border: 1px solid #1a3a1a;
            &.status-active { color: #33ff33; border-color: #33ff33; }
            &.status-completed { color: #3399ff; border-color: #3399ff; }
            &.status-failed { color: #ff3333; border-color: #ff3333; }
        }
        .action-btn {
            font-family: "Courier New", monospace;
            border: 1px solid;
            background: transparent;
            &.complete { color: #33ff33; border-color: #33ff33; }
            &.fail { color: #ff3333; border-color: #ff3333; }
            &.reactivate { color: #3399ff; border-color: #3399ff; }
        }
    }
</style>
