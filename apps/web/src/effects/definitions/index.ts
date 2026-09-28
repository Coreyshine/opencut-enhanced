import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { adjustEffectDefinition } from "./color-adjust";
import { filterEffectDefinition } from "./filters";
import {
	chromaKeyEffectDefinition,
	chromaticAberrationEffectDefinition,
	glitchEffectDefinition,
	glowEffectDefinition,
	grainEffectDefinition,
	pixelateEffectDefinition,
	rgbSplitEffectDefinition,
	vignetteEffectDefinition,
	zoomBlurEffectDefinition,
} from "./effects-extra";
import { CATALOG_EFFECT_DEFINITIONS } from "./effects-catalog";
import { aiMattingEffectDefinition } from "./ai-matting";

const defaultEffects = [
	blurEffectDefinition,
	adjustEffectDefinition,
	filterEffectDefinition,
	vignetteEffectDefinition,
	glowEffectDefinition,
	grainEffectDefinition,
	pixelateEffectDefinition,
	chromaticAberrationEffectDefinition,
	rgbSplitEffectDefinition,
	zoomBlurEffectDefinition,
	glitchEffectDefinition,
	chromaKeyEffectDefinition,
	...CATALOG_EFFECT_DEFINITIONS,
	aiMattingEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
