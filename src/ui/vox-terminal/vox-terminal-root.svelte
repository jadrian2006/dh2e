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

    // --- Shared state ---
    let finished = $state(!animationsOn);

    // --- Plain text typewriter mode ---
    let charIndex = $state(animationsOn && !isRichMode ? 0 : fullMessage.length);
    const displayedText = $derived(fullMessage.slice(0, charIndex));

    $effect(() => {
        if (isRichMode || charIndex >= fullMessage.length) {
            if (!isRichMode) finished = true;
            return;
        }
        const timer = setTimeout(() => { charIndex++; }, 1000 / charsPerSecond);
        return () => clearTimeout(timer);
    });

    // --- Rich HTML printer-reveal mode ---
    // Phase 0 = "DECODING...", Phase 1 = printing (progressive height reveal), Phase 2 = done
    let decodePhase = $state(animationsOn && isRichMode ? 0 : 2);
    let revealHeight = $state(0);
    let htmlContentEl: HTMLElement | undefined = $state();

    // Printer speed: pixels per second (maps from chars/sec setting)
    // Slow = readable pace, Normal = brisk, Fast = quick scan
    const pxPerSecond = charsPerSecond <= 30 ? 25 : charsPerSecond <= 50 ? 55 : 120;

    // Phase 0 → Phase 1 transition (decode label for 1.5s)
    $effect(() => {
        if (!isRichMode || !animationsOn || decodePhase !== 0) return;
        const timer = setTimeout(() => { decodePhase = 1; }, 1500);
        return () => clearTimeout(timer);
    });

    // Pause/resume state for printer reveal
    let paused = $state(false);
    let pausedAtHeight = 0;
    let pauseStartTime = 0;
    let totalPausedMs = 0;

    // Phase 1: printer reveal animation via requestAnimationFrame
    $effect(() => {
        if (!isRichMode || !animationsOn || decodePhase !== 1 || !htmlContentEl) return;

        const targetHeight = htmlContentEl.scrollHeight;
        if (targetHeight === 0) return;

        const startTime = performance.now();
        totalPausedMs = 0;
        let active = true;

        function tick() {
            if (!active) return;
            if (paused) {
                // Keep looping but don't advance
                requestAnimationFrame(tick);
                return;
            }
            const elapsed = performance.now() - startTime - totalPausedMs;
            const h = elapsed * pxPerSecond / 1000;

            if (h >= targetHeight) {
                revealHeight = targetHeight + 20;
                finished = true;
                decodePhase = 2;
                return;
            }
            revealHeight = h;
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        return () => { active = false; };
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
        void revealHeight;
        if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    });

    function handleClick(e: MouseEvent) {
        // Shift+click or already finished: skip to end
        if (e.shiftKey || finished) {
            skipToEnd();
            return;
        }
        // For rich mode: toggle pause/resume
        if (isRichMode && decodePhase === 1) {
            if (paused) {
                // Resume — account for pause duration
                totalPausedMs += performance.now() - pauseStartTime;
                paused = false;
            } else {
                // Pause
                pausedAtHeight = revealHeight;
                pauseStartTime = performance.now();
                paused = true;
            }
            return;
        }
        // For plain text or decode phase: skip to end
        skipToEnd();
    }

    function skipToEnd() {
        if (!finished) {
            paused = false;
            if (isRichMode) {
                decodePhase = 2;
                revealHeight = (htmlContentEl?.scrollHeight ?? 99999) + 20;
            } else {
                charIndex = fullMessage.length;
            }
            finished = true;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="vox-terminal-display" onclick={handleClick}>
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
            <!-- Rich HTML printer-reveal mode -->
            {#if decodePhase === 0}
                <div class="decode-status">
                    <i class="fa-solid fa-lock"></i>
                    DECODING ENCRYPTED TRANSMISSION...
                </div>
            {/if}
            <div
                class="printer-clip"
                class:printing={decodePhase === 1}
                style="height: {decodePhase >= 2 ? 'auto' : revealHeight + 'px'}"
            >
                <div class="terminal-html" bind:this={htmlContentEl}>
                    {@html fullHtml}
                </div>
            </div>
        {:else}
            <!-- Plain text typewriter mode -->
            <span class="terminal-text">{displayedText}</span>{#if !finished && cursorVisible}<span class="cursor">&#x2588;</span>{/if}{#if finished}<span class="cursor-done">&#x2588;</span>{/if}
        {/if}
    </div>

    <div class="terminal-footer">
        {#if finished}
            <button class="dismiss-btn" onclick={(e) => { e.stopPropagation(); ctx.onDismiss?.(); }}>
                {game.i18n.localize("DH2E.Vox.Dismiss")}
            </button>
        {:else if paused}
            <span class="skip-hint paused-hint">
                <i class="fa-solid fa-pause fa-xs"></i> PAUSED — CLICK TO RESUME · SHIFT+CLICK TO REVEAL ALL
            </span>
        {:else}
            <span class="skip-hint">CLICK TO PAUSE · SHIFT+CLICK TO REVEAL ALL</span>
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
        &:not(:has(.printer-clip)) {
            white-space: pre-wrap;
        }
    }

    .terminal-text {
        /* Inherits CRT styling */
    }

    /* Rich HTML decode status */
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

    /* Printer-reveal clip container */
    .printer-clip {
        overflow: hidden;
        position: relative;

        /* Glowing print-head line at the bottom edge during printing */
        &.printing::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #33ff33;
            box-shadow: 0 0 8px #33ff33, 0 0 20px rgba(51, 255, 51, 0.5);
            z-index: 3;
        }
    }

    /* Rich HTML document styles */
    .terminal-html {
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
            list-style-type: disc;
        }

        :global(ol) {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            list-style-type: decimal;
        }

        :global(li) {
            margin: 0.25rem 0;
            font-size: 0.8rem;
            line-height: 1.5;
            display: list-item;
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

        &.paused-hint {
            opacity: 0.8;
            animation: blink-step 1s step-end infinite;
        }
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
