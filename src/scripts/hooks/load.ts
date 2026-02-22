import { ActorProxyDH2e } from "@actor/base.ts";
import { ItemProxyDH2e } from "@item/base/document.ts";

/** Runs on initial script load — assigns document classes to CONFIG */
export class Load {
    static listen(): void {
        // Assign document classes
        CONFIG.Actor.documentClass = ActorProxyDH2e as typeof Actor;
        CONFIG.Item.documentClass = ItemProxyDH2e as typeof Item;

        // Set default types
        CONFIG.Actor.defaultType = "acolyte";
        CONFIG.Item.defaultType = "gear";

        // Set type icons
        CONFIG.Actor.typeIcons = {
            acolyte: "fa-solid fa-user",
            npc: "fa-solid fa-skull",
        };

        CONFIG.Item.typeIcons = {
            weapon: "fa-solid fa-gun",
            armour: "fa-solid fa-shield",
            gear: "fa-solid fa-box",
            skill: "fa-solid fa-book",
            talent: "fa-solid fa-star",
            condition: "fa-solid fa-bolt",
        };

        // Default actor icon
        Actor.DEFAULT_ICON = `systems/${SYSTEM_ID}/icons/default-icons/acolyte.svg` as ImageFilePath;
    }
}
