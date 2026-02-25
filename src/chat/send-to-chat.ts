import { CANONICAL_SKILL_USES } from "@item/skill/uses.ts";

const TEMPLATE_PATH = `systems/${SYSTEM_ID}/templates/chat/item-card.hbs`;

/**
 * Send an item's details to chat as a rich card.
 * Skills include skill use action buttons; weapons include fire mode buttons.
 * Talents/gear/armour show description only.
 */
export async function sendItemToChat(item: Item): Promise<void> {
    const sys = (item as any).system ?? {};
    const type = item.type;

    const typeLabels: Record<string, string> = {
        skill: game.i18n.localize("DH2E.ItemType.Skill"),
        talent: game.i18n.localize("DH2E.ItemType.Talent"),
        weapon: game.i18n.localize("DH2E.ItemType.Weapon"),
        armour: game.i18n.localize("DH2E.ItemType.Armour"),
        gear: game.i18n.localize("DH2E.ItemType.Gear"),
        power: game.i18n.localize("DH2E.ItemType.Power"),
        ammunition: game.i18n.localize("DH2E.ItemType.Ammunition"),
        cybernetic: game.i18n.localize("DH2E.ItemType.Cybernetic"),
        condition: game.i18n.localize("DH2E.ItemType.Condition"),
        trait: game.i18n.localize("DH2E.ItemType.Trait"),
    };

    // Build action buttons
    const actions: Array<{ action: string; label: string; skill?: string; use?: string; weaponId?: string }> = [];

    if (type === "skill") {
        // Add skill use actions
        const uses = sys.uses ?? CANONICAL_SKILL_USES[item.name] ?? [];
        for (const use of uses) {
            actions.push({
                action: "roll-skill-use",
                label: use.label,
                skill: item.name,
                use: use.slug,
            });
        }
    } else if (type === "power") {
        // Focus Power action button
        if (sys.focusTest) {
            actions.push({
                action: "focus-power",
                label: game.i18n.localize("DH2E.Psychic.FocusPower"),
                skill: item.name,
            });
        }
    } else if (type === "weapon") {
        const weaponId = item.id ?? "";
        const isRanged = sys.class !== "melee" && sys.class !== "Melee";
        if (!isRanged) {
            actions.push({ action: "roll-weapon", label: "Melee Attack", weaponId });
        } else {
            if (sys.rof?.single ?? true) {
                actions.push({ action: "roll-weapon", label: "Single Shot", weaponId });
            }
            if ((sys.rof?.semi ?? 0) > 0) {
                actions.push({ action: "roll-weapon", label: `Semi-Auto (${sys.rof.semi})`, weaponId });
            }
            if ((sys.rof?.full ?? 0) > 0) {
                actions.push({ action: "roll-weapon", label: `Full Auto (${sys.rof.full})`, weaponId });
            }
        }
    }

    const templateData = {
        img: item.img ?? `systems/${SYSTEM_ID}/icons/default-icons/${type}.svg`,
        name: item.name,
        typeLabel: typeLabels[type] ?? type,
        description: sys.description ?? "",
        actions: actions.length > 0 ? actions : null,
    };

    const content = await renderTemplate(TEMPLATE_PATH, templateData);

    const actor = (item as any).actor ?? null;
    const speaker = actor
        ? fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name }
        : {};

    await fd.ChatMessage.create({
        content,
        speaker,
        flags: {
            [SYSTEM_ID]: {
                type: "item-card",
                itemType: type,
                itemId: item.id,
                actorId: actor?.id ?? null,
            },
        },
    });
}
