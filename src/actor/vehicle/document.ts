import { ActorDH2e } from "@actor/base.ts";
import type { VehicleSystemData, FacingDirection, CrewPosition } from "./data.ts";
import { createSynthetics } from "@rules/synthetics.ts";

/** Vehicle actor — transports and war machines */
class VehicleDH2e extends ActorDH2e {
    declare system: VehicleSystemData;

    get structuralIntegrity(): number {
        return this.system.structuralIntegrity.value;
    }

    get maxSI(): number {
        return this.system.structuralIntegrity.max;
    }

    get isDestroyed(): boolean {
        return this.system.structuralIntegrity.value <= 0;
    }

    /** Get armour value for a specific facing */
    getFacingAP(facing: FacingDirection): number {
        return this.system.armour[facing] ?? 0;
    }

    /** Get crew at a specific position index */
    getCrewAt(index: number): CrewPosition | undefined {
        return this.system.crewPositions[index];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.synthetics = createSynthetics();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
    }

    /**
     * Apply damage to the vehicle.
     * Damage reduces SI. When SI reaches 0, excess triggers vehicle critical.
     */
    async applyVehicleDamage(wounds: number, facing: FacingDirection): Promise<void> {
        const ap = this.getFacingAP(facing);
        const effectiveDamage = Math.max(0, wounds - ap);

        if (effectiveDamage <= 0) {
            ui.notifications.info(`${this.name}: Armour absorbs all damage (${facing} AP ${ap}).`);
            return;
        }

        const current = this.system.structuralIntegrity.value;
        const newValue = Math.max(0, current - effectiveDamage);
        await this.update({ "system.structuralIntegrity.value": newValue });

        if (newValue <= 0) {
            const excess = Math.abs(current - effectiveDamage);
            ui.notifications.warn(
                `${this.name} destroyed! SI reduced to 0 (excess ${excess}). Vehicle Critical!`,
            );
            // Vehicle critical lookup will be handled by the caller
        } else {
            ui.notifications.info(
                `${this.name} takes ${effectiveDamage} SI damage from ${facing} (${current} → ${newValue}).`,
            );
        }
    }

    /** Assign an actor to a crew position */
    async assignCrew(positionIndex: number, actorId: string, actorName: string): Promise<void> {
        const positions = [...this.system.crewPositions];
        if (positionIndex >= 0 && positionIndex < positions.length) {
            positions[positionIndex] = {
                ...positions[positionIndex],
                actorId,
                actorName,
            };
            await this.update({ "system.crewPositions": positions });
        }
    }

    /** Remove an actor from a crew position */
    async removeCrew(positionIndex: number): Promise<void> {
        const positions = [...this.system.crewPositions];
        if (positionIndex >= 0 && positionIndex < positions.length) {
            positions[positionIndex] = {
                ...positions[positionIndex],
                actorId: "",
                actorName: "",
            };
            await this.update({ "system.crewPositions": positions });
        }
    }
}

export { VehicleDH2e };
