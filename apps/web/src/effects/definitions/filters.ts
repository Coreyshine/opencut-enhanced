import type { EffectDefinition, EffectPass } from "@/effects/types";
import {
	buildColorAdjustPasses,
	lerpColorAdjustValues,
	NEUTRAL_COLOR_ADJUST,
	type ColorAdjustValues,
} from "./color-adjust";

export interface FilterPreset {
	id: string;
	name: string;
	category:
		| "natural"
		| "film"
		| "portrait"
		| "food"
		| "scenery"
		| "mono"
		| "retro"
		| "city";
	keywords: string[];
	/** Color adjust values applied at 100% intensity. */
	values: Partial<ColorAdjustValues>;
	/** Two-color swatch used by the preset thumbnail. */
	swatch: [string, string];
}

export const FILTER_PRESETS: FilterPreset[] = [
	// Natural
	{
		id: "clear",
		name: "Clear",
		category: "natural",
		keywords: ["clear", "clean", "natural"],
		values: { contrast: 8, saturation: 10, sharpen: 10 },
		swatch: ["#7ec8ff", "#ffffff"],
	},
	{
		id: "fresh",
		name: "Fresh",
		category: "natural",
		keywords: ["fresh", "airy", "bright"],
		values: { exposure: 8, brightness: 5, saturation: 14, temperature: -8 },
		swatch: ["#a8e6cf", "#ffffff"],
	},
	{
		id: "morning",
		name: "Morning",
		category: "natural",
		keywords: ["morning", "warm", "sunrise"],
		values: { exposure: 6, temperature: 18, highlights: 8 },
		swatch: ["#ffd8a8", "#fff3e0"],
	},
	{
		id: "polar",
		name: "Polar",
		category: "natural",
		keywords: ["polar", "cool", "cold", "ice"],
		values: { temperature: -22, saturation: -6, brightness: 4 },
		swatch: ["#a9d3ff", "#e3f2fd"],
	},
	// Film
	{
		id: "kodak",
		name: "Kodak",
		category: "film",
		keywords: ["kodak", "film", "retro", "vintage"],
		values: { contrast: 14, saturation: 8, temperature: 14, shadows: 12 },
		swatch: ["#e6b980", "#8d6e63"],
	},
	{
		id: "fuji",
		name: "Fuji",
		category: "film",
		keywords: ["fuji", "film", "green"],
		values: { contrast: 10, saturation: -4, temperature: -10, tint: 8, shadows: 8 },
		swatch: ["#88b04b", "#e0e5cd"],
	},
	{
		id: "portra",
		name: "Portra",
		category: "film",
		keywords: ["portra", "film", "soft"],
		values: { contrast: -4, saturation: -8, temperature: 10, shadows: 14 },
		swatch: ["#d7a98c", "#f6e3d4"],
	},
	{
		id: "cinema",
		name: "Cinema",
		category: "film",
		keywords: ["cinema", "movie", "teal", "orange"],
		values: { contrast: 18, saturation: -6, temperature: 12, shadows: -14, highlights: 6 },
		swatch: ["#0f4c5c", "#e36414"],
	},
	{
		id: "noir-film",
		name: "Old Film",
		category: "film",
		keywords: ["old", "sepia", "faded", "70s"],
		values: { contrast: 8, saturation: -30, temperature: 26, tint: 6, shadows: 16 },
		swatch: ["#b49a67", "#efe1c6"],
	},
	// Portrait
	{
		id: "porcelain",
		name: "Porcelain",
		category: "portrait",
		keywords: ["porcelain", "skin", "soft", "portrait"],
		values: { exposure: 6, contrast: -6, saturation: -6, temperature: 6, shadows: 12 },
		swatch: ["#f3d1c0", "#ffffff"],
	},
	{
		id: "honey",
		name: "Honey",
		category: "portrait",
		keywords: ["honey", "golden", "warm", "glow"],
		values: { exposure: 4, temperature: 20, highlights: 10, saturation: 6 },
		swatch: ["#f2b134", "#ffe9b3"],
	},
	{
		id: "candy",
		name: "Candy",
		category: "portrait",
		keywords: ["candy", "pink", "sweet", "pop"],
		values: { saturation: 20, tint: 14, contrast: 6, brightness: 4 },
		swatch: ["#ff8fab", "#ffc2d1"],
	},
	{
		id: "noir",
		name: "Noir",
		category: "portrait",
		keywords: ["noir", "dark", "moody", "dramatic"],
		values: { contrast: 26, saturation: -12, shadows: -18, highlights: -6 },
		swatch: ["#37474f", "#90a4ae"],
	},
	// Food
	{
		id: "feast",
		name: "Feast",
		category: "food",
		keywords: ["food", "feast", "appetizing", "warm"],
		values: { saturation: 18, temperature: 16, contrast: 8, sharpen: 16 },
		swatch: ["#e65100", "#ffcc80"],
	},
	{
		id: "cream",
		name: "Cream",
		category: "food",
		keywords: ["cream", "dessert", "soft", "cake"],
		values: { exposure: 8, temperature: 12, saturation: 6, shadows: 10 },
		swatch: ["#fff3e0", "#ffe0b2"],
	},
	{
		id: "sushi",
		name: "Fresh Bite",
		category: "food",
		keywords: ["sushi", "fresh", "cool", "crisp"],
		values: { saturation: 12, temperature: -12, contrast: 10, sharpen: 12 },
		swatch: ["#26a69a", "#b2dfdb"],
	},
	// Scenery
	{
		id: "vivid",
		name: "Vivid",
		category: "scenery",
		keywords: ["vivid", "punchy", "hdr", "landscape"],
		values: { saturation: 26, contrast: 16, sharpen: 18, highlights: -8, shadows: 6 },
		swatch: ["#43a047", "#1e88e5"],
	},
	{
		id: "sky",
		name: "Sky",
		category: "scenery",
		keywords: ["sky", "blue", "cloud", "travel"],
		values: { saturation: 14, temperature: -14, contrast: 10, highlights: -6 },
		swatch: ["#2196f3", "#bbdefb"],
	},
	{
		id: "forest",
		name: "Forest",
		category: "scenery",
		keywords: ["forest", "green", "nature", "woods"],
		values: { saturation: 16, tint: -12, temperature: -6, contrast: 8 },
		swatch: ["#2e7d32", "#a5d6a7"],
	},
	{
		id: "sunset",
		name: "Sunset",
		category: "scenery",
		keywords: ["sunset", "dusk", "golden", "orange"],
		values: { temperature: 24, saturation: 12, contrast: 8, highlights: -10, shadows: 8 },
		swatch: ["#ff7043", "#ffd54f"],
	},
	{
		id: "moonlit",
		name: "Moonlit",
		category: "scenery",
		keywords: ["night", "moon", "dark", "blue"],
		values: { exposure: -6, temperature: -20, contrast: 12, saturation: -10, shadows: -12 },
		swatch: ["#1a237e", "#7986cb"],
	},
	// Mono
	{
		id: "bw",
		name: "B&W",
		category: "mono",
		keywords: ["black", "white", "monochrome", "bw", "grayscale"],
		values: { saturation: -100, contrast: 12 },
		swatch: ["#212121", "#e0e0e0"],
	},
	{
		id: "bw-soft",
		name: "Soft B&W",
		category: "mono",
		keywords: ["black", "white", "soft", "monochrome"],
		values: { saturation: -100, contrast: -8, shadows: 14, exposure: 6 },
		swatch: ["#616161", "#eeeeee"],
	},
	{
		id: "bw-noir",
		name: "Hard B&W",
		category: "mono",
		keywords: ["black", "white", "hard", "contrast", "monochrome"],
		values: { saturation: -100, contrast: 34, shadows: -16, sharpen: 14 },
		swatch: ["#000000", "#fafafa"],
	},
	// Retro
	{
		id: "vintage-faded",
		name: "Faded",
		category: "retro",
		keywords: ["faded", "washed", "soft", "old"],
		values: { contrast: -12, saturation: -20, shadows: 22, highlights: 10, temperature: 8 },
		swatch: ["#c4b79b", "#f2ede4"],
	},
	{
		id: "vintage-polaroid",
		name: "Polaroid",
		category: "retro",
		keywords: ["polaroid", "instant", "retro", "warm"],
		values: { contrast: 8, saturation: -10, temperature: 18, tint: 10, shadows: 18, highlights: -8 },
		swatch: ["#e8c39e", "#fff8e7"],
	},
	{
		id: "vintage-seventies",
		name: "70s",
		category: "retro",
		keywords: ["seventies", "70s", "retro", "orange", "groove"],
		values: { contrast: 14, saturation: 6, temperature: 28, tint: -8, shadows: 12, highlights: -12 },
		swatch: ["#d98324", "#5c4033"],
	},
	{
		id: "vintage-vhs",
		name: "VHS",
		category: "retro",
		keywords: ["vhs", "tape", "80s", "retro", "glitch"],
		values: { contrast: 18, saturation: 24, temperature: -8, tint: 12, highlights: -14, sharpen: 8 },
		swatch: ["#3d5a80", "#ee6c4d"],
	},
	// City / stylistic
	{
		id: "city-gold-black",
		name: "Gold & Black",
		category: "city",
		keywords: ["gold", "black", "黑金", "luxury", "city", "night"],
		values: { contrast: 30, saturation: -14, temperature: 22, tint: -6, highlights: 16, shadows: -22, sharpen: 12 },
		swatch: ["#0d0d0d", "#d4af37"],
	},
	{
		id: "city-cyberpunk",
		name: "Cyberpunk",
		category: "city",
		keywords: ["cyberpunk", "neon", "sci-fi", "purple", "city"],
		values: { contrast: 22, saturation: 32, temperature: -18, tint: 22, highlights: -10, shadows: -10 },
		swatch: ["#ff2a6d", "#05d9e8"],
	},
	{
		id: "city-hongkong",
		name: "HK Cinema",
		category: "city",
		keywords: ["hongkong", "港风", "cinema", "moody"],
		values: { contrast: 20, saturation: -8, temperature: -6, tint: 14, highlights: -16, shadows: -8 },
		swatch: ["#2b2d42", "#8d99ae"],
	},
	// Nature-ish additions
	{
		id: "japanese-fresh",
		name: "Japanese Fresh",
		category: "natural",
		keywords: ["japanese", "日系", "clean", "airy", "soft"],
		values: { exposure: 10, contrast: -8, saturation: -8, temperature: -4, highlights: 14, shadows: 10 },
		swatch: ["#dfe9f3", "#ffffff"],
	},
	{
		id: "sunset-golden",
		name: "Golden Hour",
		category: "scenery",
		keywords: ["sunset", "golden", "hour", "warm", "dusk"],
		values: { exposure: 4, contrast: 10, saturation: 14, temperature: 30, highlights: -14, shadows: 10 },
		swatch: ["#ff9a3c", "#ffd66b"],
	},
];

