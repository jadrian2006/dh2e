/**
 * Foundry VTT mock factories for unit testing.
 *
 * These provide minimal stubs that satisfy type checks and allow
 * testing pure logic without a full Foundry environment.
 */

import { vi } from "vitest";
import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";

// ---------- Roll Mock ----------

export class MockRoll {
    formula: string;
    _total: number;
    _dice: { faces: number; results: { result: number }[] }[];

    constructor(formula: string) {
        this.formula = formula;
        this._total = 0;
        this._dice = [];
    }

    get total(): number {
        return this._total;
    }

    get dice() {
        return this._dice;
    }

    async evaluate(): Promise<this> {
        return this;
    }

    /** Helper to set a predetermined roll result */
    static create(formula: string, total: number, dice?: { faces: number; results: number[] }[]): MockRoll {
        const roll = new MockRoll(formula);
        roll._total = total;
        if (dice) {
            roll._dice = dice.map((d) => ({
                faces: d.faces,
                results: d.results.map((r) => ({ result: r })),
            }));
        }
        return roll;
    }
}

// ---------- ChatMessage Mock ----------

export class MockChatMessage {
    static messages: Record<string, unknown>[] = [];

    static getSpeaker(options?: { actor?: unknown }): { alias: string } {
        const actor = options?.actor as { name?: string } | undefined;
        return { alias: actor?.name ?? "Unknown" };
    }

    static async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
        MockChatMessage.messages.push(data);
        return data;
    }

    static reset(): void {
        MockChatMessage.messages = [];
    }
}

// ---------- Actor Mock ----------

export interface MockActorOptions {
    id?: string;
    name?: string;
    type?: string;
    characteristics?: Partial<Record<CharacteristicAbbrev, { base: number; advances: number }>>;
    wounds?: { value: number; max: number };
    fate?: { value: number; max: number };
    corruption?: number;
    insanity?: number;
    influence?: number;
    xp?: { total: number; spent: number };
    armour?: Partial<Record<HitLocationKey, number>>;
    items?: MockItemOptions[];
    magnitude?: { value: number; max: number };
    structuralIntegrity?: { value: number; max: number };
    vehicleArmour?: { front: number; side: number; rear: number };
}

function makeCharacteristics(
    overrides?: Partial<Record<CharacteristicAbbrev, { base: number; advances: number }>>,
): Record<CharacteristicAbbrev, { base: number; advances: number; value: number; bonus: number }> {
    const defaults: CharacteristicAbbrev[] = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];
    const result = {} as Record<CharacteristicAbbrev, { base: number; advances: number; value: number; bonus: number }>;
    for (const key of defaults) {
        const src = overrides?.[key] ?? { base: 30, advances: 0 };
        const value = src.base + src.advances * 5;
        result[key] = {
            base: src.base,
            advances: src.advances,
            value,
            bonus: Math.floor(value / 10),
        };
    }
    return result;
}

export function mockActor(options: MockActorOptions = {}): any {
    const chars = makeCharacteristics(options.characteristics);
    const type = options.type ?? "acolyte";

    const items = new Map<string, any>();
    const itemArray: any[] = [];

    for (const itemOpts of options.items ?? []) {
        const item = mockItem(itemOpts);
        items.set(item.id, item);
        itemArray.push(item);
    }

    const actor: any = {
        id: options.id ?? randomId(),
        name: options.name ?? "Test Acolyte",
        type,
        system: {
            characteristics: chars,
            wounds: options.wounds ?? { value: 12, max: 12 },
            fate: options.fate ?? { value: 3, max: 3 },
            corruption: options.corruption ?? 0,
            insanity: options.insanity ?? 0,
            influence: options.influence ?? 30,
            xp: { ...options.xp ?? { total: 500, spent: 100 }, available: (options.xp?.total ?? 500) - (options.xp?.spent ?? 100) },
            armour: {
                head: 0, rightArm: 0, leftArm: 0, body: 0, rightLeg: 0, leftLeg: 0,
                ...options.armour,
            },
            movement: {
                half: chars.ag.bonus,
                full: chars.ag.bonus * 2,
                charge: chars.ag.bonus * 3,
                run: chars.ag.bonus * 6,
            },
        },
        items: itemArray,
        synthetics: {
            modifiers: {},
            rollOptions: new Set<string>(),
            dosAdjustments: [],
            diceOverrides: {},
            toughnessAdjustments: [],
            resistances: [],
        },
        update: vi.fn(async () => {}),
        createEmbeddedDocuments: vi.fn(async () => []),
        deleteEmbeddedDocuments: vi.fn(async () => []),
        getActiveTokens: vi.fn(() => []),
    };

    // Proxy items array to also support .get() and .find() and .filter()
    actor.items.get = (id: string) => items.get(id);
    actor.items.find = (fn: (i: any) => boolean) => itemArray.find(fn);
    actor.items.filter = (fn: (i: any) => boolean) => itemArray.filter(fn);
    actor.items[Symbol.iterator] = function* () { yield* itemArray; };

    // Horde-specific
    if (type === "horde") {
        actor.system.magnitude = options.magnitude ?? { value: 30, max: 30 };
        actor.system.armour = 3;
    }

    // Vehicle-specific
    if (type === "vehicle") {
        actor.system.structuralIntegrity = options.structuralIntegrity ?? { value: 30, max: 30 };
        actor.system.armour = options.vehicleArmour ?? { front: 20, side: 15, rear: 10 };
        actor.system.crewPositions = [];
    }

    return actor;
}

