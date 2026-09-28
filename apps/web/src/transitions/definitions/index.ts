import { transitionsRegistry } from "../registry";
import type { TransitionDefinition } from "../types";

const fadeDefinition: TransitionDefinition = {
	type: "fade-black",
	name: "Fade to Black",
	keywords: ["fade", "black", "dip"],
	defaultDurationSeconds: 0.5,
	swatch: ["#000000", "#5a5a5a"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-fade",
			uniforms: { u_progress: progress, u_color: [0, 0, 0] },
		},
	],
};

const fadeWhiteDefinition: TransitionDefinition = {
	type: "fade-white",
	name: "Fade to White",
	keywords: ["fade", "white", "dip"],
	defaultDurationSeconds: 0.5,
	swatch: ["#ffffff", "#c9c9c9"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-fade",
			uniforms: { u_progress: progress, u_color: [1, 1, 1] },
		},
	],
};

const dissolveDefinition: TransitionDefinition = {
	type: "dissolve",
	name: "Dissolve",
	keywords: ["dissolve", "pixel", "grain", "erosion"],
	defaultDurationSeconds: 0.6,
	swatch: ["#8e9aaf", "#dbe4ee"],
	buildPasses: ({ progress, width, params }) => [
		{
			shader: "transition-dissolve",
			uniforms: {
				u_progress: progress,
				u_graininess: Math.max(
					1,
					(Number(params.size ?? 24) * width) / 1920,
				),
			},
		},
	],
};

const buildWipeDefinition = ({
	type,
	name,
	angle,
	keywords,
	swatch,
}: {
	type: string;
	name: string;
	angle: number;
	keywords: string[];
	swatch: [string, string];
}): TransitionDefinition => ({
	type,
	name,
	keywords,
	defaultDurationSeconds: 0.5,
	swatch,
	buildPasses: ({ progress }) => [
		{
			shader: "transition-wipe",
			uniforms: {
				u_progress: progress,
				u_angle: angle,
				u_softness: 0,
			},
		},
	],
});

const buildPushDefinition = ({
	type,
	name,
	angle,
	keywords,
	swatch,
}: {
	type: string;
	name: string;
	angle: number;
	keywords: string[];
	swatch: [string, string];
}): TransitionDefinition => ({
	type,
	name,
	keywords,
	defaultDurationSeconds: 0.5,
	swatch,
	buildPasses: ({ progress }) => [
		{
			shader: "transition-slide",
			uniforms: {
				u_progress: progress,
				u_angle: angle,
			},
		},
	],
});

const zoomDefinition: TransitionDefinition = {
	type: "zoom-in",
	name: "Zoom In",
	keywords: ["zoom", "punch", "scale"],
	defaultDurationSeconds: 0.5,
	swatch: ["#5f4b8b", "#b9a8e0"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-zoom",
			uniforms: { u_progress: progress },
		},
	],
};

const blurDefinition: TransitionDefinition = {
	type: "blur",
	name: "Blur",
	keywords: ["blur", "soft", "focus"],
	defaultDurationSeconds: 0.6,
	swatch: ["#9fb8c8", "#e8f1f5"],
	buildPasses: ({ progress, params }) => [
		{
			shader: "transition-blur",
			uniforms: {
				u_progress: progress,
				u_amount: Number(params.amount ?? 60),
			},
		},
	],
};

const glitchDefinition: TransitionDefinition = {
	type: "glitch",
	name: "Glitch",
	keywords: ["glitch", "vhs", "digital", "tear"],
	defaultDurationSeconds: 0.5,
	swatch: ["#3d2c8d", "#916bbf"],
	buildPasses: ({ progress, params }) => [
		{
			shader: "transition-glitch",
			uniforms: {
				u_progress: progress,
				u_intensity: Number(params.intensity ?? 70),
			},
		},
	],
};

const spinTransition: TransitionDefinition = {
	type: "spin",
	name: "Spin",
	keywords: ["spin", "rotate", "swirl"],
	defaultDurationSeconds: 0.6,
	swatch: ["#8e44ad", "#c39bd3"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-spin",
			uniforms: { u_progress: progress },
		},
	],
};

