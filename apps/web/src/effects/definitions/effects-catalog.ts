import type { EffectDefinition } from "@/effects/types";
import type { ParamValues } from "@/params";
import { hexToRgb01 } from "./effects-extra";

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

type UniformValueBuilder =
	| number
	| number[]
	| ((params: ParamValues, time?: number) => number | number[]);

const renderer = (
	shader: string,
	uniforms: Record<string, UniformValueBuilder>,
) => ({
	buildPasses: ({
		effectParams,
		time,
	}: {
		effectParams: ParamValues;
		time?: number;
	}) => {
		const resolved: Record<string, number | number[]> = {};
		for (const [name, value] of Object.entries(uniforms)) {
			resolved[name] =
				typeof value === "function" ? value(effectParams, time) : value;
		}
		return [{ shader, uniforms: resolved }];
	},
});

export const fisheyeEffectDefinition: EffectDefinition = {
	type: "fisheye",
	name: "Fisheye",
	keywords: ["fisheye", "lens", "distort", "barrel", "round"],
	params: [numberParam({ key: "amount", label: "Amount", default: 60, min: -100 })],
	renderer: renderer("fisheye", {
		u_amount: (p) => Number(p.amount ?? 60),
	}),
};

export const swirlEffectDefinition: EffectDefinition = {
	type: "swirl",
	name: "Swirl",
	keywords: ["swirl", "twirl", "spiral", "distort", "vortex"],
	params: [
		numberParam({ key: "angle", label: "Angle", default: 180, min: -360, max: 360 }),
		numberParam({ key: "radius", label: "Radius", default: 100 }),
	],
	renderer: renderer("swirl", {
		u_angle: (p) => Number(p.angle ?? 180),
		u_radius: (p) => Number(p.radius ?? 100),
	}),
};

export const waveEffectDefinition: EffectDefinition = {
	type: "wave",
	name: "Ripple",
	keywords: ["wave", "ripple", "water", "distort", "wobble"],
	params: [
		numberParam({ key: "amplitude", label: "Amplitude", default: 40 }),
		numberParam({
			key: "wavelength",
			label: "Wavelength",
			default: 120,
			min: 10,
			max: 500,
		}),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 2,
			min: 0,
			max: 10,
			step: 0.1,
		}),
	],
	renderer: renderer("wave", {
		u_amplitude: (p) => Number(p.amplitude ?? 40),
		u_wavelength: (p) => Number(p.wavelength ?? 120),
		u_speed: (p) => Number(p.speed ?? 2),
		u_time: (_p, time = 0) => time,
	}),
};

export const motionBlurEffectDefinition: EffectDefinition = {
	type: "motion-blur",
	name: "Motion Blur",
	keywords: ["motion", "blur", "directional", "speed", "smear"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 40 }),
		numberParam({ key: "angle", label: "Angle", default: 0, min: 0, max: 360 }),
	],
	renderer: renderer("motion-blur", {
		u_amount: (p) => Number(p.amount ?? 40),
		u_angle: (p) => Number(p.angle ?? 0),
	}),
};

export const mirrorEffectDefinition: EffectDefinition = {
	type: "mirror",
	name: "Mirror",
	keywords: ["mirror", "flip", "symmetry", "split", "kaleido"],
	params: [
		numberParam({ key: "mode", label: "Mode", default: 0, min: 0, max: 2, step: 1 }),
	],
	renderer: renderer("mirror", {
		u_mode: (p) => Number(p.mode ?? 0),
	}),
};

export const kaleidoscopeEffectDefinition: EffectDefinition = {
	type: "kaleidoscope",
	name: "Kaleidoscope",
	keywords: ["kaleidoscope", "mirror", "radial", "pattern"],
	params: [
		numberParam({ key: "segments", label: "Segments", default: 6, min: 2, max: 12 }),
	],
	renderer: renderer("kaleidoscope", {
		u_segments: (p) => Number(p.segments ?? 6),
	}),
};

export const halftoneEffectDefinition: EffectDefinition = {
	type: "halftone",
	name: "Halftone",
	keywords: ["halftone", "dots", "comic", "print", "news"],
	params: [
		numberParam({ key: "dotSize", label: "Dot Size", default: 8, min: 2, max: 40 }),
		numberParam({ key: "intensity", label: "Intensity", default: 80 }),
	],
	renderer: renderer("halftone", {
		u_dot_size: (p) => Number(p.dotSize ?? 8),
		u_intensity: (p) => Number(p.intensity ?? 80),
	}),
};

export const posterizeEffectDefinition: EffectDefinition = {
	type: "posterize",
	name: "Posterize",
	keywords: ["posterize", "quantize", "flat", "levels"],
	params: [
		numberParam({ key: "levels", label: "Levels", default: 6, min: 2, max: 32 }),
	],
	renderer: renderer("posterize", {
		u_levels: (p) => Number(p.levels ?? 6),
	}),
};

export const sketchEffectDefinition: EffectDefinition = {
	type: "sketch",
	name: "Sketch",
	keywords: ["sketch", "pencil", "drawing", "edge", "art"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 80 })],
	renderer: renderer("sketch", {
		u_intensity: (p) => Number(p.intensity ?? 80),
	}),
};

export const comicEffectDefinition: EffectDefinition = {
	type: "comic",
	name: "Comic",
	keywords: ["comic", "cartoon", "manga", "cel", "flat"],
	params: [
		numberParam({ key: "levels", label: "Levels", default: 5, min: 2, max: 16 }),
		numberParam({ key: "edge", label: "Outline", default: 70 }),
	],
	renderer: renderer("comic", {
		u_levels: (p) => Number(p.levels ?? 5),
		u_edge: (p) => Number(p.edge ?? 70),
	}),
};

export const duotoneEffectDefinition: EffectDefinition = {
	type: "duotone",
	name: "Duotone",
	keywords: ["duotone", "two", "tone", "gradient map"],
	params: [
		{
			key: "darkColor",
			label: "Dark Color",
			type: "color" as const,
			default: "#1e1b4b",
			keyframable: false,
		},
		{
			key: "lightColor",
			label: "Light Color",
			type: "color" as const,
			default: "#fbcfe8",
			keyframable: false,
		},
	],
	renderer: renderer("duotone", {
		u_dark: (p) => hexToRgb01({ hex: String(p.darkColor ?? "#1e1b4b") }),
		u_light: (p) => hexToRgb01({ hex: String(p.lightColor ?? "#fbcfe8") }),
	}),
};

