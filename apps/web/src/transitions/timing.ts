import type { ElementTransition } from "./types";
import { transitionsRegistry } from "./registry";
import type { SceneTracks, TimelineTrack, VideoTrack } from "@/timeline";
import type { MediaTime } from "@/wasm";
import {
	addMediaTime,
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	roundMediaTime,
	subMediaTime,
} from "@/wasm";

/** Tracks that support transitions between adjacent clips. */
export function isTransitionTrack(track: TimelineTrack | undefined): track is VideoTrack {
	return track?.type === "video";
}

export interface TransitionJunction {
	/** The element the transition is stored on (left of the cut). */
	outgoingTrackId: string;
	outgoingElementId: string;
	/** The element revealed by the transition (right of the cut). */
	incomingElementId: string;
}

export interface AdjacentPair {
	track: VideoTrack;
	outgoing: TransitionedTimelineElement;
	incoming: TransitionedTimelineElement;
}

type TransitionedTimelineElement = SceneTracks["main"]["elements"][number];

/**
 * Finds the adjacent incoming element for an outgoing element on a video
 * track. Transitions require exact adjacency: the incoming element must start
 * exactly when the outgoing one ends.
 */
export function findAdjacentPair({
	tracks,
	trackId,
	outgoingElementId,
}: {
	tracks: SceneTracks;
	trackId: string;
	outgoingElementId: string;
}): AdjacentPair | null {
	const track = [
		tracks.main,
		...tracks.overlay,
	].find((candidate): candidate is VideoTrack => isTransitionTrack(candidate) && candidate.id === trackId);
	if (!track) {
		return null;
	}

	const elements = [...track.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const outgoingIndex = elements.findIndex(
		(element) => element.id === outgoingElementId,
	);
	if (outgoingIndex === -1 || outgoingIndex === elements.length - 1) {
		return null;
	}

	const outgoing = elements[outgoingIndex];
	const incoming = elements[outgoingIndex + 1];
	const outgoingEnd = outgoing.startTime + outgoing.duration;
	if (incoming.startTime !== outgoingEnd) {
		return null;
	}

	return { track, outgoing, incoming };
}

/** Maximum duration allowed for a transition between two clips, in seconds. */
export function maxTransitionDurationSeconds({
	pair,
}: {
	pair: Pick<AdjacentPair, "outgoing" | "incoming">;
}): number {
	const outgoingSeconds = mediaTimeToSeconds({ time: pair.outgoing.duration });
	const incomingSeconds = mediaTimeToSeconds({ time: pair.incoming.duration });
	return Math.max(0.1, Math.min(outgoingSeconds, incomingSeconds) * 0.8);
}

/** Clamps a transition's duration into the legal range for its junction. */
export function clampTransition({
	transition,
	pair,
}: {
	transition: ElementTransition;
	pair: Pick<AdjacentPair, "outgoing" | "incoming">;
}): ElementTransition {
	const definition = transitionsRegistry.getOrNull(transition.type);
	if (!definition) {
		return transition;
	}
	const maxSeconds = maxTransitionDurationSeconds({ pair });
	const seconds = Math.max(
		0.1,
		Math.min(
			mediaTimeToSeconds({ time: transition.duration }),
			maxSeconds,
		),
	);
	return {
		...transition,
		duration: roundMediaTime({
			time: mediaTimeFromSeconds({ seconds }),
		}),
	};
}

/** Computes the [start, end] timeline window (in ticks) of a transition zone. */
export function transitionWindow({
	outgoing,
	transition,
}: {
	outgoing: { startTime: MediaTime; duration: MediaTime };
	transition: ElementTransition;
}): { start: MediaTime; end: MediaTime } {
	const end = addMediaTime({ a: outgoing.startTime, b: outgoing.duration });
	const start = subMediaTime({ a: end, b: transition.duration });
	return { start, end };
}