// ---------- Item Mock ----------

export interface MockItemOptions {
    id?: string;
    name?: string;
    type?: string;
    system?: Record<string, unknown>;
    flags?: Record<string, unknown>;
    parent?: any;
}

export function mockItem(options: MockItemOptions = {}): any {
    return {
        id: options.id ?? randomId(),
        name: options.name ?? "Test Item",
        type: options.type ?? "gear",
        system: options.system ?? {},
        flags: options.flags ?? {},
        parent: options.parent ?? null,
        update: vi.fn(async () => {}),
        sheet: { render: vi.fn() },
    };
}

// ---------- Weapon Mock ----------

export interface MockWeaponOptions {
    id?: string;
    name?: string;
    weaponClass?: "melee" | "pistol" | "basic" | "heavy" | "thrown";
    damage?: { formula: string; type: string; bonus: number };
    penetration?: number;
    rof?: { single: boolean; semi: number; full: number };
    clip?: { value: number; max: number };
    qualities?: string[];
    equipped?: boolean;
}

export function mockWeapon(options: MockWeaponOptions = {}): any {
    const system = {
        class: options.weaponClass ?? "basic",
        range: 30,
        rof: options.rof ?? { single: true, semi: 3, full: 6 },
        damage: options.damage ?? { formula: "1d10", type: "impact", bonus: 3 },
        penetration: options.penetration ?? 0,
        clip: options.clip ?? { value: 30, max: 30 },
        reload: "Full",
        weight: 3,
        qualities: options.qualities ?? [],
        equipped: options.equipped ?? true,
        loadedAmmoId: "",
        rules: [],
        availability: "common",
    };

    return {
        id: options.id ?? randomId(),
        name: options.name ?? "Test Autogun",
        type: "weapon",
        system,
        effectiveDamage: {
            formula: system.damage.formula,
            type: system.damage.type,
            bonus: system.damage.bonus,
            penetration: system.penetration,
        },
        effectiveQualities: system.qualities,
        update: vi.fn(async () => {}),
    };
}

// ---------- Armour Mock ----------

export function mockArmour(options: {
    id?: string;
    name?: string;
    locations?: Partial<Record<HitLocationKey, number>>;
    equipped?: boolean;
} = {}): any {
    return mockItem({
        id: options.id,
        name: options.name ?? "Flak Coat",
        type: "armour",
        system: {
            equipped: options.equipped ?? true,
            locations: {
                head: 0, rightArm: 0, leftArm: 0, body: 0, rightLeg: 0, leftLeg: 0,
                ...options.locations,
            },
            weight: 5,
        },
    });
}

// ---------- Combat Mock ----------

export function mockCombat(combatants: { actorId: string; initiative?: number }[] = []): any {
    const combatantArray = combatants.map((c) => ({
        actorId: c.actorId,
        initiative: c.initiative ?? 0,
        setFlag: vi.fn(async () => {}),
        unsetFlag: vi.fn(async () => {}),
    }));

    return {
        combatants: combatantArray,
        round: 1,
        turn: 0,
        current: { combatantId: combatantArray[0]?.actorId ?? null },
    };
}

// ---------- Helpers ----------

let _idCounter = 0;
function randomId(): string {
    return `mock_${++_idCounter}`;
}

export function resetMockIds(): void {
    _idCounter = 0;
}
