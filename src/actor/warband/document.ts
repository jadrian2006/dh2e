import { ActorDH2e } from "@actor/base.ts";
import type { WarbandSystemData, WarbandMemberSource } from "./data.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";

/** The Warband actor — a party overview sheet */
class WarbandDH2e extends ActorDH2e {
    declare system: WarbandSystemData;

    /** Resolved member actors (populated during prepareBaseData) */
    get members(): AcolyteDH2e[] {
        return this.system.resolvedMembers ?? [];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Resolve member UUIDs into live actor references
        const resolved: AcolyteDH2e[] = [];
        const members = this._source.system?.members as WarbandMemberSource[] ?? [];
        for (const entry of members) {
            const actor = fromUuidSync(entry.uuid) as AcolyteDH2e | null;
            if (actor && actor.type === "acolyte") {
                resolved.push(actor);
            }
        }
        (this.system as WarbandSystemData).resolvedMembers = resolved;
    }

    /** Add Acolyte actors as warband members (deduplicates) */
    async addMembers(...actors: ActorDH2e[]): Promise<void> {
        const existing = new Set(
            (this._source.system?.members as WarbandMemberSource[] ?? []).map(m => m.uuid),
        );
        const toAdd: WarbandMemberSource[] = [];
        for (const actor of actors) {
            if (actor.type !== "acolyte") continue;
            if (existing.has(actor.uuid)) continue;
            toAdd.push({ uuid: actor.uuid });
            existing.add(actor.uuid);
        }
        if (toAdd.length === 0) return;

        const current = this._source.system?.members as WarbandMemberSource[] ?? [];
        await this.update({ "system.members": [...current, ...toAdd] });
    }

    /** Remove members by UUID */
    async removeMembers(...uuids: string[]): Promise<void> {
        const removeSet = new Set(uuids);
        const current = this._source.system?.members as WarbandMemberSource[] ?? [];
        const filtered = current.filter(m => !removeSet.has(m.uuid));
        await this.update({ "system.members": filtered });
    }

    /** Force warband to have no folder */
    protected override async _preCreate(
        data: Record<string, unknown>,
        options: Record<string, unknown>,
        user: any,
    ): Promise<boolean | void> {
        const result = await super._preCreate(data, options, user);
        if (result === false) return false;
        this.updateSource({ folder: null });
    }

    protected override async _preUpdate(
        changed: Record<string, unknown>,
        options: Record<string, unknown>,
        user: any,
    ): Promise<boolean | void> {
        const result = await super._preUpdate(changed, options, user);
        if (result === false) return false;
        if ("folder" in changed) {
            (changed as any).folder = null;
        }
    }
}

export { WarbandDH2e };