export const thermalEffectDefinition: EffectDefinition = {
	type: "thermal",
	name: "Thermal",
	keywords: ["thermal", "heat", "infrared", "false color", "predator"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 85 })],
	renderer: renderer("thermal", {
		u_intensity: (p) => Number(p.intensity ?? 85),
	}),
};

export const invertEffectDefinition: EffectDefinition = {
	type: "invert",
	name: "Invert",
	keywords: ["invert", "negative", "reverse colors"],
	params: [numberParam({ key: "amount", label: "Amount", default: 100 })],
	renderer: renderer("invert", {
		u_amount: (p) => Number(p.amount ?? 100),
	}),
};

export const neonEdgeEffectDefinition: EffectDefinition = {
	type: "neon-edge",
	name: "Neon Edges",
	keywords: ["neon", "edge", "outline", "glow", "wireframe"],
	params: [
		{
			key: "color",
			label: "Glow Color",
			type: "color" as const,
			default: "#22d3ee",
			keyframable: false,
		},
		numberParam({ key: "intensity", label: "Intensity", default: 70 }),
	],
	renderer: renderer("neon-edge", {
		u_color: (p) => hexToRgb01({ hex: String(p.color ?? "#22d3ee") }),
		u_intensity: (p) => Number(p.intensity ?? 70),
	}),
};

export const screenShakeEffectDefinition: EffectDefinition = {
	type: "screen-shake",
	name: "Screen Shake",
	keywords: ["shake", "earthquake", "impact", "jitter", "dynamic"],
	params: [
		numberParam({ key: "intensity", label: "Intensity", default: 50 }),
		numberParam({ key: "speed", label: "Speed", default: 15, min: 1, max: 40 }),
	],
	renderer: renderer("screen-shake", {
		u_intensity: (p) => Number(p.intensity ?? 50),
		u_speed: (p) => Number(p.speed ?? 15),
		u_time: (_p, time = 0) => time,
	}),
};

export const pulseEffectDefinition: EffectDefinition = {
	type: "pulse",
	name: "Pulse",
	keywords: ["pulse", "beat", "heartbeat", "breathe", "throb"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 40 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 1,
			min: 0.2,
			max: 8,
			step: 0.1,
		}),
	],
	renderer: renderer("pulse", {
		u_amount: (p) => Number(p.amount ?? 40),
		u_speed: (p) => Number(p.speed ?? 1),
		u_time: (_p, time = 0) => time,
	}),
};

export const loopZoomEffectDefinition: EffectDefinition = {
	type: "loop-zoom",
	name: "Loop Zoom",
	keywords: ["loop", "zoom", "ramp", "repeat", "breathing"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 50 }),
		numberParam({
			key: "period",
			label: "Period",
			default: 1.5,
			min: 0.2,
			max: 8,
			step: 0.1,
		}),
	],
	renderer: renderer("loop-zoom", {
		u_amount: (p) => Number(p.amount ?? 50),
		u_period: (p) => Number(p.period ?? 1.5),
		u_time: (_p, time = 0) => time,
	}),
};

export const lightLeakEffectDefinition: EffectDefinition = {
	type: "light-leak",
	name: "Light Leak",
	keywords: ["light", "leak", "flare", "film", "warm", "sun"],
	params: [
		numberParam({ key: "intensity", label: "Intensity", default: 60 }),
		numberParam({ key: "hue", label: "Tone", default: 30, min: 0, max: 360 }),
	],
	renderer: renderer("light-leak", {
		u_intensity: (p) => Number(p.intensity ?? 60),
		u_hue: (p) => Number(p.hue ?? 30),
		u_time: (_p, time = 0) => time,
	}),
};

export const snowEffectDefinition: EffectDefinition = {
	type: "snow",
	name: "Snowfall",
	keywords: ["snow", "winter", "particles", "fall", "christmas"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 0.6,
			min: 0.1,
			max: 3,
			step: 0.1,
		}),
		numberParam({
			key: "size",
			label: "Flake Size",
			default: 3,
			min: 1,
			max: 10,
			step: 0.5,
		}),
	],
	renderer: renderer("snow", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_speed: (p) => Number(p.speed ?? 0.6),
		u_size: (p) => Number(p.size ?? 3),
		u_time: (_p, time = 0) => time,
	}),
};

export const oldTvEffectDefinition: EffectDefinition = {
	type: "old-tv",
	name: "Old TV",
	keywords: ["old", "tv", "crt", "retro", "vintage", "static", "analog"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 60 })],
	renderer: renderer("old-tv", {
		u_intensity: (p) => Number(p.intensity ?? 60),
		u_time: (_p, time = 0) => time,
	}),
};

export const scanlinesEffectDefinition: EffectDefinition = {
	type: "scanlines",
	name: "Scanlines",
	keywords: ["scanlines", "crt", "lines", "retro", "monitor"],
	params: [
		numberParam({ key: "intensity", label: "Intensity", default: 50 }),
		numberParam({ key: "spacing", label: "Spacing", default: 4, min: 2, max: 20 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 0.5,
			min: 0,
			max: 5,
			step: 0.1,
		}),
	],
	renderer: renderer("scanlines", {
		u_intensity: (p) => Number(p.intensity ?? 50),
		u_spacing: (p) => Number(p.spacing ?? 4),
		u_speed: (p) => Number(p.speed ?? 0.5),
		u_time: (_p, time = 0) => time,
	}),
};

export const holographicEffectDefinition: EffectDefinition = {
	type: "holographic",
	name: "Hologram",
	keywords: ["hologram", "holographic", "sci-fi", "futuristic", "glitch"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 60 })],
	renderer: renderer("holographic", {
		u_intensity: (p) => Number(p.intensity ?? 60),
		u_time: (_p, time = 0) => time,
	}),
};

