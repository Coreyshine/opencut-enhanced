import { generateUUID } from "@/utils/id";
import {
	mediaTime,
	mediaTimeFromSeconds,
	type MediaTime,
} from "@/wasm";
import type {
	ElementAnimations,
	ScalarAnimationKey,
	ScalarChannel,
} from "@/animation/types";

export type AnimationPresetPhase = "in" | "out" | "loop";

export interface AnimationPresetContext {
	/** Element duration in ticks. */
	durationTicks: MediaTime;
	/** Base transform position (usually 0,0). */
	basePosition: { x: number; y: number };
	/** Canvas size for slide offsets. */
	canvasSize: { width: number; height: number };
	/** The preset's own default duration in seconds. */
	presetDurationSeconds: number;
}

export interface AnimationPreset {
	id: string;
	name: string;
	phase: AnimationPresetPhase;
	defaultDurationSeconds: number;
	keywords: string[];
	build(context: AnimationPresetContext): ElementAnimations;
}

function toSeconds(durationTicks: MediaTime): number {
	return durationTicks / 120_000;
}

interface KeyHandles {
	leftHandle?: ScalarAnimationKey["leftHandle"];
	rightHandle?: ScalarAnimationKey["rightHandle"];
}

function easeOutHandles(spanSeconds: number): KeyHandles {
	return {
		leftHandle: { dt: mediaTime({ ticks: 0 }), dv: 0 },
		rightHandle: {
			dt: mediaTime({ ticks: Math.round(spanSeconds * 0.55 * 120_000) }),
			dv: 0,
		},
	};
}

function easeInHandles(spanSeconds: number): KeyHandles {
	return {
		leftHandle: {
			dt: mediaTime({ ticks: Math.round(spanSeconds * 0.55 * 120_000) }),
			dv: 0,
		},
		rightHandle: { dt: mediaTime({ ticks: 0 }), dv: 0 },
	};
}

function scalarKey({
	timeSeconds,
	value,
	segmentToNext = "bezier",
	handles,
}: {
	timeSeconds: number;
	value: number;
	segmentToNext?: ScalarAnimationKey["segmentToNext"];
	handles?: KeyHandles;
}): ScalarAnimationKey {
	return {
		id: generateUUID(),
		time: mediaTimeFromSeconds({ seconds: timeSeconds }),
		value,
		segmentToNext,
		tangentMode: "broken",
		...handles,
	};
}

function channel(keys: ScalarAnimationKey[]): ScalarChannel {
	return { keys };
}

function presetInDuration({
	presetDurationSeconds,
	durationTicks,
}: {
	presetDurationSeconds: number;
	durationTicks: MediaTime;
}): number {
	return Math.min(presetDurationSeconds, toSeconds(durationTicks));
}

function buildFadeIn({
	inDuration,
}: {
	inDuration: number;
}): ElementAnimations {
	return {
		opacity: channel([
			scalarKey({ timeSeconds: 0, value: 0, segmentToNext: "linear" }),
			scalarKey({
				timeSeconds: inDuration,
				value: 1,
				segmentToNext: "linear",
			}),
		]),
	};
}

function buildSlideIn({
	inDuration,
	from,
	to,
}: {
	inDuration: number;
	from: { x: number; y: number };
	to: { x: number; y: number };
}): ElementAnimations {
	return {
		"transform.positionX": channel([
			scalarKey({
				timeSeconds: 0,
				value: from.x,
				handles: easeOutHandles(inDuration),
			}),
			scalarKey({
				timeSeconds: inDuration,
				value: to.x,
				segmentToNext: "linear",
			}),
		]),
		"transform.positionY": channel([
			scalarKey({
				timeSeconds: 0,
				value: from.y,
				handles: easeOutHandles(inDuration),
			}),
			scalarKey({
				timeSeconds: inDuration,
				value: to.y,
				segmentToNext: "linear",
			}),
		]),
	};
}

