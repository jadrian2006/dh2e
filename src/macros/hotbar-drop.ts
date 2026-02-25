import type { DH2eDragData } from "./types.ts";

/**
 * Register the hotbarDrop hook to create macros from DH2E drag data.
 * Called once during the ready hook.
 */
export function registerHotbarDrop(): void {
    Hooks.on("hotbarDrop", (_bar: any, data: any, slot: number) => {
        if (!data?.type) return;
        if (data.type !== "Skill" && data.type !== "SkillUse" && data.type !== "Weapon") return;

        // Handle async creation
        createDH2eMacro(data as DH2eDragData, slot);
        return false; // Prevent Foundry default handling
    });
}

async function createDH2eMacro(data: DH2eDragData, slot: number): Promise<void> {
    let command: string;
    let name: string;
    let img: string;

    switch (data.type) {
        case "Skill":
            command = `game.dh2e.rollSkill("${data.skillName}");`;
            name = data.skillName;
            img = "icons/svg/d20-grey.svg";
            break;
        case "SkillUse":
            command = `game.dh2e.rollSkillUse("${data.skillName}", "${data.useSlug}");`;
            name = `${data.skillName}: ${data.useLabel}`;
            img = "icons/svg/d20-grey.svg";
            break;
        case "Weapon":
            command = `game.dh2e.rollWeapon("${data.weaponId}");`;
            name = data.weaponName;
            img = "icons/svg/sword.svg";
            break;
    }

    // Check for existing macro with same command to avoid duplicates
    const g = game as any;
    let macro = g.macros?.find(
        (m: any) => m.command === command && m.author?.id === g.user?.id,
    );

    if (!macro) {
        macro = await (Macro as any).create({
            name,
            type: "script",
            img,
            command,
            flags: { dh2e: { generated: true } },
        });
    }

    if (macro) {
        g.user?.assignHotbarMacro(macro, slot);
    }
}
