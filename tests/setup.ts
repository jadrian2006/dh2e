/**
 * Vitest global setup — mocks Foundry VTT globals so pure logic
 * modules can be imported without a running Foundry instance.
 */
import { vi, beforeEach } from "vitest";
import { MockRoll, MockChatMessage, resetMockIds } from "./mocks/foundry.ts";

// ---------- Foundry global stubs ----------

const mockSettings = new Map<string, unknown>();
mockSettings.set("dh2e.modifierCap", 60);
mockSettings.set("dh2e.invertShiftRoll", false);
mockSettings.set("dh2e.automateCorruption", true);
mockSettings.set("dh2e.automateInsanity", true);

const mockGame = {
    user: { isGM: true, id: "gm001" },
    actors: {
        get: vi.fn(() => undefined),
    },
    combat: null,
    settings: {
        get: vi.fn((namespace: string, key: string) => {
            return mockSettings.get(`${namespace}.${key}`);
        }),
        set: vi.fn(async (namespace: string, key: string, value: unknown) => {
            mockSettings.set(`${namespace}.${key}`, value);
        }),
    },
    i18n: {
        localize: vi.fn((key: string) => key),
        format: vi.fn((key: string, data?: Record<string, unknown>) => {
            if (data) return `${key} ${JSON.stringify(data)}`;
            return key;
        }),
    },
    dh2e: { config: {} },
};

const mockUi = {
    notifications: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
};

const mockCanvas = {
    scene: null,
    tokens: { placeables: [] },
};

const mockCONST = {
    DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 },
    ACTIVE_EFFECT_MODES: { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 },
};

const mockHooks = {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    callAll: vi.fn(),
};

const mockCONFIG = {
    DH2E: {
        Actor: { documentClasses: {} },
        Item: { documentClasses: {} },
    },
    Combat: { initiative: { formula: "1d10 + @characteristics.ag.bonus", decimals: 0 } },
    statusEffects: [],
};

// Stub Actor / Item base classes (enough for instanceof checks and construction)
class StubActor {
    id: string;
    name: string;
    type: string;
    system: any;
    items: any[];
    _source: any;
    flags: any;

    constructor(data?: any) {
        this.id = data?.id ?? "stub";
        this.name = data?.name ?? "Stub Actor";
        this.type = data?.type ?? "acolyte";
        this.system = data?.system ?? {};
        this.items = data?.items ?? [];
        this._source = { system: this.system };
        this.flags = data?.flags ?? {};
    }

    prepareBaseData() {}
    prepareDerivedData() {}
    async update() {}
    async createEmbeddedDocuments() { return []; }
    async deleteEmbeddedDocuments() { return []; }
    getActiveTokens() { return []; }
}

class StubItem {
    id: string;
    name: string;
    type: string;
    system: any;
    parent: any;
    flags: any;
    _source: any;

    constructor(data?: any) {
        this.id = data?.id ?? "stub";
        this.name = data?.name ?? "Stub Item";
        this.type = data?.type ?? "gear";
        this.system = data?.system ?? {};
        this.parent = data?.parent ?? null;
        this.flags = data?.flags ?? {};
        this._source = { system: this.system };
    }

    async update() {}
}

// Foundry namespace mocks that match the define aliases in vitest.config.ts
const foundryMocks = {
    fa: {
        handlebars: {
            renderTemplate: vi.fn(async (_path: string, data: unknown) => JSON.stringify(data)),
        },
        api: {
            ApplicationV2: class {},
        },
    },
    fd: {
        ChatMessage: MockChatMessage,
        Actor: StubActor,
        Item: StubItem,
    },
    fu: {
        mergeObject: vi.fn((original: any, other: any) => ({ ...original, ...other })),
        duplicate: vi.fn((data: any) => JSON.parse(JSON.stringify(data))),
    },
    fh: {},
    fc: mockCONST,
    fav1: {},
};

// Install globals
(globalThis as any).__foundryMocks = foundryMocks;
(globalThis as any).game = mockGame;
(globalThis as any).ui = mockUi;
(globalThis as any).canvas = mockCanvas;
(globalThis as any).CONFIG = mockCONFIG;
(globalThis as any).Hooks = mockHooks;
(globalThis as any).Actor = StubActor;
(globalThis as any).Item = StubItem;
(globalThis as any).ChatMessage = MockChatMessage;
(globalThis as any).fromUuid = vi.fn(async () => null);

// Mock foundry.dice.Roll
(globalThis as any).foundry = {
    dice: { Roll: MockRoll },
    documents: foundryMocks.fd,
    applications: foundryMocks.fa,
    utils: foundryMocks.fu,
    helpers: foundryMocks.fh,
    CONST: mockCONST,
    appv1: foundryMocks.fav1,
};

// ---------- Reset between tests ----------

beforeEach(() => {
    vi.clearAllMocks();
    MockChatMessage.reset();
    resetMockIds();
    mockGame.user.isGM = true;
    mockGame.combat = null;
});

// Re-export for convenience
export { mockGame, mockUi, mockCONFIG, mockHooks, mockSettings, MockRoll, MockChatMessage };
