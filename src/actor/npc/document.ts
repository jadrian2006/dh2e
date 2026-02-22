import { ActorDH2e } from "@actor/base.ts";

/** NPC actor — shares Acolyte data structure for Phase 1 */
class NpcDH2e extends ActorDH2e {
    override prepareBaseData(): void {
        super.prepareBaseData();
        // NPC uses same data preparation as Acolyte for now
        const system = this.system as Record<string, unknown>;
        const source = this._source.system as Record<string, unknown>;
        const chars = source.characteristics as Record<string, { base: number; advances: number }>;

        if (chars) {
            const sysChars = system.characteristics as Record<
                string,
                { base: number; advances: number; value: number; bonus: number }
            >;
            for (const [key, src] of Object.entries(chars)) {
                if (sysChars[key]) {
                    sysChars[key].base = src.base;
                    sysChars[key].advances = src.advances;
                    sysChars[key].value = src.base + src.advances * 5;
                    sysChars[key].bonus = Math.floor(sysChars[key].value / 10);
                }
            }
        }
    }
}

export { NpcDH2e };