const blindsTransition: TransitionDefinition = {
	type: "blinds",
	name: "Blinds",
	keywords: ["blinds", "stripes", "stagger", "shutter"],
	defaultDurationSeconds: 0.7,
	swatch: ["#5d6d7e", "#aeb6bf"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-blinds",
			uniforms: { u_progress: progress, u_count: 6 },
		},
	],
};

const flashTransition: TransitionDefinition = {
	type: "flash",
	name: "Flash",
	keywords: ["flash", "camera", "white", "light"],
	defaultDurationSeconds: 0.4,
	swatch: ["#ffffff", "#d5d8dc"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-flash",
			uniforms: { u_progress: progress },
		},
	],
};

// ===== 批次二：20 个新转场 =====

const irisOpenTransition: TransitionDefinition = {
	type: "iris-open",
	name: "Iris Open",
	keywords: ["iris", "circle", "reveal", "open", "圆形"],
	defaultDurationSeconds: 0.7,
	swatch: ["#34495e", "#41b883"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-iris",
			uniforms: { u_progress: progress, u_feather: 12, u_shape: 0 },
		},
	],
};

const irisCloseTransition: TransitionDefinition = {
	type: "iris-close",
	name: "Iris Close",
	keywords: ["iris", "circle", "close", "圆形"],
	defaultDurationSeconds: 0.7,
	swatch: ["#41b883", "#34495e"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-iris",
			uniforms: { u_progress: 1 - progress, u_feather: 12, u_shape: 0 },
		},
	],
};

const diamondTransition: TransitionDefinition = {
	type: "diamond",
	name: "Diamond",
	keywords: ["diamond", "reveal", "菱形"],
	defaultDurationSeconds: 0.7,
	swatch: ["#9b59b6", "#e8daef"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-iris",
			uniforms: { u_progress: progress, u_feather: 10, u_shape: 1 },
		},
	],
};

const clockWipeTransition: TransitionDefinition = {
	type: "clock-wipe",
	name: "Clock Wipe",
	keywords: ["clock", "radial", "sweep", "时钟"],
	defaultDurationSeconds: 0.8,
	swatch: ["#e67e22", "#f5f0e6"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-clock",
			uniforms: { u_progress: progress },
		},
	],
};

const whipLeftTransition: TransitionDefinition = {
	type: "whip-left",
	name: "Whip Left",
	keywords: ["whip", "pan", "blur", "slide", "甩镜"],
	defaultDurationSeconds: 0.35,
	swatch: ["#2c3e50", "#e74c3c"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-whip",
			uniforms: { u_progress: progress, u_direction: 180, u_blur: 80 },
		},
	],
};

const whipRightTransition: TransitionDefinition = {
	type: "whip-right",
	name: "Whip Right",
	keywords: ["whip", "pan", "blur", "slide", "甩镜"],
	defaultDurationSeconds: 0.35,
	swatch: ["#e74c3c", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-whip",
			uniforms: { u_progress: progress, u_direction: 0, u_blur: 80 },
		},
	],
};

const shakeTransition: TransitionDefinition = {
	type: "shake",
	name: "Shake",
	keywords: ["shake", "impact", "camera", "抖动"],
	defaultDurationSeconds: 0.5,
	swatch: ["#7f8c8d", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-shake",
			uniforms: { u_progress: progress, u_intensity: 70 },
		},
	],
};

const splitHTransition: TransitionDefinition = {
	type: "split-horizontal",
	name: "Split Horizontal",
	keywords: ["split", "horizontal", "open", "分开"],
	defaultDurationSeconds: 0.7,
	swatch: ["#16a085", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-split",
			uniforms: { u_progress: progress, u_direction: 0 },
		},
	],
};

const splitVTransition: TransitionDefinition = {
	type: "split-vertical",
	name: "Split Vertical",
	keywords: ["split", "vertical", "open", "分开"],
	defaultDurationSeconds: 0.7,
	swatch: ["#27ae60", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-split",
			uniforms: { u_progress: progress, u_direction: 1 },
		},
	],
};

