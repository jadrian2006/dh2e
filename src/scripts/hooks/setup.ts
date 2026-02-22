import { registerSheets } from "@scripts/register-sheets.ts";

/** Hooks.once("setup") — register sheets */
export class Setup {
    static listen(): void {
        Hooks.once("setup", () => {
            registerSheets();
        });
    }
}
