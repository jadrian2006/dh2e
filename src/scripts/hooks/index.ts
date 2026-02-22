import { Load } from "./load.ts";
import { Init } from "./init.ts";
import { Setup } from "./setup.ts";
import { Ready } from "./ready.ts";

export const HooksDH2e = {
    listen(): void {
        const listeners: { listen(): void }[] = [Load, Init, Setup, Ready];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
