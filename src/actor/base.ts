import type { ActorType } from "./types.ts";

/** Base actor class for all DH2E actor types */
class ActorDH2e extends Actor {
    /** Typed system data access */
    override get system(): Record<string, unknown> {
        return super.system;
    }

    /** Actor type narrowing */
    get actorType(): ActorType {
        return this.type as ActorType;
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
