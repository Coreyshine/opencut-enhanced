import type { RetimeConfig } from "@/timeline";
import { shiftCurve, splitCurveAtTick } from "@/retime/curve";
import { getSourceTimeAtClipTime } from "./resolve";

export function getSourceSpanAtClipTime({
	clipTime,
	retime,
}: {
	clipTime: number;
	retime?: RetimeConfig;
}): number {
	return Math.max(0, getSourceTimeAtClipTime({ clipTime, retime }));
}

export function splitRetimeAtClipTime({
	retime,
	splitClipTime,
}: {
	retime?: RetimeConfig;
	splitClipTime: number;
}): {
	left: RetimeConfig | undefined;
	right: RetimeConfig | undefined;
} {
	if (!retime?.curve) {
		return { left: retime, right: retime };
	}
	const { left, right } = splitCurveAtTick({
		curve: retime.curve,
		splitTick: splitClipTime,
	});
	return {
		left: { ...retime, curve: left },
		right: { ...retime, curve: right },
	};
}

export function adjustRetimeForTrimChange({
	retime,
	clipTrimTime,
	side,
}: {
	retime?: RetimeConfig;
	clipTrimTime: number;
	side: "start" | "end";
}): RetimeConfig | undefined {
	if (!retime?.curve || side !== "start" || clipTrimTime <= 0) {
		return retime;
	}
	return {
		...retime,
		curve: shiftCurve({ curve: retime.curve, deltaTicks: clipTrimTime }),
	};
}
