import type { EffectDefinition, EffectPass } from "@/effects/types";

export const COLOR_ADJUST_SHADER = "color-adjust";

export interface ColorAdjustValues {
	exposure: number;
	brightness: number;
	contrast: number;
	saturation: number;
	temperature: number;
	tint: number;
	hue: number;
	highlights: number;
	shadows: number;
	sharpen: number;
}

export const NEUTRAL_COLOR_ADJUST: ColorAdjustValues = {
	exposure: 0,
	brightness: 0,
	contrast: 0,
	saturation: 0,
	temperature: 0,
	tint: 0,
	hue: 0,
	highlights: 0,
	shadows: 0,
	sharpen: 0,
};

export function lerpColorAdjustValues({
	from,
	to,
	amount,
}: {
	from: ColorAdjustValues;
	to: ColorAdjustValues;
	amount: number;
}): ColorAdjustValues {
	const keys = Object.keys(NEUTRAL_COLOR_ADJUST) as Array<
		keyof ColorAdjustValues
	>;
	const result = { ...NEUTRAL_COLOR_ADJUST };
	for (const key of keys) {
		result[key] = from[key] + (to[key] - from[key]) * amount;
	}
	return result;
}

export function buildColorAdjustPasses({
	values,
}: {
	values: ColorAdjustValues;
}): EffectPass[] {
	return [
		{
			shader: COLOR_ADJUST_SHADER,
			uniforms: {
				u_exposure: values.exposure,
				u_brightness: values.brightness,
				u_contrast: values.contrast,
				u_saturation: values.saturation,
				u_temperature: values.temperature,
				u_tint: values.tint,
				u_hue: values.hue,
				u_highlights: values.highlights,
				u_shadows: values.shadows,
				u_sharpen: values.sharpen,
			},
		},
	];
}

const ADJUST_PARAM_BASE = {
	keyframable: false,
} as const;

export const adjustEffectDefinition: EffectDefinition = {
	type: "adjust",
	name: "Adjust",
	keywords: ["adjust", "color", "brightness", "contrast", "saturation", "exposure"],
	params: [
		{
			...ADJUST_PARAM_BASE,
			key: "exposure",
			label: "Exposure",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "brightness",
			label: "Brightness",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "contrast",
			label: "Contrast",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "saturation",
			label: "Saturation",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "temperature",
			label: "Temperature",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "tint",
			label: "Tint",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "hue",
			label: "Hue",
			type: "number",
			default: 0,
			min: -180,
			max: 180,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "highlights",
			label: "Highlights",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "shadows",
			label: "Shadows",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			...ADJUST_PARAM_BASE,
			key: "sharpen",
			label: "Sharpen",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [],
		buildPasses: ({ effectParams }) =>
			buildColorAdjustPasses({
				values: {
					exposure: Number(effectParams.exposure ?? 0),
					brightness: Number(effectParams.brightness ?? 0),
					contrast: Number(effectParams.contrast ?? 0),
					saturation: Number(effectParams.saturation ?? 0),
					temperature: Number(effectParams.temperature ?? 0),
					tint: Number(effectParams.tint ?? 0),
					hue: Number(effectParams.hue ?? 0),
					highlights: Number(effectParams.highlights ?? 0),
					shadows: Number(effectParams.shadows ?? 0),
					sharpen: Number(effectParams.sharpen ?? 0),
				},
			}),
	},
};
