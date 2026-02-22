import { ChatListenersDH2e } from "@chat/listeners.ts";

/** Hooks.once("ready") — final initialization, migrations */
export class Ready {
    static listen(): void {
        Hooks.once("ready", () => {
            ChatListenersDH2e.listen();
            // Future: run data migrations
            // Future: socket registration
        });
    }
}
