/**
 * Create the default warband actor if one doesn't exist yet.
 * GM-only. Finds existing warband by type rather than fixed ID.
 */
export async function createFirstWarband(): Promise<void> {
    const g = game as any;
    if (!g.user?.isGM) return;

    // Find any existing warband actor
    const existing = g.actors?.find((a: any) => a.type === "warband");
    if (existing) {
        // Ensure the setting points to it
        const currentId = g.settings.get(SYSTEM_ID, "activeWarband") as string;
        if (currentId !== existing.id) {
            await g.settings.set(SYSTEM_ID, "activeWarband", existing.id);
        }
        return;
    }

    // No warband exists — create one
    try {
        const warband = await (Actor as any).create({
            name: "The Warband",
            type: "warband",
            img: `systems/${SYSTEM_ID}/icons/default-icons/warband.svg`,
        });
        if (warband) {
            await g.settings.set(SYSTEM_ID, "activeWarband", warband.id);
            console.log(`DH2E | Created default warband actor (${warband.id})`);
        }
    } catch (e) {
        console.warn("DH2E | Could not create default warband:", e);
    }
}
