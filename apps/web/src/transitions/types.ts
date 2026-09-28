import type { MediaTime } from "@/wasm";
import type { EffectPass, EffectUniformValue } from "@/effects/types";
import type { ParamDefinition } from "@/params";

/** Stored on the outgoing element of a transition junction. */
export interface ElementTransition {
	type: string;
	duration: MediaTime;
	params?: Record<string, string | number | boolean>;
}

export interface TransitionBuildPassesParams {
	/** 0 → fully outgoing, 1 → fully incoming. */
	progress: number;
	width: number;
	height: number;
	params: Record<string, string | number | boolean>;
}

export interface TransitionDefinition {
	type: string;
	name: string;
	keywords: string[];
	/** Default transition duration in seconds. */
	defaultDurationSeconds: number;
	/** Cap on transition duration as a fraction of the shorter adjacent clip. */
	maxDurationFraction?: number;
	params?: ParamDefinition[];
	/** Thumbnail gradient for the assets grid. */
	swatch: [string, string];
	buildPasses({
		progress,
		width,
		height,
		params,
	}: TransitionBuildPassesParams): EffectPass[];
}

export type TransitionUniformValue = EffectUniformValue;