export const nightVisionEffectDefinition: EffectDefinition = {
	type: "night-vision",
	name: "Night Vision",
	keywords: ["night", "vision", "green", "scope", "military"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 80 })],
	renderer: renderer("night-vision", {
		u_intensity: (p) => Number(p.intensity ?? 80),
		u_time: (_p, time = 0) => time,
	}),
};

export const glassEffectDefinition: EffectDefinition = {
	type: "glass",
	name: "Frosted Glass",
	keywords: ["glass", "frosted", "blur", "texture", "privacy"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 50 }),
		numberParam({ key: "size", label: "Cell Size", default: 16, min: 4, max: 64 }),
	],
	renderer: renderer("glass", {
		u_amount: (p) => Number(p.amount ?? 50),
		u_size: (p) => Number(p.size ?? 16),
	}),
};

export const crossHatchEffectDefinition: EffectDefinition = {
	type: "cross-hatch",
	name: "Cross-hatch",
	keywords: ["cross", "hatch", "lines", "engraving", "pen"],
	params: [
		numberParam({ key: "spacing", label: "Spacing", default: 10, min: 4, max: 40 }),
		numberParam({ key: "intensity", label: "Intensity", default: 80 }),
	],
	renderer: renderer("cross-hatch", {
		u_spacing: (p) => Number(p.spacing ?? 10),
		u_intensity: (p) => Number(p.intensity ?? 80),
	}),
};

export const blueprintEffectDefinition: EffectDefinition = {
	type: "blueprint",
	name: "Blueprint",
	keywords: ["blueprint", "blue", "construction", "lines", "technical"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 90 })],
	renderer: renderer("blueprint", {
		u_intensity: (p) => Number(p.intensity ?? 90),
	}),
};

export const prismEffectDefinition: EffectDefinition = {
	type: "prism",
	name: "Prism",
	keywords: ["prism", "rainbow", "spectrum", "color"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 50 })],
	renderer: renderer("prism", {
		u_intensity: (p) => Number(p.intensity ?? 50),
	}),
};

export const vhsEffectDefinition: EffectDefinition = {
	type: "vhs",
	name: "VHS",
	keywords: ["vhs", "tape", "retro", "80s", "tracking"],
	params: [numberParam({ key: "intensity", label: "Intensity", default: 60 })],
	renderer: renderer("vhs", {
		u_intensity: (p) => Number(p.intensity ?? 60),
		u_time: (_p, time = 0) => time,
	}),
};

export const blurEdgeEffectDefinition: EffectDefinition = {
	type: "blur-edge",
	name: "Blur Edges",
	keywords: ["blur", "edges", "vignette", "soft", "focus"],
	params: [numberParam({ key: "amount", label: "Amount", default: 60 })],
	renderer: renderer("blur-edge", {
		u_amount: (p) => Number(p.amount ?? 60),
	}),
};

export const watercolorEffectDefinition: EffectDefinition = {
	type: "watercolor",
	name: "Watercolor",
	keywords: ["watercolor", "paint", "art", "soft", "painting"],
	params: [numberParam({ key: "amount", label: "Amount", default: 60 })],
	renderer: renderer("watercolor", {
		u_amount: (p) => Number(p.amount ?? 60),
	}),
};

export const bokehEffectDefinition: EffectDefinition = {
	type: "bokeh",
	name: "Bokeh",
	keywords: ["bokeh", "lights", "discs", "drift", "dreamy"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 1,
			min: 0.1,
			max: 4,
			step: 0.1,
		}),
	],
	renderer: renderer("bokeh", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_speed: (p) => Number(p.speed ?? 1),
		u_time: (_p, time = 0) => time,
	}),
};

export const glitterEffectDefinition: EffectDefinition = {
	type: "glitter",
	name: "Glitter",
	keywords: ["glitter", "sparkle", "stars", "twinkle", "shine"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 50 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 1,
			min: 0.1,
			max: 5,
			step: 0.1,
		}),
	],
	renderer: renderer("glitter", {
		u_amount: (p) => Number(p.amount ?? 50),
		u_speed: (p) => Number(p.speed ?? 1),
		u_time: (_p, time = 0) => time,
	}),
};

export const rainEffectDefinition: EffectDefinition = {
	type: "rain",
	name: "Rainfall",
	keywords: ["rain", "storm", "weather", "streaks", "fall"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({
			key: "speed",
			label: "Speed",
			default: 1,
			min: 0.2,
			max: 4,
			step: 0.1,
		}),
		numberParam({ key: "angle", label: "Angle", default: 12, min: -45, max: 45 }),
	],
	renderer: renderer("rain", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_speed: (p) => Number(p.speed ?? 1),
		u_angle: (p) => Number(p.angle ?? 12),
		u_time: (_p, time = 0) => time,
	}),
};


export const spotlightEffectDefinition: EffectDefinition = {
	type: "spotlight",
	name: "Spotlight",
	keywords: ["spotlight", "light", "dark", "focus", "stage"],
	params: [
		numberParam({ key: "centerX", label: "Center X", default: 50 }),
		numberParam({ key: "centerY", label: "Center Y", default: 45 }),
		numberParam({ key: "radius", label: "Radius", default: 35, min: 5, max: 100, step: 1 }),
		numberParam({ key: "softness", label: "Softness", default: 50, min: 2, max: 100, step: 1 }),
		numberParam({ key: "darkness", label: "Darkness", default: 80, min: 0, max: 100, step: 1 }),
		numberParam({ key: "follow", label: "Follow", default: 0, min: 0, max: 1, step: 1 }),
	],
	renderer: renderer("spotlight", {
		u_center_x: (p) => Number(p.centerX ?? 50) / 100,
		u_center_y: (p) => Number(p.centerY ?? 45) / 100,
		u_radius: (p) => Number(p.radius ?? 35) / 100,
		u_softness: (p) => Number(p.softness ?? 50) / 100,
		u_darkness: (p) => Number(p.darkness ?? 80),
		u_time: (_p, time = 0) => time,
		u_follow: (p) => Number(p.follow ?? 0),
	}),
};

