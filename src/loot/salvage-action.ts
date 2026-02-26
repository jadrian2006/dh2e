import { CheckDH2e } from "@check/check.ts";
import type { LootDH2e } from "@actor/loot/document.ts";
import { getSetting } from "../ui/settings/settings.ts";

/** Skill name → linked characteristic map */
const SALVAGE_SKILL_MAP: Record<string, string> = {
    awareness: "per",
    scrutiny: "per",
    inquiry: "fel",
};

interface SalvageResult {
    success: boolean;
    dos: number;
    sectionsUnlocked: number;
}

/**
 * Perform a salvage skill check on a loot actor.
 * On success, opens the SalvageLootDialog showing unlocked sections.
 */
async function performSalvage(searcher: Actor, lootActor: LootDH2e): Promise<SalvageResult | null> {
    // Already searched — show previous results without re-rolling
    if (lootActor.isSearched) {
        ui.notifications.info(game.i18n.localize("DH2E.Loot.AlreadySearched"));
        return null;
    }

    const autoReveal = getSetting<boolean>("autoRevealSurfaceLoot");
    const system = lootActor.lootSystem;
    const skillName = system.salvageSkill || "awareness";
    const modifier = system.salvageModifier || 0;
    const characteristic = SALVAGE_SKILL_MAP[skillName] ?? "per";

    // Find the searcher's skill advancement for the salvage skill
    const skillItem = searcher.items.find(
        (i: Item) => i.type === "skill" && (i.system as any).linkedCharacteristic === characteristic,
    );
    const advancement = (skillItem?.system as any)?.advancement ?? 0;

    // Base target: characteristic value + skill bonus
    const chars = (searcher.system as any)?.characteristics;
    const charValue = chars?.[characteristic]?.value ?? 25;
    const baseTarget = charValue + (advancement > 0 ? advancement * 10 : -20) + modifier;

    // Roll the check
    const result = await CheckDH2e.roll({
        label: `${game.i18n.localize("DH2E.Loot.SearchContainer")} (${skillName})`,
        baseTarget,
        characteristic,
        actor: searcher,
        skipDialog: false,
    });

    if (!result) return null; // Dialog cancelled

    // Mark as searched
    await lootActor.markSearched();

    if (result.success) {
        const dos = result.degrees;

        // Post success chat
        await ChatMessage.create({
            content: `<div class="dh2e salvage-chat">
                <p>${game.i18n.format("DH2E.Loot.SalvageSuccess", {
                    actor: searcher.name!,
                    dos: String(dos),
                })}</p>
            </div>`,
            speaker: ChatMessage.getSpeaker({ actor: searcher }),
        });

        // Open salvage dialog
        const { SalvageLootDialog } = await import("./salvage-loot-dialog.ts");
        SalvageLootDialog.open(searcher, lootActor, dos);

        const unlocked = lootActor.getUnlockedSections(dos);
        return { success: true, dos, sectionsUnlocked: unlocked.length };
    } else {
        // Failure — but auto-reveal surface items if enabled
        if (autoReveal) {
            const surfaceSections = lootActor.getUnlockedSections(0);
            if (surfaceSections.length > 0 && surfaceSections.some(s => s.items.length > 0)) {
                const { SalvageLootDialog } = await import("./salvage-loot-dialog.ts");
                SalvageLootDialog.open(searcher, lootActor, 0);
            }
        }

        await ChatMessage.create({
            content: `<div class="dh2e salvage-chat">
                <p>${game.i18n.format("DH2E.Loot.SalvageFail", {
                    actor: searcher.name!,
                })}</p>
            </div>`,
            speaker: ChatMessage.getSpeaker({ actor: searcher }),
        });

        return { success: false, dos: result.degrees, sectionsUnlocked: 0 };
    }
}

export { performSalvage };
export type { SalvageResult };
