import type { RetimeConfig, RetimeCurve, RetimeCurvePoint } from "@/timeline";
import { clampRetimeRate } from "@/retime/rate";

/** CapCut-style curve presets, expressed as (fractionOfClip, rate) anchors. */
export interface SpeedCurvePreset {
	id: string;
	name: string;
	keywords: string[];
	points: Array<[number, number]>;
}

export const SPEED_CURVE_PRESETS: SpeedCurvePreset[] = [
	{
		id: "montage",
		name: "Montage",
		keywords: ["montage", "fast", "energetic"],
		points: [
			[0, 1],
			[0.2, 3],
			[0.8, 3],
			[1, 1],
		],
	},
	{
		id: "hero-moment",
		name: "Hero Moment",
		keywords: ["hero", "slow", "dramatic"],
		points: [
			[0, 1],
			[0.35, 1],
			[0.5, 0.2],
			[0.65, 1],
			[1, 1],
		],
	},
	{
		id: "bullet-time",
		name: "Bullet Time",
		keywords: ["bullet", "matrix", "slow"],
		points: [
			[0, 4],
			[0.25, 4],
			[0.5, 0.1],
			[0.75, 4],
			[1, 4],
		],
	},
	{
		id: "flash-in",
		name: "Flash In",
		keywords: ["flash", "ramp", "accelerate"],
		points: [
			[0, 0.2],
			[0.4, 1],
			[1, 5],
		],
	},
	{
		id: "jumper",
		name: "Jumper",
		keywords: ["jumper", "pulse", "bounce"],
		points: [
			[0, 1],
			[0.25, 3],
			[0.5, 0.5],
			[0.75, 3],
			[1, 1],
		],
	},
	{
		id: "hover",
		name: "Hover",
		keywords: ["hover", "drift", "slow"],
		points: [
			[0, 2],
			[0.3, 0.3],
			[0.7, 0.3],
			[1, 2],
		],
	},
];

/** Builds a tick-space curve from a preset for a clip of `durationTicks`. */
export function buildCurveFromPreset({
	preset,
	durationTicks,
}: {
	preset: SpeedCurvePreset;
	durationTicks: number;
}): RetimeCurve {
	const points = preset.points.map(([fraction, rate]) => ({
		t: fraction * durationTicks,
		rate: clampRetimeRate({ rate }),
	}));
	return { points };
}

function getCurveSegments({
	points,
}: {
	points: RetimeCurvePoint[];
}): Array<{ t0: number; t1: number; rate0: number; rate1: number }> {
	const segments: Array<{
		t0: number;
		t1: number;
		rate0: number;
		rate1: number;
	}> = [];
	for (let index = 0; index < points.length - 1; index++) {
		const a = points[index];
		const b = points[index + 1];
		if (b.t <= a.t) continue;
		segments.push({ t0: a.t, t1: b.t, rate0: a.rate, rate1: b.rate });
	}
	return segments;
}

/** Linearly interpolated rate at clip-local tick `t`. */
export function getCurveRateAt({
	curve,
	t,
}: {
	curve: RetimeCurve;
	t: number;
}): number {
	const points = curve.points;
	if (points.length === 0) return 1;
	if (points.length === 1) return points[0].rate;
	if (t <= points[0].t) return points[0].rate;
	if (t >= points[points.length - 1].t) {
		return points[points.length - 1].rate;
	}
	for (const segment of getCurveSegments({ points })) {
		if (t >= segment.t0 && t <= segment.t1) {
			const f = (t - segment.t0) / (segment.t1 - segment.t0);
			return segment.rate0 + (segment.rate1 - segment.rate0) * f;
		}
	}
	return points[points.length - 1].rate;
}

/** Integral of the rate from 0 to `t` — the source time consumed so far. */
export function getCurveSourceTimeAt({
	curve,
	t,
}: {
	curve: RetimeCurve;
	t: number;
}): number {
	const clamped = Math.max(0, t);
	let consumed = 0;
	for (const segment of getCurveSegments({ points: curve.points })) {
		const t1 = Math.min(clamped, segment.t1);
		if (t1 <= segment.t0) continue;
		const f = (t1 - segment.t0) / (segment.t1 - segment.t0);
		const avgRate = segment.rate0 + (segment.rate1 - segment.rate0) * 0.5 * f;
		consumed += (t1 - segment.t0) * avgRate;
		if (clamped <= segment.t1) break;
	}
	return consumed;
}