export const confettiEffectDefinition: EffectDefinition = {
	type: "confetti",
	name: "Confetti",
	keywords: ["confetti", "party", "celebration", "particles", "colorful"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({ key: "speed", label: "Speed", default: 0.8, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 0.5, max: 4, step: 0.1 }),
	],
	renderer: renderer("confetti", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_speed: (p) => Number(p.speed ?? 0.8),
		u_time: (_p, time = 0) => time,
		u_size: (p) => Number(p.size ?? 2),
	}),
};

export const bubblesEffectDefinition: EffectDefinition = {
	type: "bubbles",
	name: "Bubbles",
	keywords: ["bubbles", "underwater", "soap", "particles", "aquarium"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "speed", label: "Speed", default: 0.5, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 0.5, max: 4, step: 0.1 }),
	],
	renderer: renderer("bubbles", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_speed: (p) => Number(p.speed ?? 0.5),
		u_time: (_p, time = 0) => time,
		u_size: (p) => Number(p.size ?? 2),
	}),
};

export const firefliesEffectDefinition: EffectDefinition = {
	type: "fireflies",
	name: "Fireflies",
	keywords: ["fireflies", "glow", "night", "particles", "magic"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "speed", label: "Speed", default: 0.6, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "glow", label: "Glow", default: 60, min: 0, max: 100, step: 1 }),
	],
	renderer: renderer("fireflies", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_speed: (p) => Number(p.speed ?? 0.6),
		u_time: (_p, time = 0) => time,
		u_glow: (p) => Number(p.glow ?? 60) / 100,
	}),
};

export const wobbleEffectDefinition: EffectDefinition = {
	type: "wobble",
	name: "Wobble",
	keywords: ["wobble", "jelly", "wave", "distort", "shake", "fun"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 40 }),
		numberParam({ key: "frequency", label: "Frequency", default: 2, min: 0.5, max: 8, step: 0.1 }),
		numberParam({ key: "speed", label: "Speed", default: 1.5, min: 0.1, max: 5, step: 0.1 }),
	],
	renderer: renderer("wobble", {
		u_amount: (p) => Number(p.amount ?? 40),
		u_frequency: (p) => Number(p.frequency ?? 2),
		u_speed: (p) => Number(p.speed ?? 1.5),
		u_time: (_p, time = 0) => time,
	}),
};

export const tiltShiftEffectDefinition: EffectDefinition = {
	type: "tilt-shift",
	name: "Tilt Shift",
	keywords: ["tilt", "shift", "blur", "miniature", "focus", "cinematic"],
	params: [
		numberParam({ key: "center", label: "Center", default: 50 }),
		numberParam({ key: "band", label: "Band", default: 30, min: 5, max: 90, step: 1 }),
		numberParam({ key: "blur", label: "Blur", default: 60, min: 0, max: 100, step: 1 }),
	],
	renderer: renderer("tilt-shift", {
		u_center: (p) => Number(p.center ?? 50) / 100,
		u_band: (p) => Number(p.band ?? 30) / 100,
		u_blur: (p) => Number(p.blur ?? 60),
	}),
};

export const heartsEffectDefinition: EffectDefinition = {
	type: "hearts",
	name: "Floating Hearts",
	keywords: ["hearts", "love", "float", "romance", "valentine", "particles"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "speed", label: "Speed", default: 0.5, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 0.5, max: 4, step: 0.1 }),
	],
	renderer: renderer("hearts", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_speed: (p) => Number(p.speed ?? 0.5),
		u_time: (_p, time = 0) => time,
		u_size: (p) => Number(p.size ?? 2),
	}),
};

export const letterboxEffectDefinition: EffectDefinition = {
	type: "letterbox",
	name: "Cinematic Bars",
	keywords: ["letterbox", "cinematic", "bars", "film", "widescreen"],
	params: [
		numberParam({ key: "bar", label: "Bar Size", default: 12, min: 0, max: 40, step: 0.5 }),
		numberParam({ key: "feather", label: "Feather", default: 1, min: 0.1, max: 20, step: 0.1 }),
	],
	renderer: renderer("letterbox", {
		u_bar: (p) => Number(p.bar ?? 12) / 100,
		u_feather: (p) => Number(p.feather ?? 1) / 100,
	}),
};


export const beautyEffectDefinition: EffectDefinition = {
	type: "beauty",
	name: "Beauty",
	keywords: ["beauty", "skin", "smooth", "portrait", "retouch"],
	params: [
		numberParam({ key: "smoothing", label: "Smoothing", default: 60 }),
		numberParam({ key: "brightness", label: "Brightness", default: 25, max: 50 }),
		numberParam({ key: "warmth", label: "Warmth", default: 40 }),
	],
	renderer: renderer("beauty", {
		u_smoothing: (p) => Number(p.smoothing ?? 60),
		u_brightness: (p) => Number(p.brightness ?? 25),
		u_warmth: (p) => Number(p.warmth ?? 40),
	}),
};

export const sharpenEffectDefinition: EffectDefinition = {
	type: "sharpen",
	name: "Sharpen",
	keywords: ["sharpen", "detail", "clarity", "crisp"],
	params: [numberParam({ key: "amount", label: "Amount", default: 45 })],
	renderer: renderer("sharpen", {
		u_amount: (p) => Number(p.amount ?? 45),
	}),
};

export const lowlightEffectDefinition: EffectDefinition = {
	type: "lowlight",
	name: "Low-light Boost",
	keywords: ["lowlight", "night", "dark", "brighten", "enhance"],
	params: [
		numberParam({ key: "lift", label: "Lift", default: 55 }),
		numberParam({ key: "warmth", label: "Warmth", default: 30 }),
		numberParam({ key: "denoise", label: "Denoise", default: 40 }),
	],
	renderer: renderer("lowlight", {
		u_lift: (p) => Number(p.lift ?? 55),
		u_warmth: (p) => Number(p.warmth ?? 30),
		u_denoise: (p) => Number(p.denoise ?? 40),
	}),
};