const dreamTransition: TransitionDefinition = {
	type: "dream",
	name: "Dream",
	keywords: ["dream", "soft", "blur", "glow", "梦境"],
	defaultDurationSeconds: 0.9,
	swatch: ["#d4a5a5", "#fce4ec"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-dream",
			uniforms: { u_progress: progress, u_amount: 60 },
		},
	],
};

const fisheyeTransition: TransitionDefinition = {
	type: "fisheye",
	name: "Fisheye",
	keywords: ["fisheye", "bulge", "distort", "鱼眼"],
	defaultDurationSeconds: 0.8,
	swatch: ["#3498db", "#1a5276"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-fisheye",
			uniforms: { u_progress: progress },
		},
	],
};

const glitchDriftTransition: TransitionDefinition = {
	type: "glitch-drift",
	name: "Glitch Drift",
	keywords: ["glitch", "drift", "roll", "digital", "故障"],
	defaultDurationSeconds: 0.6,
	swatch: ["#e74c3c", "#8e44ad"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-glitch-drift",
			uniforms: { u_progress: progress, u_intensity: 80 },
		},
	],
};

const lumaWipeTransition: TransitionDefinition = {
	type: "luma-wipe",
	name: "Luma Wipe",
	keywords: ["luma", "brightness", "wipe", "亮度"],
	defaultDurationSeconds: 0.8,
	swatch: ["#f39c12", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-luma",
			uniforms: { u_progress: progress, u_softness: 30 },
		},
	],
};

const rippleTransition: TransitionDefinition = {
	type: "ripple",
	name: "Ripple",
	keywords: ["ripple", "water", "wave", "concentric", "波纹"],
	defaultDurationSeconds: 0.9,
	swatch: ["#3498db", "#aef0e8"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-ripple",
			uniforms: { u_progress: progress, u_amplitude: 50 },
		},
	],
};

const zoomOutTransition: TransitionDefinition = {
	type: "zoom-out",
	name: "Zoom Out",
	keywords: ["zoom", "out", "shrink", "settle", "缩小"],
	defaultDurationSeconds: 0.7,
	swatch: ["#e67e22", "#16a085"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-zoom-out",
			uniforms: { u_progress: progress },
		},
	],
};

const crossZoomTransition: TransitionDefinition = {
	type: "cross-zoom",
	name: "Cross Zoom",
	keywords: ["cross", "zoom", "blur", "punch", "交叉"],
	defaultDurationSeconds: 0.6,
	swatch: ["#c0392b", "#f1c40f"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-cross-zoom",
			uniforms: { u_progress: progress },
		},
	],
};

const pixelateTransition: TransitionDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixelate", "mosaic", "8bit", "pixel", "像素"],
	defaultDurationSeconds: 0.8,
	swatch: ["#2ecc71", "#34495e"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-pixelate",
			uniforms: { u_progress: progress, u_size: 40 },
		},
	],
};

const cubeTransition: TransitionDefinition = {
	type: "cube",
	name: "Cube",
	keywords: ["cube", "3d", "rotate", "立体", "方块"],
	defaultDurationSeconds: 0.8,
	swatch: ["#34495e", "#ecf0f1"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-cube",
			uniforms: { u_progress: progress },
		},
	],
};

const pixelWipeTransition: TransitionDefinition = {
	type: "pixel-wipe",
	name: "Pixel Wipe",
	keywords: ["pixel", "wipe", "blocks", "像素", "擦除"],
	defaultDurationSeconds: 0.8,
	swatch: ["#9b59b6", "#f1c40f"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-pixel-wipe",
			uniforms: { u_progress: progress, u_cell: 24 },
		},
	],
};

const windmillTransition: TransitionDefinition = {
	type: "windmill",
	name: "Windmill",
	keywords: ["windmill", "blade", "sweep", "风车", "旋转"],
	defaultDurationSeconds: 0.9,
	swatch: ["#e67e22", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-windmill",
			uniforms: { u_progress: progress },
		},
	],
};