function buildSlideOutX({
	total,
	outDuration,
	baseX,
	targetX,
}: {
	total: number;
	outDuration: number;
	baseX: number;
	targetX: number;
}): ElementAnimations {
	const start = total - outDuration;
	return {
		"transform.positionX": channel([
			scalarKey({
				timeSeconds: 0,
				value: baseX,
				segmentToNext: "linear",
			}),
			scalarKey({
				timeSeconds: start,
				value: baseX,
				handles: easeInHandles(outDuration),
			}),
			scalarKey({ timeSeconds: total, value: targetX }),
		]),
	};
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
	{
		id: "fade-in",
		name: "Fade In",
		phase: "in",
		defaultDurationSeconds: 0.5,
		keywords: ["fade", "opacity", "dissolve"],
		build: ({ durationTicks, presetDurationSeconds }) =>
			buildFadeIn({
				inDuration: presetInDuration({ presetDurationSeconds, durationTicks }),
			}),
	},
	{
		id: "zoom-in",
		name: "Zoom In",
		phase: "in",
		defaultDurationSeconds: 0.5,
		keywords: ["zoom", "scale", "grow"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const inDuration = presetInDuration({ presetDurationSeconds, durationTicks });
			return {
				"transform.scaleX": channel([
					scalarKey({
						timeSeconds: 0,
						value: 0.2,
						handles: easeOutHandles(inDuration),
					}),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
				"transform.scaleY": channel([
					scalarKey({
						timeSeconds: 0,
						value: 0.2,
						handles: easeOutHandles(inDuration),
					}),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 0, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: inDuration * 0.6,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
			};
		},
	},
	{
		id: "bounce-in",
		name: "Bounce In",
		phase: "in",
		defaultDurationSeconds: 0.6,
		keywords: ["bounce", "pop", "elastic"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const inDuration = presetInDuration({ presetDurationSeconds, durationTicks });
			const settle = inDuration * 1.35;
			const overshootHandles: KeyHandles = {
				leftHandle: { dt: mediaTime({ ticks: 0 }), dv: 0 },
				rightHandle: {
					dt: mediaTime({
						ticks: Math.round(inDuration * 0.35 * 120_000),
					}),
					dv: 0.35,
				},
			};
			return {
				"transform.scaleX": channel([
					scalarKey({ timeSeconds: 0, value: 0.4 }),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						handles: overshootHandles,
						segmentToNext: "linear",
					}),
					scalarKey({ timeSeconds: settle, value: 1, segmentToNext: "linear" }),
				]),
				"transform.scaleY": channel([
					scalarKey({ timeSeconds: 0, value: 0.4 }),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						handles: overshootHandles,
						segmentToNext: "linear",
					}),
					scalarKey({ timeSeconds: settle, value: 1, segmentToNext: "linear" }),
				]),
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 0, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: inDuration * 0.5,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
			};
		},
	},
	{
		id: "slide-left-in",
		name: "Slide from Right",
		phase: "in",
		defaultDurationSeconds: 0.5,
		keywords: ["slide", "right", "enter"],
		build: ({
			canvasSize,
			basePosition,
			durationTicks,
			presetDurationSeconds,
		}) =>
			buildSlideIn({
				inDuration: presetInDuration({ presetDurationSeconds, durationTicks }),
				from: { x: basePosition.x + canvasSize.width, y: basePosition.y },
				to: { x: basePosition.x, y: basePosition.y },
			}),
	},
	{
		id: "slide-right-in",
		name: "Slide from Left",
		phase: "in",
		defaultDurationSeconds: 0.5,
		keywords: ["slide", "left", "enter"],
		build: ({
			canvasSize,
			basePosition,
			durationTicks,
			presetDurationSeconds,
		}) =>
			buildSlideIn({
				inDuration: presetInDuration({ presetDurationSeconds, durationTicks }),
				from: { x: basePosition.x - canvasSize.width, y: basePosition.y },
				to: { x: basePosition.x, y: basePosition.y },
			}),
	},
	{
		id: "slide-up-in",
		name: "Slide from Bottom",
		phase: "in",
		defaultDurationSeconds: 0.5,
		keywords: ["slide", "bottom", "up", "enter"],
		build: ({
			canvasSize,
			basePosition,
			durationTicks,
			presetDurationSeconds,
		}) =>
			buildSlideIn({
				inDuration: presetInDuration({ presetDurationSeconds, durationTicks }),
				from: { x: basePosition.x, y: basePosition.y + canvasSize.height },
				to: { x: basePosition.x, y: basePosition.y },
			}),
	},
	{
		id: "spin-in",
		name: "Spin In",
		phase: "in",
		defaultDurationSeconds: 0.6,
		keywords: ["spin", "rotate", "whirl"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const inDuration = presetInDuration({ presetDurationSeconds, durationTicks });
			return {
				"transform.rotate": channel([
					scalarKey({
						timeSeconds: 0,
						value: -180,
						handles: easeOutHandles(inDuration),
					}),
					scalarKey({
						timeSeconds: inDuration,
						value: 0,
						segmentToNext: "linear",
					}),
				]),
				"transform.scaleX": channel([
					scalarKey({
						timeSeconds: 0,
						value: 0.4,
						handles: easeOutHandles(inDuration),
					}),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
				"transform.scaleY": channel([
					scalarKey({
						timeSeconds: 0,
						value: 0.4,
						handles: easeOutHandles(inDuration),
					}),
					scalarKey({
						timeSeconds: inDuration,
						value: 1,
						segmentToNext: "linear",
					}),
				]),
			};
		},
	},
	{
		id: "fade-out",
		name: "Fade Out",
		phase: "out",
		defaultDurationSeconds: 0.5,
		keywords: ["fade", "opacity"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const total = toSeconds(durationTicks);
			const outDuration = Math.min(presetDurationSeconds, total);
			const start = total - outDuration;
			return {
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 1, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start,
						value: 1,
						segmentToNext: "linear",
					}),
					scalarKey({ timeSeconds: total, value: 0 }),
				]),
			};
		},
	},
	{
		id: "zoom-out",
		name: "Zoom Out",
		phase: "out",
		defaultDurationSeconds: 0.5,
		keywords: ["zoom", "shrink"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const total = toSeconds(durationTicks);
			const outDuration = Math.min(presetDurationSeconds, total);
			const start = total - outDuration;
			return {
				"transform.scaleX": channel([
					scalarKey({ timeSeconds: 0, value: 1, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start,
						value: 1,
						handles: easeInHandles(outDuration),
					}),
					scalarKey({ timeSeconds: total, value: 0.2 }),
				]),
				"transform.scaleY": channel([
					scalarKey({ timeSeconds: 0, value: 1, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start,
						value: 1,
						handles: easeInHandles(outDuration),
					}),
					scalarKey({ timeSeconds: total, value: 0.2 }),
				]),
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 1, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start + outDuration * 0.4,
						value: 1,
						segmentToNext: "linear",
					}),
					scalarKey({ timeSeconds: total, value: 0 }),
				]),
			};
		},
	},
	{
		id: "slide-left-out",
		name: "Slide Out Left",
		phase: "out",
		defaultDurationSeconds: 0.5,
		keywords: ["slide", "left", "exit"],
		build: ({
			canvasSize,
			basePosition,
			durationTicks,
			presetDurationSeconds,
		}) =>
			buildSlideOutX({
				total: toSeconds(durationTicks),
				outDuration: Math.min(
					presetDurationSeconds,
					toSeconds(durationTicks),
				),
				baseX: basePosition.x,
				targetX: basePosition.x - canvasSize.width,
			}),
	},
	{
		id: "slide-right-out",
		name: "Slide Out Right",
		phase: "out",
		defaultDurationSeconds: 0.5,
		keywords: ["slide", "right", "exit"],
		build: ({
			canvasSize,
			basePosition,
			durationTicks,
			presetDurationSeconds,
		}) =>
			buildSlideOutX({
				total: toSeconds(durationTicks),
				outDuration: Math.min(
					presetDurationSeconds,
					toSeconds(durationTicks),
				),
				baseX: basePosition.x,
				targetX: basePosition.x + canvasSize.width,
			}),
	},
	{
		id: "spin-out",
		name: "Spin Out",
		phase: "out",
		defaultDurationSeconds: 0.6,
		keywords: ["spin", "rotate", "exit"],
		build: ({ durationTicks, presetDurationSeconds }) => {
			const total = toSeconds(durationTicks);
			const outDuration = Math.min(presetDurationSeconds, total);
			const start = total - outDuration;
			return {
				"transform.rotate": channel([
					scalarKey({ timeSeconds: 0, value: 0, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start,
						value: 0,
						handles: easeInHandles(outDuration),
					}),
					scalarKey({ timeSeconds: total, value: 180 }),
				]),
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 1, segmentToNext: "linear" }),
					scalarKey({
						timeSeconds: start + outDuration * 0.5,
						value: 1,
						segmentToNext: "linear",
					}),
					scalarKey({ timeSeconds: total, value: 0 }),
				]),
			};
		},
	},
	{
		id: "pulse",
		name: "Pulse",
		phase: "loop",
		defaultDurationSeconds: 1,
		keywords: ["pulse", "beat", "loop", "breathe"],
		build: ({ durationTicks }) => {
			const total = toSeconds(durationTicks);
			const cycle = 1;
			const keys: ScalarAnimationKey[] = [];
			for (let t = 0; t < total - 1e-6; t += cycle) {
				keys.push(
					scalarKey({ timeSeconds: t, value: 1 }),
					scalarKey({ timeSeconds: t + cycle * 0.5, value: 1.08 }),
				);
			}
			keys.push(scalarKey({ timeSeconds: total, value: 1 }));
			return {
				"transform.scaleX": channel(keys),
				"transform.scaleY": channel(
					keys.map((k) => ({ ...k, id: generateUUID() })),
				),
			};
		},
	},
	{
		id: "sway",
		name: "Sway",
		phase: "loop",
		defaultDurationSeconds: 2,
		keywords: ["sway", "wiggle", "rotate", "loop"],
		build: ({ durationTicks }) => {
			const total = toSeconds(durationTicks);
			const cycle = 2;
			const keys: ScalarAnimationKey[] = [];
			for (let t = 0; t < total - 1e-6; t += cycle) {
				keys.push(
					scalarKey({ timeSeconds: t, value: -3 }),
					scalarKey({ timeSeconds: t + cycle * 0.5, value: 3 }),
				);
			}
			keys.push(scalarKey({ timeSeconds: total, value: -3 }));
			return {
				"transform.rotate": channel(keys),
			};
		},
	},
	{
		id: "drop-in",
		name: "Drop In",
		phase: "in",
		defaultDurationSeconds: 0.6,
		keywords: ["drop", "fall", "top", "bounce", "enter"],
		build: ({ durationTicks, canvasSize, presetDurationSeconds }) => {
			const inDuration = presetInDuration({ presetDurationSeconds, durationTicks });
			const dropDistance = canvasSize.height * 0.4;
			return {
				"transform.positionY": channel([
					scalarKey({ timeSeconds: 0, value: -dropDistance, handles: easeOutHandles(inDuration) }),
					scalarKey({ timeSeconds: inDuration, value: 0, segmentToNext: "linear" }),
				]),
				opacity: channel([
					scalarKey({ timeSeconds: 0, value: 0, segmentToNext: "linear" }),
					scalarKey({ timeSeconds: inDuration * 0.4, value: 1, segmentToNext: "linear" }),
				]),
			};
		},
	},
	{
		id: "wiggle",
		name: "Wiggle",
		phase: "loop",
		defaultDurationSeconds: 1,
		keywords: ["wiggle", "shake", "rotate", "playful", "loop"],
		build: ({ durationTicks }) => {
			const total = toSeconds(durationTicks);
			const cycle = 0.8;
			const keys: ScalarAnimationKey[] = [];
			for (let t = 0; t < total - 1e-6; t += cycle) {
				keys.push(
					scalarKey({ timeSeconds: t, value: -6 }),
					scalarKey({ timeSeconds: t + cycle * 0.25, value: 6 }),
					scalarKey({ timeSeconds: t + cycle * 0.5, value: -4 }),
					scalarKey({ timeSeconds: t + cycle * 0.75, value: 4 }),
				);
			}
			keys.push(scalarKey({ timeSeconds: total, value: -6 }));
			return {
				"transform.rotate": channel(keys),
			};
		},
	},
	{
		id: "heartbeat",
		name: "Heartbeat",
		phase: "loop",
		defaultDurationSeconds: 1.2,
		keywords: ["heartbeat", "pulse", "double beat", "rhythm", "loop"],
		build: ({ durationTicks }) => {
			const total = toSeconds(durationTicks);
			const cycle = 1.2;
			const keys: ScalarAnimationKey[] = [];
			// Double-thump pattern: 1 → 1.12 → 1 → 1.08 → 1 per cycle.
			for (let t = 0; t < total - 1e-6; t += cycle) {
				keys.push(
					scalarKey({ timeSeconds: t, value: 1 }),
					scalarKey({ timeSeconds: t + cycle * 0.12, value: 1.12, segmentToNext: "linear" }),
					scalarKey({ timeSeconds: t + cycle * 0.24, value: 1, segmentToNext: "linear" }),
					scalarKey({ timeSeconds: t + cycle * 0.36, value: 1.08, segmentToNext: "linear" }),
					scalarKey({ timeSeconds: t + cycle * 0.5, value: 1 }),
				);
			}
			keys.push(scalarKey({ timeSeconds: total, value: 1 }));
			return {
				"transform.scaleX": channel(keys),
				"transform.scaleY": channel(
					keys.map((k) => ({ ...k, id: generateUUID() })),
				),
			};
		},
	},
	{
		id: "float",
		name: "Float",
		phase: "loop",
		defaultDurationSeconds: 2,
		keywords: ["float", "bob", "move", "loop"],
		build: ({ durationTicks, basePosition }) => {
			const total = toSeconds(durationTicks);
			const cycle = 2;
			const keys: ScalarAnimationKey[] = [];
			for (let t = 0; t < total - 1e-6; t += cycle) {
				keys.push(
					scalarKey({ timeSeconds: t, value: basePosition.y }),
					scalarKey({
						timeSeconds: t + cycle * 0.5,
						value: basePosition.y - 20,
					}),
				);
			}
			keys.push(scalarKey({ timeSeconds: total, value: basePosition.y }));
			return {
				"transform.positionY": channel(keys),
			};
		},
	},
];