export const fogEffectDefinition: EffectDefinition = {
	type: "fog",
	name: "Fog",
	keywords: ["fog", "mist", "haze", "atmosphere", "smoke"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "speed", label: "Speed", default: 0.4, min: 0.1, max: 2, step: 0.1 }),
		numberParam({ key: "scale", label: "Scale", default: 2, min: 1, max: 6, step: 0.5 }),
	],
	renderer: renderer("fog", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_speed: (p) => Number(p.speed ?? 0.4),
		u_time: (_p, time = 0) => time,
		u_scale: (p) => Number(p.scale ?? 2),
	}),
};

export const lightningEffectDefinition: EffectDefinition = {
	type: "lightning",
	name: "Lightning",
	keywords: ["lightning", "storm", "flash", "thunder", "weather"],
	params: [
		numberParam({ key: "frequency", label: "Frequency", default: 40 }),
		numberParam({ key: "intensity", label: "Intensity", default: 70 }),
		numberParam({ key: "seed", label: "Seed", default: 1, min: 1, max: 10, step: 1 }),
	],
	renderer: renderer("lightning", {
		u_frequency: (p) => Number(p.frequency ?? 40),
		u_intensity: (p) => Number(p.intensity ?? 70),
		u_time: (_p, time = 0) => time,
		u_seed: (p) => Number(p.seed ?? 1),
	}),
};

export const starsEffectDefinition: EffectDefinition = {
	type: "stars",
	name: "Twinkle Stars",
	keywords: ["stars", "twinkle", "night", "sky", "sparkle"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 50 }),
		numberParam({ key: "speed", label: "Speed", default: 1.2, min: 0.1, max: 4, step: 0.1 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 0.5, max: 4, step: 0.1 }),
	],
	renderer: renderer("stars", {
		u_amount: (p) => Number(p.amount ?? 50),
		u_speed: (p) => Number(p.speed ?? 1.2),
		u_time: (_p, time = 0) => time,
		u_size: (p) => Number(p.size ?? 2),
	}),
};


export const ghostEffectDefinition: EffectDefinition = {
	type: "ghost",
	name: "Ghost Echo",
	keywords: ["ghost", "echo", "trail", "afterimage", "double"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({ key: "distance", label: "Distance", default: 40 }),
		numberParam({ key: "decay", label: "Decay", default: 55, min: 10 }),
	],
	renderer: renderer("ghost", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_dist: (p) => Number(p.distance ?? 40),
		u_decay: (p) => Number(p.decay ?? 55),
	}),
};

export const bloomEffectDefinition: EffectDefinition = {
	type: "bloom",
	name: "Dreamy Bloom",
	keywords: ["bloom", "dreamy", "glow", "soft", "highlights"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 65 }),
		numberParam({ key: "threshold", label: "Threshold", default: 55 }),
		numberParam({ key: "radius", label: "Radius", default: 40 }),
	],
	renderer: renderer("bloom", {
		u_amount: (p) => Number(p.amount ?? 65),
		u_threshold: (p) => Number(p.threshold ?? 55),
		u_radius: (p) => Number(p.radius ?? 40),
	}),
};

export const moonlightEffectDefinition: EffectDefinition = {
	type: "moonlight",
	name: "Moonlight",
	keywords: ["moonlight", "night", "cool", "blue", "day for night"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "strength", label: "Strength", default: 70 }),
	],
	renderer: renderer("moonlight", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_strength: (p) => Number(p.strength ?? 70),
	}),
};

export const liquidEffectDefinition: EffectDefinition = {
	type: "liquid",
	name: "Liquid Flow",
	keywords: ["liquid", "flow", "lava", "turbulent", "distort", "melt"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 45 }),
		numberParam({ key: "speed", label: "Speed", default: 0.6, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "scale", label: "Scale", default: 2, min: 0.5, max: 6, step: 0.5 }),
	],
	renderer: renderer("liquid", {
		u_amount: (p) => Number(p.amount ?? 45),
		u_speed: (p) => Number(p.speed ?? 0.6),
		u_scale: (p) => Number(p.scale ?? 2),
		u_time: (_p, time = 0) => time,
	}),
};

export const magnifierEffectDefinition: EffectDefinition = {
	type: "magnifier",
	name: "Magnifier",
	keywords: ["magnifier", "lens", "zoom", "magnify", "inspect"],
	params: [
		numberParam({ key: "centerX", label: "Center X", default: 50 }),
		numberParam({ key: "centerY", label: "Center Y", default: 50 }),
		numberParam({ key: "radius", label: "Radius", default: 25, min: 5, max: 45, step: 1 }),
		numberParam({ key: "zoom", label: "Zoom", default: 2, min: 1.2, max: 4, step: 0.1 }),
	],
	renderer: renderer("magnifier", {
		u_center_x: (p) => Number(p.centerX ?? 50) / 100,
		u_center_y: (p) => Number(p.centerY ?? 50) / 100,
		u_radius: (p) => Number(p.radius ?? 25) / 100,
		u_zoom: (p) => Number(p.zoom ?? 2),
	}),
};

export const strobeEffectDefinition: EffectDefinition = {
	type: "strobe",
	name: "Strobe",
	keywords: ["strobe", "flash", "blink", "invert", "club"],
	params: [
		numberParam({ key: "speed", label: "Speed", default: 40 }),
		numberParam({ key: "invert", label: "Invert", default: 0, min: 0, max: 1, step: 1 }),
		numberParam({ key: "intensity", label: "Intensity", default: 70 }),
	],
	renderer: renderer("strobe", {
		u_speed: (p) => Number(p.speed ?? 40),
		u_invert: (p) => Number(p.invert ?? 0),
		u_intensity: (p) => Number(p.intensity ?? 70),
		u_time: (_p, time = 0) => time,
	}),
};

export const cinematicEffectDefinition: EffectDefinition = {
	type: "cinematic",
	name: "Cinematic",
	keywords: ["cinematic", "teal", "orange", "film", "grade", "movie"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "contrast", label: "Contrast", default: 40 }),
		numberParam({ key: "warmth", label: "Warmth", default: 60 }),
	],
	renderer: renderer("cinematic", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_contrast: (p) => Number(p.contrast ?? 40),
		u_warmth: (p) => Number(p.warmth ?? 60),
	}),
};

