/**
 * Delegated event handlers for chat card interactions.
 *
 * Handles button clicks within chat messages (Roll Damage, Spend Fate, etc.)
 */
class ChatListenersDH2e {
    /** Register delegated listeners on the chat log */
    static listen(): void {
        Hooks.on("renderChatMessage", (_message: ChatMessage, html: HTMLElement) => {
            ChatListenersDH2e.#bindListeners(html);
        });
    }

    static #bindListeners(html: HTMLElement): void {
        // Roll Damage button (used in Milestone 5)
        html.querySelectorAll<HTMLButtonElement>("[data-action='roll-damage']").forEach((btn) => {
            btn.addEventListener("click", ChatListenersDH2e.#onRollDamage);
        });

        // Spend Fate button (used in Milestone 6)
        html.querySelectorAll<HTMLButtonElement>("[data-action='spend-fate']").forEach((btn) => {
            btn.addEventListener("click", ChatListenersDH2e.#onSpendFate);
        });

        // Expandable modifier breakdown
        html.querySelectorAll<HTMLDetailsElement>(".modifier-breakdown").forEach((details) => {
            details.addEventListener("toggle", () => {
                // Allow Foundry to resize the chat message
            });
        });
    }

    static #onRollDamage(_event: MouseEvent): void {
        // Implemented in Milestone 5
        console.log("Roll Damage — coming in Milestone 5");
    }

    static #onSpendFate(_event: MouseEvent): void {
        // Implemented in Milestone 6
        console.log("Spend Fate — coming in Milestone 6");
    }
}

export { ChatListenersDH2e };
