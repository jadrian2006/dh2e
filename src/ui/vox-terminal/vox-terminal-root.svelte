<script lang="ts">
    import { getSetting } from "../settings/settings.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const sender: string = ctx.sender;
    const fullMessage: string = ctx.message;
    const fullHtml: string = ctx.html ?? "";
    const isRichMode = fullHtml.length > 0;
    const charsPerSecond: number = ctx.speed ?? 50;

    let animationsOn = true;
    try { animationsOn = getSetting<boolean>("enableAnimations"); } catch { /* default true */ }

    // --- Plain text typewriter mode ---
    let charIndex = $state(animationsOn && !isRichMode ? 0 : fullMessage.length);
    let finished = $state(!animationsOn || isRichMode);
    const displayedText = $derived(fullMessage.slice(0, charIndex));

    $effect(() => {
        if (isRichMode || charIndex >= fullMessage.length) {
            finished = true;
            return;
        }
        const timer = setTimeout(() => { charIndex++; }, 1000 / charsPerSecond);
        return () => clearTimeout(timer);
    });

    // --- Rich HTML decode animation ---
    let decodePhase = $state(animationsOn && isRichMode ? 0 : 2);
    // Phase 0 = "DECODING", Phase 1 = reveal, Phase 2 = done

    $effect(() => {
        if (!isRichMode || !animationsOn) return;
        if (decodePhase === 0) {
            // Show "DECODING..." for 1.5 seconds
            const timer = setTimeout(() => { decodePhase = 1; }, 1500);
            return () => clearTimeout(timer);
        }
        if (decodePhase === 1) {
            // Brief delay then show content
            const timer = setTimeout(() => { decodePhase = 2; finished = true; }, 300);
            return () => clearTimeout(timer);
        }
    });

    // Blinking cursor (typewriter mode only)
    let cursorVisible = $state(true);
    $effect(() => {
        if (isRichMode) return;
        const interval = setInterval(() => { cursorVisible = !cursorVisible; }, 530);
        return () => clearInterval(interval);
    });

    // Auto-scroll terminal body
    let bodyEl: HTMLElement | undefined = $state();
    $effect(() => {
        void charIndex;
        void decodePhase;
        if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    });

    function skipToEnd() {
        if (!finished) {
            if (isRichMode) {
                decodePhase = 2;
            } else {
                charIndex = fullMessage.length;
            }
            finished = true;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="vox-terminal-display" onclick={skipToEnd}>
    <div class="scanlines"></div>

    <div class="terminal-header">
        <span class="header-title">{game.i18n.localize("DH2E.Vox.IncomingTransmission").toUpperCase()}</span>
        <span class="header-blink">VOX CHANNEL OPEN</span>
    </div>

    {#if sender}
    <div class="terminal-sender">
        &gt; {game.i18n.localize("DH2E.Vox.From").toUpperCase()}: {sender.toUpperCase()}
    </div>
    {/if}

    <div class="terminal-body" bind:this={bodyEl}>
        {#if isRichMode}
            <!-- Rich HTML document mode -->
            {#if decodePhase === 0}
                <div class="decode-status">
                    <i class="fa-solid fa-lock"></i>
                    DECODING ENCRYPTED TRANSMISSION...
                </div>
            {:else if decodePhase >= 1}
                <div class="terminal-html" class:reveal={decodePhase >= 2}>
                    {@html fullHtml}
                </div>
            {/if}
        {:else}
            <!-- Plain text typewriter mode -->
            <span class="terminal-text">{displayedText}</span>{#if !finished && cursorVisible}<span class="cursor">&#x2588;</span>{/if}{#if finished}<span class="cursor-done">&#x2588;</span>{/if}
        {/if}
    </div>

    <div class="terminal-footer">
        {#if finished}
            <button class="dismiss-btn" onclick={() => ctx.onDismiss?.()}>
                {game.i18n.localize("DH2E.Vox.Dismiss")}
            </button>
        {:else}
            <span class="skip-hint">{game.i18n.localize("DH2E.Vox.ClickToSkip")}</span>
        {/if}
    </div>
</div>

<style lang="scss">
    .vox-terminal-display {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0a0a0a;
        color: #33ff33;
        font-family: var(--dh2e-font-mono, "Fira Code", "Cascadia Code", "Consolas", monospace);
        padding: 0.75rem;
        overflow: hidden;
        cursor: pointer;
    }

    .scanlines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(
            0deg,
            transparent 0 2px,
            rgba(0, 0, 0, 0.15) 2px 4px
        );
        animation: flicker 8s linear infinite;
        z-index: 1;
    }

    @keyframes flicker {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
        52% { opacity: 0.6; }
        54% { opacity: 1; }
    }

    .terminal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(51, 255, 51, 0.3);
        margin-bottom: 0.5rem;
        z-index: 2;
    }

    .header-title {
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6), 0 0 10px rgba(51, 255, 51, 0.3);
    }

    .header-blink {
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        animation: blink-step 1s step-end infinite;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);
    }

    @keyframes blink-step {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }

    .terminal-sender {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin-bottom: 0.5rem;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6), 0 0 10px rgba(51, 255, 51, 0.3);
        z-index: 2;
    }

    .terminal-body {
        flex: 1;
        overflow-y: auto;
        font-size: 0.85rem;
        line-height: 1.5;
        word-break: break-word;
        z-index: 2;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6), 0 0 10px rgba(51, 255, 51, 0.3);

        /* Scrollbar styling for CRT */
        scrollbar-width: thin;
        scrollbar-color: rgba(51, 255, 51, 0.4) transparent;

        /* Only apply pre-wrap to non-HTML mode */
        &:not(:has(.terminal-html)) {
            white-space: pre-wrap;
        }
    }

    .terminal-text {
        /* Inherits CRT styling */
    }

    /* Rich HTML document styles */
    .decode-status {
        text-align: center;
        padding: 2rem 1rem;
        font-size: 0.8rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        animation: blink-step 1s step-end infinite;

        i {
            display: block;
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
        }
    }

    .terminal-html {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.5s ease, transform 0.5s ease;

        &.reveal {
            opacity: 1;
            transform: translateY(0);
        }

        // Override all text colors to CRT green
        :global(*) {
            color: #33ff33 !important;
            text-shadow: 0 0 4px rgba(51, 255, 51, 0.6), 0 0 10px rgba(51, 255, 51, 0.3);
            background: transparent !important;
            border-color: rgba(51, 255, 51, 0.3) !important;
            font-family: var(--dh2e-font-mono, "Fira Code", "Cascadia Code", "Consolas", monospace) !important;
        }

        :global(h1) { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid rgba(51, 255, 51, 0.3) !important; }
        :global(h2) { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid rgba(51, 255, 51, 0.3) !important; }
        :global(h3) { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid rgba(51, 255, 51, 0.3) !important; }
        :global(h4) { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0.75rem 0 0.35rem; }
        :global(h5) { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0.75rem 0 0.35rem; }
        :global(h6) { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0.75rem 0 0.35rem; }

        :global(p) {
            margin: 0.5rem 0;
            font-size: 0.8rem;
            line-height: 1.6;
        }

        :global(ul) {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        :global(ol) {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        :global(li) {
            margin: 0.25rem 0;
            font-size: 0.8rem;
            line-height: 1.5;
        }

        :global(strong) {
            font-weight: 700;
        }

        :global(b) {
            font-weight: 700;
        }

        :global(em) {
            font-style: italic;
        }

        :global(hr) {
            border: none;
            border-top: 1px solid rgba(51, 255, 51, 0.3);
            margin: 1rem 0;
        }

        :global(blockquote) {
            border-left: 2px solid rgba(51, 255, 51, 0.5) !important;
            padding-left: 0.75rem;
            margin: 0.5rem 0;
            font-style: italic;
        }

        :global(a) {
            text-decoration: underline;
        }

        :global(img) {
            display: none;
        }
    }

    .cursor {
        animation: blink-step 1s step-end infinite;
        color: #33ff33;
    }

    .cursor-done {
        animation: blink-step 1s step-end infinite;
        color: #33ff33;
        opacity: 0.6;
    }

    .terminal-footer {
        display: flex;
        justify-content: center;
        align-items: center;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(51, 255, 51, 0.3);
        margin-top: 0.5rem;
        z-index: 2;
    }

    .dismiss-btn {
        background: transparent;
        color: #33ff33;
        border: 1px solid #33ff33;
        border-radius: 2px;
        padding: 0.35rem 1.25rem;
        font-family: var(--dh2e-font-mono, "Fira Code", "Cascadia Code", "Consolas", monospace);
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);

        &:hover {
            background: rgba(51, 255, 51, 0.1);
            box-shadow: 0 0 8px rgba(51, 255, 51, 0.4);
        }
    }

    .skip-hint {
        font-size: 0.6rem;
        letter-spacing: 0.08em;
        opacity: 0.5;
        text-transform: uppercase;
    }

    /* Override window chrome for CRT aesthetic */
    :global(.application.vox-terminal .window-header) {
        background: #0a0a0a !important;
        color: #33ff33 !important;
        border-bottom: 1px solid rgba(51, 255, 51, 0.3) !important;
        text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);
    }

    :global(.application.vox-terminal .window-header .window-title) {
        color: #33ff33 !important;
        font-family: var(--dh2e-font-mono, "Fira Code", "Cascadia Code", "Consolas", monospace);
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    :global(.application.vox-terminal .window-content) {
        background: #0a0a0a !important;
        padding: 0 !important;
    }

    :global(.application.vox-terminal) {
        border: 1px solid rgba(51, 255, 51, 0.4) !important;
        box-shadow: 0 0 15px rgba(51, 255, 51, 0.15), inset 0 0 30px rgba(0, 0, 0, 0.5) !important;
    }
</style>