export const cyberpunkEffectDefinition: EffectDefinition = {
	type: "cyberpunk",
	name: "Cyberpunk",
	keywords: ["cyberpunk", "neon", "purple", "cyan", "sci-fi", "glow"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "glow", label: "Glow", default: 60 }),
	],
	renderer: renderer("cyberpunk", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_glow: (p) => Number(p.glow ?? 60),
		u_time: (_p, time = 0) => time,
	}),
};


export const oilEffectDefinition: EffectDefinition = {
	type: "oil",
	name: "Oil Paint",
	keywords: ["oil", "paint", "kuwahara", "brush", "artistic"],
	params: [
		numberParam({ key: "radius", label: "Brush", default: 2.5, min: 1, max: 6, step: 0.5 }),
		numberParam({ key: "mix", label: "Mix", default: 80 }),
	],
	renderer: renderer("oil", {
		u_radius: (p) => Number(p.radius ?? 2.5),
		u_mix: (p) => Number(p.mix ?? 80),
	}),
};

export const inkEffectDefinition: EffectDefinition = {
	type: "ink",
	name: "Ink Wash",
	keywords: ["ink", "wash", "chinese", "calligraphy", "paper", "monochrome"],
	params: [
		numberParam({ key: "strength", label: "Strength", default: 85 }),
		numberParam({ key: "threshold", label: "Threshold", default: 45 }),
		numberParam({ key: "softness", label: "Softness", default: 40 }),
	],
	renderer: renderer("ink", {
		u_strength: (p) => Number(p.strength ?? 85),
		u_threshold: (p) => Number(p.threshold ?? 45),
		u_softness: (p) => Number(p.softness ?? 40),
	}),
};

export const auroraEffectDefinition: EffectDefinition = {
	type: "aurora",
	name: "Aurora",
	keywords: ["aurora", "northern lights", "curtain", "sky", "night"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 65 }),
		numberParam({ key: "speed", label: "Speed", default: 0.5, min: 0.1, max: 2, step: 0.1 }),
		numberParam({ key: "hue", label: "Hue", default: 30 }),
	],
	renderer: renderer("aurora", {
		u_amount: (p) => Number(p.amount ?? 65),
		u_speed: (p) => Number(p.speed ?? 0.5),
		u_time: (_p, time = 0) => time,
		u_hue: (p) => Number(p.hue ?? 30) / 100,
	}),
};

export const sunsetEffectDefinition: EffectDefinition = {
	type: "sunset",
	name: "Sunset Glow",
	keywords: ["sunset", "golden hour", "warm", "glow", "dusk"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({ key: "warmth", label: "Warmth", default: 55 }),
		numberParam({ key: "breathing", label: "Breathing", default: 1, min: 0, max: 1, step: 1 }),
	],
	renderer: renderer("sunset", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_warmth: (p) => Number(p.warmth ?? 55),
		u_time: (_p, time = 0) => time,
		u_breathing: (p) => Number(p.breathing ?? 1),
	}),
};

export const dizzyEffectDefinition: EffectDefinition = {
	type: "dizzy",
	name: "Dizzy",
	keywords: ["dizzy", "rotate", "spin", "drunk", "disorient"],
	params: [
		numberParam({ key: "rotation", label: "Rotation", default: 35 }),
		numberParam({ key: "zoom", label: "Zoom Pulse", default: 30 }),
		numberParam({ key: "speed", label: "Speed", default: 1.2, min: 0.2, max: 4, step: 0.1 }),
	],
	renderer: renderer("dizzy", {
		u_rotation: (p) => Number(p.rotation ?? 35),
		u_zoom: (p) => Number(p.zoom ?? 30),
		u_speed: (p) => Number(p.speed ?? 1.2),
		u_time: (_p, time = 0) => time,
	}),
};

export const rainbowEdgeEffectDefinition: EffectDefinition = {
	type: "rainbow-edge",
	name: "Rainbow Edge",
	keywords: ["rainbow", "edge", "neon", "gradient", "colorful"],
	params: [
		numberParam({ key: "strength", label: "Strength", default: 70 }),
		numberParam({ key: "width", label: "Width", default: 30 }),
		numberParam({ key: "shift", label: "Hue Shift", default: 0 }),
	],
	renderer: renderer("rainbow-edge", {
		u_strength: (p) => Number(p.strength ?? 70),
		u_width: (p) => Number(p.width ?? 30),
		u_time: (_p, time = 0) => time,
		u_shift: (p) => Number(p.shift ?? 0) / 100,
	}),
};

export const filmFadeEffectDefinition: EffectDefinition = {
	type: "film-fade",
	name: "Faded Film",
	keywords: ["faded", "film", "vintage", "retro", "grain", "pastel"],
	params: [
		numberParam({ key: "fade", label: "Fade", default: 60 }),
		numberParam({ key: "grain", label: "Grain", default: 40 }),
		numberParam({ key: "warmth", label: "Warmth", default: 50 }),
	],
	renderer: renderer("film-fade", {
		u_fade: (p) => Number(p.fade ?? 60),
		u_grain: (p) => Number(p.grain ?? 40),
		u_warmth: (p) => Number(p.warmth ?? 50),
		u_time: (_p, time = 0) => time,
	}),
};


export const crossProcessEffectDefinition: EffectDefinition = {
	type: "cross-process",
	name: "Cross Process",
	keywords: ["cross process", "cyan", "shadow", "xpro", "film"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "contrast", label: "Contrast", default: 45 }),
	],
	renderer: renderer("cross-process", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_contrast: (p) => Number(p.contrast ?? 45),
	}),
};

export const bleachBypassEffectDefinition: EffectDefinition = {
	type: "bleach-bypass",
	name: "Bleach Bypass",
	keywords: ["bleach", "bypass", "silver", "desaturated", "gritty"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 75 }),
		numberParam({ key: "contrast", label: "Contrast", default: 50 }),
	],
	renderer: renderer("bleach-bypass", {
		u_amount: (p) => Number(p.amount ?? 75),
		u_contrast: (p) => Number(p.contrast ?? 50),
	}),
};