/** Total source time consumed over the whole curve (per the point span). */
export function getCurveTotalSourceTime({
	curve,
}: {
	curve: RetimeCurve;
}): number {
	const points = curve.points;
	if (points.length < 2) return 0;
	return getCurveSourceTimeAt({ curve, t: points[points.length - 1].t });
}

/** Average rate across the curve's covered span. */
export function getCurveAverageRate({
	curve,
}: {
	curve: RetimeCurve;
}): number {
	const span = curve.points.length
		? curve.points[curve.points.length - 1].t
		: 0;
	if (span <= 0) return 1;
	return getCurveTotalSourceTime({ curve }) / span;
}

/** Inverse of the integral: clip-local tick whose consumed source = `sourceTime`. */
export function getCurveTickAtSourceTime({
	curve,
	sourceTime,
}: {
	curve: RetimeCurve;
	sourceTime: number;
}): number {
	const points = curve.points;
	if (points.length < 2) return sourceTime;
	const total = getCurveTotalSourceTime({ curve });
	const target = Math.min(Math.max(0, sourceTime), total);
	let low = points[0].t;
	let high = points[points.length - 1].t;
	for (let iteration = 0; iteration < 24; iteration++) {
		const mid = (low + high) / 2;
		if (getCurveSourceTimeAt({ curve, t: mid }) < target) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return (low + high) / 2;
}

/**
 * Splits a curve at a clip-local tick. The right part's points are re-based
 * so they are relative to its own clip start; a boundary point is injected
 * at the split so both sides end/start at a defined rate.
 */
export function splitCurveAtTick({
	curve,
	splitTick,
}: {
	curve: RetimeCurve;
	splitTick: number;
}): { left: RetimeCurve; right: RetimeCurve } {
	const boundaryRate = getCurveRateAt({ curve, t: splitTick });
	const left: RetimeCurvePoint[] = [];
	const right: RetimeCurvePoint[] = [];
	for (const point of curve.points) {
		if (point.t <= splitTick) {
			left.push({ ...point });
		}
		if (point.t >= splitTick) {
			right.push({ t: point.t - splitTick, rate: point.rate });
		}
	}
	left.push({ t: splitTick, rate: boundaryRate });
	right.unshift({ t: 0, rate: boundaryRate });
	return {
		left: { points: left },
		right: { points: right },
	};
}

/** Shifts the whole curve forward/backward (used for start trims). */
export function shiftCurve({
	curve,
	deltaTicks,
}: {
	curve: RetimeCurve;
	deltaTicks: number;
}): RetimeCurve {
	return {
		points: curve.points
			.map((point) => ({ ...point, t: point.t - deltaTicks }))
			.filter((point, index, all) => point.t >= 0 || index === 0)
			.map((point, index, all) => ({
				...point,
				t: Math.max(0, point.t),
				// drop duplicates at 0
				rate: index > 0 && all[index - 1].t === point.t ? all[index - 1].rate : point.rate,
			}))
			.filter(
				(point, index, all) => index === 0 || point.t !== all[index - 1].t,
			),
	};
}

/** Average rate used to anchor audio playback when a curve is active. */
export function getCurveAverageRateForRetime({
	retime,
}: {
	retime?: RetimeConfig;
}): number {
	if (!retime?.curve) {
		return clampRetimeRate({ rate: retime?.rate ?? 1 });
	}
	return clampRetimeRate({ rate: getCurveAverageRate({ curve: retime.curve }) });
}

/** Builds a curve from explicit tick-space points with clamping. */
export function buildCurveFromPoints({
	points,
}: {
	points: RetimeCurvePoint[];
}): RetimeCurve {
	return {
		points: [...points]
			.map((point) => ({
				t: Math.max(0, point.t),
				rate: clampRetimeRate({ rate: point.rate }),
			}))
			.sort((a, b) => a.t - b.t),
	};
}