export const DEFAULT_FILTER_INTENSITY = 60;

export function getFilterPreset({ id }: { id: string }): FilterPreset | null {
	return FILTER_PRESETS.find((preset) => preset.id === id) ?? null;
}

export const filterEffectDefinition: EffectDefinition = {
	type: "filter",
	name: "Filter",
	keywords: ["filter", "preset", "look", "style"],
	params: [
		{
			key: "preset",
			label: "Preset",
			type: "select",
			default: FILTER_PRESETS[0].id,
			keyframable: false,
			options: FILTER_PRESETS.map((preset) => ({
				value: preset.id,
				label: preset.name,
			})),
		},
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: DEFAULT_FILTER_INTENSITY,
			min: 0,
			max: 100,
			step: 1,
			keyframable: false,
		},
	],
	renderer: {
		passes: [],
		buildPasses: ({ effectParams }) => {
			const preset = getFilterPreset({
				id: String(effectParams.preset ?? FILTER_PRESETS[0].id),
			});
			if (!preset) {
				return [];
			}
			const intensity = Math.max(
				0,
				Math.min(100, Number(effectParams.intensity ?? DEFAULT_FILTER_INTENSITY)),
			);
			if (intensity === 0) {
				return [];
			}
			return buildColorAdjustPasses({
				values: lerpColorAdjustValues({
					from: NEUTRAL_COLOR_ADJUST,
					to: { ...NEUTRAL_COLOR_ADJUST, ...preset.values },
					amount: intensity / 100,
				}),
			});
		},
	},
};
