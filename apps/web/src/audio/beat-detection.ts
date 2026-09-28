import type { EditorCore } from "@/core";
import type { AudioElement, VideoElement } from "@/timeline";
import { decodeAudioToFloat32 } from "@/media/audio";
import { mediaTimeFromSeconds } from "@/wasm";
import { SetSceneBookmarksCommand } from "@/commands/scene/set-bookmarks";

const BEAT_BOOKMARK_NOTE = "beat";
const ONSET_WINDOW_SECONDS = 0.01;
const MIN_BEAT_INTERVAL_SECONDS = 0.22;
/** Onset strength threshold as a multiple of the running median. */
const PEAK_THRESHOLD_FACTOR = 1.6;
/** Floor for the threshold as a fraction of the strongest onset. */
const MIN_ONSET_MAX_FRACTION = 0.25;

export interface BeatDetectionResult {
	beats: number[];
	durationSeconds: number;
}

/**
 * Onset-based beat detection: downmix to mono, compute a short-window RMS
 * energy envelope, take the positive difference (onset strength) and pick
 * local maxima above a median-based threshold with a minimum spacing.
 */
export function detectBeatsFromSamples({
	samples,
	sampleRate,
}: {
	samples: Float32Array;
	sampleRate: number;
}): number[] {
	const windowSize = Math.max(
		1,
		Math.round(ONSET_WINDOW_SECONDS * sampleRate),
	);
	const frameCount = Math.floor(samples.length / windowSize);
	if (frameCount < 4) return [];

	// RMS energy envelope.
	const envelope = new Float32Array(frameCount);
	for (let frame = 0; frame < frameCount; frame++) {
		let sum = 0;
		const offset = frame * windowSize;
		for (let i = 0; i < windowSize; i++) {
			const value = samples[offset + i];
			sum += value * value;
		}
		envelope[frame] = Math.sqrt(sum / windowSize);
	}

	// Onset strength: positive energy delta.
	const onset = new Float32Array(frameCount);
	for (let frame = 1; frame < frameCount; frame++) {
		onset[frame] = Math.max(0, envelope[frame] - envelope[frame - 1]);
	}

	// Threshold from the median of NON-ZERO onsets: sparse percussive audio
	// zeroes most frames, so the raw median would be 0 and nothing would pass.
	const sorted = Float32Array.from(onset).filter((v) => v > 0).sort();
	const median =
		sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
	const maxOnset = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
	const threshold = Math.max(
		median * PEAK_THRESHOLD_FACTOR,
		maxOnset * MIN_ONSET_MAX_FRACTION,
	);
	if (threshold <= 0) return [];

	const minGapFrames = Math.ceil(
		MIN_BEAT_INTERVAL_SECONDS * sampleRate / windowSize,
	);
	const beats: number[] = [];
	let lastBeatFrame = -minGapFrames;
	for (let frame = 2; frame < frameCount - 1; frame++) {
		const value = onset[frame];
		if (value < threshold) continue;
		if (value <= onset[frame - 1] || value < onset[frame + 1]) continue;
		if (frame - lastBeatFrame < minGapFrames) continue;
		beats.push((frame * windowSize) / sampleRate);
		lastBeatFrame = frame;
	}
	return beats;
}

/**
 * Detects beats for an audio/video clip and adds them as scene bookmarks so
 * the timeline snap system and marker track can use them (CapCut-style).
 */
export async function detectBeatsForClip({
	editor,
	trackId,
	elementId,
}: {
	editor: EditorCore;
	trackId: string;
	elementId: string;
}): Promise<{ success: boolean; beatCount?: number; error?: string }> {
	const withTrack = editor.timeline
		.getElementsWithTracks({ elements: [{ trackId, elementId }] })
		.find(({ element }) => element.type === "audio" || element.type === "video");
	if (!withTrack) {
		return { success: false, error: "Select an audio or video clip" };
	}
	const element = withTrack.element as AudioElement | VideoElement;
	if (!("mediaId" in element)) {
		return { success: false, error: "Clip has no media source" };
	}
	const mediaAsset = editor.media
		.getAssets()
		.find((asset) => asset.id === element.mediaId);
	if (!mediaAsset?.file) {
		return { success: false, error: "Source media is missing" };
	}

	try {
		const decoded = await decodeAudioToFloat32({ audioBlob: mediaAsset.file });
		const beats = detectBeatsFromSamples({
			samples: decoded.samples,
			sampleRate: decoded.sampleRate,
		});
		if (beats.length === 0) {
			return { success: false, error: "No beats detected in this clip" };
		}

		const clipStartSeconds = element.startTime / 120000;
		const clipDurationSeconds = element.duration / 120000;
		const trimStartSeconds = (element.trimStart ?? 0) / 120000;
		const rate = element.retime?.rate ?? 1;

		const activeScene = editor.scenes.getActiveScene();
		const existing = activeScene.bookmarks;
		const beatTimes = beats
			.map((sourceSecond) => {
				const clipSecond = sourceSecond - trimStartSeconds;
				return clipStartSeconds + clipSecond / rate;
			})
			.filter((timelineSecond) => timelineSecond >= clipStartSeconds)
			.filter(
				(timelineSecond) =>
					timelineSecond <= clipStartSeconds + clipDurationSeconds + 0.001,
			);

		// Keep human bookmarks; replace previous beat bookmarks on re-runs.
		const humanBookmarks = existing.filter(
			(bookmark) => bookmark.note !== BEAT_BOOKMARK_NOTE,
		);
		const merged = [
			...humanBookmarks,
			...beatTimes.map((second) => ({
				time: mediaTimeFromSeconds({ seconds: second }),
				note: BEAT_BOOKMARK_NOTE,
			})),
		].sort((a, b) => a.time - b.time);

		const command = new SetSceneBookmarksCommand({ bookmarks: merged });
		editor.command.execute({ command });

		return { success: true, beatCount: beatTimes.length };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Beat detection failed",
		};
	}
}