export const lomoEffectDefinition: EffectDefinition = {
	type: "lomo",
	name: "Lomo",
	keywords: ["lomo", "vignette", "oversaturated", "toy camera", "retro"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "saturation", label: "Saturation", default: 60 }),
		numberParam({ key: "vignette", label: "Vignette", default: 70 }),
	],
	renderer: renderer("lomo", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_saturation: (p) => Number(p.saturation ?? 60),
		u_vignette: (p) => Number(p.vignette ?? 70),
	}),
};

export const halationEffectDefinition: EffectDefinition = {
	type: "halation",
	name: "Halation",
	keywords: ["halation", "bleed", "red glow", "film", "bright"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 60 }),
		numberParam({ key: "radius", label: "Radius", default: 2.5, min: 1, max: 6, step: 0.5 }),
		numberParam({ key: "threshold", label: "Threshold", default: 55 }),
	],
	renderer: renderer("halation", {
		u_amount: (p) => Number(p.amount ?? 60),
		u_radius: (p) => Number(p.radius ?? 2.5),
		u_threshold: (p) => Number(p.threshold ?? 55),
	}),
};

export const dreamEffectDefinition: EffectDefinition = {
	type: "dream",
	name: "Dream",
	keywords: ["dream", "soft", "hue", "breathe", "romantic"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 65 }),
		numberParam({ key: "drift", label: "Hue Drift", default: 1, min: 0, max: 4, step: 0.1 }),
		numberParam({ key: "pulse", label: "Pulse", default: 40 }),
	],
	renderer: renderer("dream", {
		u_amount: (p) => Number(p.amount ?? 65),
		u_drift: (p) => Number(p.drift ?? 1),
		u_pulse: (p) => Number(p.pulse ?? 40),
		u_time: (_p, time = 0) => time,
	}),
};

export const rainWindowEffectDefinition: EffectDefinition = {
	type: "rain-window",
	name: "Rain Window",
	keywords: ["rain", "window", "glass", "drops", "moody", "refract"],
	params: [
		numberParam({ key: "drops", label: "Drops", default: 60 }),
		numberParam({ key: "scale", label: "Scale", default: 6, min: 4, max: 12, step: 1 }),
		numberParam({ key: "blur", label: "Blur", default: 40 }),
	],
	renderer: renderer("rain-window", {
		u_drops: (p) => Number(p.drops ?? 60),
		u_time: (_p, time = 0) => time,
		u_scale: (p) => Number(p.scale ?? 6),
		u_blur: (p) => Number(p.blur ?? 40),
	}),
};

export const mirrorGridEffectDefinition: EffectDefinition = {
	type: "mirror-grid",
	name: "Mirror Grid",
	keywords: ["mirror", "grid", "kaleidoscope", "symmetry", "tile"],
	params: [
		numberParam({ key: "mode", label: "Mode", default: 0, min: 0, max: 1, step: 1 }),
		numberParam({ key: "amount", label: "Amount", default: 100 }),
	],
	renderer: renderer("mirror-grid", {
		u_mode: (p) => Number(p.mode ?? 0),
		u_amount: (p) => Number(p.amount ?? 100),
	}),
};

export const tealOrangeEffectDefinition: EffectDefinition = {
	type: "teal-orange",
	name: "Teal & Orange",
	keywords: ["teal", "orange", "blockbuster", "color grading", "cinema"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 75 }),
		numberParam({ key: "balance", label: "Balance", default: 45 }),
		numberParam({ key: "contrast", label: "Contrast", default: 30 }),
	],
	renderer: renderer("teal-orange", {
		u_amount: (p) => Number(p.amount ?? 75),
		u_balance: (p) => Number(p.balance ?? 45),
		u_contrast: (p) => Number(p.contrast ?? 30),
	}),
};


export const speedLinesEffectDefinition: EffectDefinition = {
	type: "speed-lines",
	name: "Speed Lines",
	keywords: ["speed", "lines", "anime", "manga", "radial", "comic"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "lines", label: "Lines", default: 60, min: 20, max: 120, step: 2 }),
		numberParam({ key: "speed", label: "Speed", default: 1.5, min: 0.1, max: 4, step: 0.1 }),
		numberParam({ key: "width", label: "Width", default: 45 }),
	],
	renderer: renderer("speed-lines", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_lines: (p) => Number(p.lines ?? 60),
		u_speed: (p) => Number(p.speed ?? 1.5),
		u_width: (p) => Number(p.width ?? 45),
	}),
};

export const matrixRainEffectDefinition: EffectDefinition = {
	type: "matrix-rain",
	name: "Matrix Rain",
	keywords: ["matrix", "code", "hacker", "digital", "green"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 70 }),
		numberParam({ key: "speed", label: "Speed", default: 1, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "density", label: "Density", default: 60 }),
		numberParam({ key: "glow", label: "Glow", default: 70 }),
	],
	renderer: renderer("matrix-rain", {
		u_amount: (p) => Number(p.amount ?? 70),
		u_speed: (p) => Number(p.speed ?? 1),
		u_density: (p) => Number(p.density ?? 60),
		u_glow: (p) => Number(p.glow ?? 70) / 100,
	}),
};

export const hexagonPixelEffectDefinition: EffectDefinition = {
	type: "hexagon-pixel",
	name: "Hexagon Pixel",
	keywords: ["hexagon", "pixel", "mosaic", "honeycomb", "blur"],
	params: [
		numberParam({ key: "size", label: "Cell Size", default: 16, min: 6, max: 80, step: 2 }),
		numberParam({ key: "mix", label: "Mix", default: 100 }),
	],
	renderer: renderer("hexagon-pixel", {
		u_size: (p) => Number(p.size ?? 16),
		u_mix: (p) => Number(p.mix ?? 100),
	}),
};

export const xrayEffectDefinition: EffectDefinition = {
	type: "xray",
	name: "X-Ray",
	keywords: ["xray", "x-ray", "invert", "blue", "medical", "scan"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 90 }),
		numberParam({ key: "tint", label: "Tint", default: 70 }),
		numberParam({ key: "contrast", label: "Contrast", default: 40 }),
	],
	renderer: renderer("xray", {
		u_amount: (p) => Number(p.amount ?? 90),
		u_tint: (p) => Number(p.tint ?? 70),
		u_contrast: (p) => Number(p.contrast ?? 40),
	}),
};

