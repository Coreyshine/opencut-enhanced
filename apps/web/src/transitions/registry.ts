import type { EffectPass } from "@/effects/types";
import type { TransitionDefinition } from "./types";

class TransitionsRegistry {
	private definitions = new Map<string, TransitionDefinition>();

	register({ definition }: { definition: TransitionDefinition }): void {
		this.definitions.set(definition.type, definition);
	}

	has(type: string): boolean {
		return this.definitions.has(type);
	}

	get(type: string): TransitionDefinition {
		const definition = this.definitions.get(type);
		if (!definition) {
			throw new Error(`Unknown transition: ${type}`);
		}
		return definition;
	}

	getOrNull(type: string): TransitionDefinition | null {
		return this.definitions.get(type) ?? null;
	}

	getAll(): TransitionDefinition[] {
		return Array.from(this.definitions.values());
	}
}

export const transitionsRegistry = new TransitionsRegistry();

/**
 * Builds the GPU passes for a transition at a given progress. Both inputs are
 * full-canvas renders: A = scene with the outgoing element, B = scene with the
 * incoming element.
 */
export function buildTransitionPasses({
	type,
	progress,
	width,
	height,
	params,
}: {
	type: string;
	progress: number;
	width: number;
	height: number;
	params: Record<string, string | number | boolean>;
}): EffectPass[] {
	const definition = transitionsRegistry.getOrNull(type);
	if (!definition) {
		return [];
	}
	return definition.buildPasses({ progress, width, height, params });
}
