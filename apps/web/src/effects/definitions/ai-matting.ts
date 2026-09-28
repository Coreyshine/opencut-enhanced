import type { EffectDefinition } from "@/effects/types";

/**
 * AI Matting: removes the background from video/image clips using local
 * segmentation (RMBG-1.4). Unlike chroma key, works on any background
 * without a green screen. The segmentation model runs locally in the browser.
 */
export const aiMattingEffectDefinition: EffectDefinition = {
	type: "ai-matting",
	name: "AI Matting",
	keywords: ["ai", "matting", "background", "remove", "cutout", "抠图", "智能"],
	params: [
		{
			key: "feather",
			label: "Edge Feather",
			type: "number",
			default: 2,
			min: 0,
			max: 20,
			step: 1,
			keyframable: false,
		},
	],
	renderer: {
		// AI matting is not a GPU shader — it pre-processes the source frame
		// before it enters the compositor. The passes list is intentionally
		// empty; the processing happens in the resolve pipeline.
		passes: [],
		buildPasses: () => [],
	},
};
