import type { RetimeConfig } from "@/timeline";
import { clampRetimeRate } from "@/retime/rate";
import {
	getCurveAverageRateForRetime,
	getCurveSourceTimeAt,
	getCurveTickAtSourceTime,
} from "@/retime/curve";

function getSafeRate({ rate }: { rate: number }): number {
	return clampRetimeRate({ rate });
}

/** Source time consumed at `clipTime` ticks into the clip. With a speed
 * curve this is the integral of the rate; without, linear. */
export function getSourceTimeAtClipTime({
	clipTime,
	retime,
}: {
	clipTime: number;
	retime?: RetimeConfig;
}): number {
	if (retime?.curve) {
		return getCurveSourceTimeAt({ curve: retime.curve, t: clipTime });
	}
	return clipTime * getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getClipTimeAtSourceTime({
	sourceTime,
	retime,
}: {
	sourceTime: number;
	retime?: RetimeConfig;
}): number {
	if (retime?.curve) {
		return getCurveTickAtSourceTime({ curve: retime.curve, sourceTime });
	}
	return sourceTime / getSafeRate({ rate: retime?.rate ?? 1 });
}

/** Effective playback rate: with a curve this is the average (audio anchor). */
export function getEffectiveRateAt({
	retime,
}: {
	clipTime?: number;
	retime?: RetimeConfig;
}): number {
	if (retime?.curve) {
		return getCurveAverageRateForRetime({ retime });
	}
	return getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getTimelineDurationForSourceSpan({
	sourceSpan,
	retime,
}: {
	sourceSpan: number;
	retime?: RetimeConfig;
}): number {
	if (sourceSpan <= 0) {
		return 0;
	}
	return sourceSpan / getSafeRate({ rate: retime?.rate ?? 1 });
}
