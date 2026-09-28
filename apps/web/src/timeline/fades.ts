import { TICKS_PER_SECOND } from "@/wasm";
import type { ParamValues } from "@/params";

/**
 * 0..1 multiplier for a linear fade-in/out ramp at `localTimeTicks` within an
 * element of `durationTicks`. Fade lengths come from the `fadeIn`/`fadeOut`
 * element params (seconds).
 */
export function computeFadeFactor({
	params,
	localTimeTicks,
	durationTicks,
}: {
	params: ParamValues;
	localTimeTicks: number;
	durationTicks: number;
}): number {
	const fadeInSeconds = typeof params.fadeIn === "number" ? params.fadeIn : 0;
	const fadeOutSeconds = typeof params.fadeOut === "number" ? params.fadeOut : 0;

	let factor = 1;
	if (fadeInSeconds > 0) {
		const fadeInTicks = fadeInSeconds * TICKS_PER_SECOND;
		factor *= Math.min(1, Math.max(0, localTimeTicks / fadeInTicks));
	}
	if (fadeOutSeconds > 0) {
		const fadeOutTicks = fadeOutSeconds * TICKS_PER_SECOND;
		factor *= Math.min(
			1,
			Math.max(0, (durationTicks - localTimeTicks) / fadeOutTicks),
		);
	}
	return factor;
}