const dropTransition: TransitionDefinition = {
	type: "drop",
	name: "Drop",
	keywords: ["drop", "fall", "bounce", "down", "下落"],
	defaultDurationSeconds: 0.7,
	swatch: ["#e74c3c", "#f9e79f"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-drop",
			uniforms: { u_progress: progress },
		},
	],
};

const swirlMorphTransition: TransitionDefinition = {
	type: "swirl",
	name: "Swirl",
	keywords: ["swirl", "vortex", "twist", "漩涡"],
	defaultDurationSeconds: 0.9,
	swatch: ["#8e44ad", "#3498db"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-swirl-morph",
			uniforms: { u_progress: progress, u_intensity: 70 },
		},
	],
};

const streaksTransition: TransitionDefinition = {
	type: "streaks",
	name: "Streaks",
	keywords: ["streaks", "light", "wipe", "film", "流光"],
	defaultDurationSeconds: 0.7,
	swatch: ["#f1c40f", "#2c3e50"],
	buildPasses: ({ progress }) => [
		{
			shader: "transition-streaks",
			uniforms: { u_progress: progress, u_intensity: 80, u_angle: 30 },
		},
	],
};

export const transitionDefinitions: TransitionDefinition[] = [
	fadeDefinition,
	fadeWhiteDefinition,
	dissolveDefinition,
	buildWipeDefinition({
		type: "wipe-left",
		name: "Wipe Left",
		angle: 0,
		keywords: ["wipe", "left"],
		swatch: ["#4d96ff", "#a8d0ff"],
	}),
	buildWipeDefinition({
		type: "wipe-right",
		name: "Wipe Right",
		angle: 180,
		keywords: ["wipe", "right"],
		swatch: ["#4d96ff", "#a8d0ff"],
	}),
	buildWipeDefinition({
		type: "wipe-up",
		name: "Wipe Up",
		angle: 90,
		keywords: ["wipe", "up"],
		swatch: ["#4d96ff", "#a8d0ff"],
	}),
	buildWipeDefinition({
		type: "wipe-down",
		name: "Wipe Down",
		angle: 270,
		keywords: ["wipe", "down"],
		swatch: ["#4d96ff", "#a8d0ff"],
	}),
	buildPushDefinition({
		type: "push-left",
		name: "Push Left",
		angle: 0,
		keywords: ["push", "slide", "left"],
		swatch: ["#ff9f45", "#ffd9a8"],
	}),
	buildPushDefinition({
		type: "push-right",
		name: "Push Right",
		angle: 180,
		keywords: ["push", "slide", "right"],
		swatch: ["#ff9f45", "#ffd9a8"],
	}),
	buildPushDefinition({
		type: "push-up",
		name: "Push Up",
		angle: 90,
		keywords: ["push", "slide", "up"],
		swatch: ["#ff9f45", "#ffd9a8"],
	}),
	buildPushDefinition({
		type: "push-down",
		name: "Push Down",
		angle: 270,
		keywords: ["push", "slide", "down"],
		swatch: ["#ff9f45", "#ffd9a8"],
	}),
	zoomDefinition,
	blurDefinition,
	glitchDefinition,
	spinTransition,
	blindsTransition,
	flashTransition,
	irisOpenTransition,
	irisCloseTransition,
	diamondTransition,
	clockWipeTransition,
	whipLeftTransition,
	whipRightTransition,
	shakeTransition,
	splitHTransition,
	splitVTransition,
	dreamTransition,
	fisheyeTransition,
	glitchDriftTransition,
	lumaWipeTransition,
	rippleTransition,
	zoomOutTransition,
	crossZoomTransition,
	pixelateTransition,
	dropTransition,
	cubeTransition,
	pixelWipeTransition,
	windmillTransition,
	swirlMorphTransition,
	streaksTransition,
];

export function registerDefaultTransitions(): void {
	for (const definition of transitionDefinitions) {
		if (transitionsRegistry.has(definition.type)) {
			continue;
		}
		transitionsRegistry.register({ definition });
	}
}
