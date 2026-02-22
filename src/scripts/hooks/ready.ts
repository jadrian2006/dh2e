/** Hooks.once("ready") — final initialization, migrations */
export class Ready {
    static listen(): void {
        Hooks.once("ready", () => {
            // Future: run data migrations
            // Future: socket registration
            // Future: display welcome message on first load
        });
    }
}
