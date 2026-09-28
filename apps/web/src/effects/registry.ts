import { DefinitionRegistry } from "@/params/registry";
import type { EffectDefinition } from "@/effects/types";

export class EffectsRegistry extends DefinitionRegistry<string, EffectDefinition> {
	constructor() {
		super("effect");
	}
}

export const effectsRegistry = new EffectsRegistry();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __effectsDebug: object }).__effectsDebug = effectsRegistry;
}
