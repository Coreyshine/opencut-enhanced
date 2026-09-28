import type { EffectDefinition } from "@/effects/types";

const numberParam = ({
	key,
	label,
	default: defaultValue,
	min = 0,
	max = 100,
	step = 1,
}: {
	key: string;
	label: string;
	default: number;
	min?: number;
	max?: number;
	step?: number;
}) => ({
	key,
	label,
	type: "number" as const,
	default: defaultValue,
	min,
	max,
	step,
	keyframable: false,
});

export const vignetteEffectDefinition: EffectDefinition = {
	type: "vignette",
	name: "Vignette",
	keywords: ["vignette", "darken", "edges", "focus"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 50 }),
		numberParam({ key: "radius", label: "Size", default: 55 }),
		numberParam({ key: "softness", label: "Feather", default: 50 }),
	],
	renderer: {
		passes: [
			{
				shader: "vignette",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.amount ?? 50),
					u_radius: Number(effectParams.radius ?? 55),
					u_softness: Number(effectParams.softness ?? 50),
				}),
			},
		],
	},
};

export const glowEffectDefinition: EffectDefinition = {
	type: "glow",
	name: "Glow",
	keywords: ["glow", "bloom", "dream", "light", "halation"],
	params: [
		numberParam({ key: "intensity", label: "Intensity", default: 45 }),
		numberParam({ key: "threshold", label: "Threshold", default: 55 }),
		numberParam({ key: "radius", label: "Radius", default: 40 }),
	],
	renderer: {
		passes: [
			{
				shader: "glow",
				uniforms: ({ effectParams }) => ({
					u_intensity: Number(effectParams.intensity ?? 45),
					u_threshold: Number(effectParams.threshold ?? 55),
					u_radius: Number(effectParams.radius ?? 40),
				}),
			},
		],
	},
};

export const grainEffectDefinition: EffectDefinition = {
	type: "grain",
	name: "Film Grain",
	keywords: ["grain", "noise", "film", "texture", "analog"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 35 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 1, max: 20 }),
		// Animate seed via keyframes to make the grain flicker like real film.
		{
			key: "seed",
			label: "Seed",
			type: "number",
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "grain",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.amount ?? 35),
					u_size: Number(effectParams.size ?? 2),
					u_seed: Number(effectParams.seed ?? 0),
				}),
			},
		],
	},
};

export const pixelateEffectDefinition: EffectDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixelate", "pixel", "mosaic", "8bit", "retro", "censor"],
	params: [
		{
			key: "size",
			label: "Pixel Size",
			type: "number",
			default: 24,
			min: 2,
			max: 200,
			step: 1,
			keyframable: false,
		},
	],
	renderer: {
		passes: [
			{
				shader: "pixelate",
				uniforms: ({ effectParams, width }) => {
					// Stored size is relative to a 1920px-wide reference so the
					// look is resolution independent.
					const relative = Number(effectParams.size ?? 24);
					return {
						u_pixel_size: Math.max(1, (relative * width) / 1920),
					};
				},
			},
		],
	},
};

export const chromaticAberrationEffectDefinition: EffectDefinition = {
	type: "chromatic-aberration",
	name: "Chromatic Aberration",
	keywords: ["chromatic", "aberration", "lens", "rgb", "fringe", "distort"],
	params: [numberParam({ key: "amount", label: "Amount", default: 30 })],
	renderer: {
		passes: [
			{
				shader: "chromatic-aberration",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.amount ?? 30),
				}),
			},
		],
	},
};

export const rgbSplitEffectDefinition: EffectDefinition = {
	type: "rgb-split",
	name: "RGB Split",
	keywords: ["rgb", "split", "glitch", "offset", "chromatic"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 25 }),
		numberParam({ key: "angle", label: "Angle", default: 0, min: 0, max: 360 }),
	],
	renderer: {
		passes: [
			{
				shader: "rgb-split",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.amount ?? 25),
					u_angle: Number(effectParams.angle ?? 0),
				}),
			},
		],
	},
};

export const zoomBlurEffectDefinition: EffectDefinition = {
	type: "zoom-blur",
	name: "Zoom Blur",
	keywords: ["zoom", "blur", "radial", "speed", "dolly", "motion"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 35 }),
		{
			key: "centerX",
			label: "Center X",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
			keyframable: false,
		},
		{
			key: "centerY",
			label: "Center Y",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
			keyframable: false,
		},
	],
	renderer: {
		passes: [
			{
				shader: "zoom-blur",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.amount ?? 35),
					u_center: [
						Number(effectParams.centerX ?? 50) / 100,
						Number(effectParams.centerY ?? 50) / 100,
					],
				}),
			},
		],
	},
};

export const glitchEffectDefinition: EffectDefinition = {
	type: "glitch",
	name: "Glitch",
	keywords: ["glitch", "vhs", "tear", "distort", "digital", "noise"],
	params: [
		numberParam({ key: "intensity", label: "Intensity", default: 40 }),
		numberParam({ key: "blockiness", label: "Block Size", default: 12, min: 2, max: 120 }),
		// Animate seed via keyframes for an animated glitch.
		{
			key: "seed",
			label: "Seed",
			type: "number",
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "glitch",
				uniforms: ({ effectParams }) => ({
					u_intensity: Number(effectParams.intensity ?? 40),
					u_blockiness: Number(effectParams.blockiness ?? 12),
					u_seed: Number(effectParams.seed ?? 0),
				}),
			},
		],
	},
};

export const chromaKeyEffectDefinition: EffectDefinition = {
	type: "chroma-key",
	name: "Chroma Key",
	keywords: ["chroma", "key", "green", "screen", "blue", "background", "remove"],
	params: [
		{
			key: "keyColor",
			label: "Key Color",
			type: "color",
			default: "#00b140",
			keyframable: false,
		},
		numberParam({ key: "similarity", label: "Similarity", default: 35 }),
		numberParam({ key: "smoothness", label: "Smoothness", default: 20 }),
		numberParam({ key: "spill", label: "Spill", default: 40 }),
	],
	renderer: {
		passes: [
			{
				shader: "chroma-key",
				uniforms: ({ effectParams }) => ({
					u_key_color: hexToRgb01({
						hex: String(effectParams.keyColor ?? "#00b140"),
					}),
					u_similarity: Number(effectParams.similarity ?? 35),
					u_smoothness: Number(effectParams.smoothness ?? 20),
					u_spill: Number(effectParams.spill ?? 40),
				}),
			},
		],
	},
};

export function hexToRgb01({ hex }: { hex: string }): [number, number, number] {
	const value = hex.replace("#", "");
	const full =
		value.length === 3
			? value
					.split("")
					.map((c) => c + c)
					.join("")
			: value;
	const int = Number.parseInt(full.slice(0, 6), 16);
	if (Number.isNaN(int)) {
		return [0, 1, 0];
	}
	return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}