export const meteorEffectDefinition: EffectDefinition = {
	type: "meteor",
	name: "Meteor",
	keywords: ["meteor", "shooting star", "comet", "streak", "night"],
	params: [
		numberParam({ key: "frequency", label: "Frequency", default: 35 }),
		numberParam({ key: "intensity", label: "Intensity", default: 80 }),
		numberParam({ key: "trail", label: "Trail", default: 40 }),
	],
	renderer: renderer("meteor", {
		u_frequency: (p) => Number(p.frequency ?? 35),
		u_intensity: (p) => Number(p.intensity ?? 80),
		u_time: (_p, time = 0) => time,
		u_trail: (p) => Number(p.trail ?? 40),
	}),
};

export const petalsEffectDefinition: EffectDefinition = {
	type: "petals",
	name: "Falling Petals",
	keywords: ["petals", "flower", "sakura", "fall", "romance", "spring"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 55 }),
		numberParam({ key: "speed", label: "Speed", default: 0.5, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "size", label: "Size", default: 2, min: 0.5, max: 4, step: 0.1 }),
	],
	renderer: renderer("petals", {
		u_amount: (p) => Number(p.amount ?? 55),
		u_speed: (p) => Number(p.speed ?? 0.5),
		u_time: (_p, time = 0) => time,
		u_size: (p) => Number(p.size ?? 2),
	}),
};

export const vhsTrackingEffectDefinition: EffectDefinition = {
	type: "vhs-tracking",
	name: "VHS Tracking",
	keywords: ["vhs", "tracking", "tape", "band", "jitter", "glitch"],
	params: [
		numberParam({ key: "amount", label: "Amount", default: 80 }),
		numberParam({ key: "speed", label: "Speed", default: 0.8, min: 0.1, max: 3, step: 0.1 }),
		numberParam({ key: "height", label: "Band", default: 40 }),
		numberParam({ key: "jitter", label: "Jitter", default: 55 }),
	],
	renderer: renderer("vhs-tracking", {
		u_amount: (p) => Number(p.amount ?? 80),
		u_speed: (p) => Number(p.speed ?? 0.8),
		u_height: (p) => Number(p.height ?? 40),
		u_jitter: (p) => Number(p.jitter ?? 55),
	}),
};

export const neonFrameEffectDefinition: EffectDefinition = {
	type: "neon-frame",
	name: "Neon Frame",
	keywords: ["neon", "frame", "border", "rainbow", "glow", "animated"],
	params: [
		numberParam({ key: "border", label: "Border", default: 30 }),
		numberParam({ key: "glow", label: "Glow", default: 60 }),
		numberParam({ key: "hueSpeed", label: "Hue Speed", default: 1, min: 0, max: 4, step: 0.1 }),
	],
	renderer: renderer("neon-frame", {
		u_border: (p) => Number(p.border ?? 30),
		u_glow: (p) => Number(p.glow ?? 60),
		u_hue_speed: (p) => Number(p.hueSpeed ?? 1),
		u_time: (_p, time = 0) => time,
	}),
};

export const CATALOG_EFFECT_DEFINITIONS: EffectDefinition[] = [
	fisheyeEffectDefinition,
	swirlEffectDefinition,
	waveEffectDefinition,
	motionBlurEffectDefinition,
	mirrorEffectDefinition,
	kaleidoscopeEffectDefinition,
	halftoneEffectDefinition,
	posterizeEffectDefinition,
	sketchEffectDefinition,
	comicEffectDefinition,
	duotoneEffectDefinition,
	thermalEffectDefinition,
	invertEffectDefinition,
	neonEdgeEffectDefinition,
	screenShakeEffectDefinition,
	pulseEffectDefinition,
	loopZoomEffectDefinition,
	lightLeakEffectDefinition,
	snowEffectDefinition,
	oldTvEffectDefinition,
	scanlinesEffectDefinition,
	holographicEffectDefinition,
	nightVisionEffectDefinition,
	glassEffectDefinition,
	crossHatchEffectDefinition,
	blueprintEffectDefinition,
	prismEffectDefinition,
	vhsEffectDefinition,
	blurEdgeEffectDefinition,
	watercolorEffectDefinition,
	bokehEffectDefinition,
	glitterEffectDefinition,
	rainEffectDefinition,
	spotlightEffectDefinition,
	confettiEffectDefinition,
	bubblesEffectDefinition,
	firefliesEffectDefinition,
	wobbleEffectDefinition,
	tiltShiftEffectDefinition,
	heartsEffectDefinition,
	letterboxEffectDefinition,
	beautyEffectDefinition,
	sharpenEffectDefinition,
	lowlightEffectDefinition,
	fogEffectDefinition,
	lightningEffectDefinition,
	starsEffectDefinition,
	ghostEffectDefinition,
	bloomEffectDefinition,
	moonlightEffectDefinition,
	liquidEffectDefinition,
	magnifierEffectDefinition,
	strobeEffectDefinition,
	cinematicEffectDefinition,
	cyberpunkEffectDefinition,
	oilEffectDefinition,
	inkEffectDefinition,
	auroraEffectDefinition,
	sunsetEffectDefinition,
	dizzyEffectDefinition,
	rainbowEdgeEffectDefinition,
	filmFadeEffectDefinition,
	crossProcessEffectDefinition,
	bleachBypassEffectDefinition,
	lomoEffectDefinition,
	halationEffectDefinition,
	dreamEffectDefinition,
	rainWindowEffectDefinition,
	mirrorGridEffectDefinition,
	tealOrangeEffectDefinition,
	speedLinesEffectDefinition,
	matrixRainEffectDefinition,
	hexagonPixelEffectDefinition,
	xrayEffectDefinition,
	meteorEffectDefinition,
	petalsEffectDefinition,
	vhsTrackingEffectDefinition,
	neonFrameEffectDefinition,
];
