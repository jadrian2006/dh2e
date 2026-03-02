import type { ActorType } from "./types.ts";
import { createSynthetics, type DH2eSynthetics } from "@rules/synthetics.ts";

/** Size trait name → token grid dimensions (capped at 5×5) */
const SIZE_TOKEN_MAP: Record<string, number> = {
    "Size (Puny)": 0.5,
    "Size (Scrawny)": 0.5,
    "Size (Hulking)": 2,
    "Size (Enormous)": 3,
    "Size (Massive)": 4,
    "Size (Immense)": 5,
};

/** Base actor class for all DH2E actor types */
class ActorDH2e extends Actor {
    /** Synthetics registry — populated during data preparation by Rule Elements */
    synthetics: DH2eSynthetics = createSynthetics();

    /** Actor type narrowing */
    get actorType(): ActorType {
        return this.type as ActorType;
    }

    /** Sync prototype token size when embedded items change */
    protected override _onCreateDescendantDocuments(
        parent: this,
        collection: string,
        documents: Document[],
        data: object[],
        options: object,
        userId: string,
    ): void {
        super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
        if (collection === "items") this.#syncTokenSize();
    }

    protected override _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: Document[],
        ids: string[],
        options: object,
        userId: string,
    ): void {
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
        if (collection === "items") this.#syncTokenSize();
    }

    /** Check for Size traits and update prototype token dimensions accordingly */
    async #syncTokenSize(): Promise<void> {
        if (!(game as any).user?.isGM) return;

        let dim = 1; // Average default
        for (const item of this.items) {
            if (item.type !== "trait") continue;
            const mapped = SIZE_TOKEN_MAP[item.name];
            if (mapped !== undefined) {
                dim = mapped;
                break;
            }
        }

        const pt = (this as any).prototypeToken;
        if (pt?.width === dim && pt?.height === dim) return;

        await this.update({
            "prototypeToken.width": dim,
            "prototypeToken.height": dim,
        });
    }
}

/** Proxy that dispatches Actor construction to the correct subclass by type */
const ActorProxyDH2e = new Proxy(ActorDH2e, {
    construct(
        _target,
        args: [source: PreCreate<Record<string, unknown>>, context?: DocumentConstructionContext],
    ) {
        const type = args[0]?.type as string;
        const ActorClass: typeof ActorDH2e | undefined =
            CONFIG.DH2E?.Actor?.documentClasses?.[type] as typeof ActorDH2e | undefined;
        if (!ActorClass) {
            throw new Error(`DH2E | Actor type "${type}" does not have a registered document class.`);
        }
        return new ActorClass(...args);
    },
});

export { ActorDH2e, ActorProxyDH2e };
