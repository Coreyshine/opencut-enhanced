import { videoCache } from "@/services/video-cache/service";
import { processMediaAssets } from "@/media/processing";
import { getSourceTimeAtClipTime } from "@/retime";
import { generateUUID } from "@/utils/id";
import { buildElementFromMedia } from "@/timeline/element-utils";
import type { EditorCore } from "@/core";
import type { VideoElement } from "@/timeline";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	roundMediaTime,
	addMediaTime,
} from "@/wasm";

const FREEZE_FRAME_DURATION_SECONDS = 3;

export const FREEZE_MIN_CLIP_TICKS = 1;

function canvasToBlob({
	canvas,
}: {
	canvas: CanvasImageSource & { convertToBlob?: () => Promise<Blob>; toBlob?: (cb: (blob: Blob | null) => void) => void };
}): Promise<Blob> {
	if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({ type: "image/png" });
	}
	const htmlCanvas = canvas as HTMLCanvasElement;
	return new Promise<Blob>((resolve, reject) => {
		htmlCanvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Failed to encode freeze frame"));
			}
		}, "image/png");
	});
}

/**
 * CapCut-style freeze frame: captures the frame under the playhead of the
 * selected video element, splits the clip there, inserts a still image of
 * `FREEZE_FRAME_DURATION_SECONDS` and shifts the rest of the track right.
 */
export async function insertFreezeFrame({
	editor,
}: {
	editor: EditorCore;
}): Promise<{ success: boolean; error?: string }> {
	const selection = editor.selection.getSelectedElements()[0];
	if (!selection) {
		return { success: false, error: "Select a video clip first" };
	}

	const withTrack = editor.timeline
		.getElementsWithTracks({ elements: [selection] })
		.find(({ element }) => element.type === "video");
	if (!withTrack || withTrack.element.type !== "video") {
		return { success: false, error: "Freeze frame needs a video clip" };
	}

	const element = withTrack.element as VideoElement;
	const trackId = withTrack.track.id;
	const playhead = editor.playback.getCurrentTime();
	const clipTime = playhead - element.startTime;
	if (clipTime <= 0 || clipTime >= element.duration) {
		return {
			success: false,
			error: "Move the playhead inside the selected clip",
		};
	}

	const mediaAsset = editor.media
		.getAssets()
		.find((asset) => asset.id === element.mediaId);
	if (!mediaAsset?.file) {
		return { success: false, error: "Source media is missing" };
	}

	const sourceTimeTicks =
		element.trimStart +
		getSourceTimeAtClipTime({
			clipTime,
			retime: element.retime,
		});
	const frame = await videoCache.getFrameAt({
		mediaId: element.mediaId,
		file: mediaAsset.file,
		time: mediaTimeToSeconds({ time: roundMediaTime({ time: sourceTimeTicks }) }),
	});
	if (!frame) {
		return { success: false, error: "Failed to capture the current frame" };
	}

	let blob: Blob;
	try {
		blob = await canvasToBlob({ canvas: frame.canvas });
	} catch {
		return { success: false, error: "Failed to encode the captured frame" };
	}

	const file = new File([blob], `${element.name || "freeze"}-frame.png`, {
		type: "image/png",
	});
	const [processedAsset] = await processMediaAssets({ files: [file] });
	if (!processedAsset) {
		return { success: false, error: "Failed to create the freeze frame asset" };
	}

	const activeProject = editor.project.getActive();
	if (!activeProject) {
		return { success: false, error: "No active project" };
	}
	const storedAsset = await editor.media.addMediaAsset({
		projectId: activeProject.metadata.id,
		asset: processedAsset,
	});
	const assetId = storedAsset?.id ?? generateUUID();

	const freezeDuration = mediaTimeFromSeconds({
		seconds: FREEZE_FRAME_DURATION_SECONDS,
	});

	// Split the clip at the playhead, make room by shifting the right half and
	// everything after it, then drop the still image into the gap.
	editor.timeline.splitElements({
		elements: [{ trackId, elementId: element.id }],
		splitTime: playhead,
	});

	const track = editor.timeline.getTrackById({ trackId });
	if (track) {
		const toShift = track.elements.filter(
			(trackElement) => trackElement.startTime >= playhead,
		);
		editor.timeline.updateElements({
			updates: toShift.map((trackElement) => ({
				trackId,
				elementId: trackElement.id,
				patch: {
					startTime: addMediaTime({
						a: trackElement.startTime,
						b: freezeDuration,
					}),
				},
			})),
		});
	}

	const freezeElement = buildElementFromMedia({
		mediaId: assetId,
		mediaType: "image",
		name: `${element.name || "Freeze"} (freeze)`,
		duration: freezeDuration,
		startTime: playhead,
	});
	editor.timeline.insertElement({
		element: freezeElement,
		placement: { mode: "explicit", trackId },
	});

	return { success: true };
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __insertFreezeFrame?: typeof insertFreezeFrame }).__insertFreezeFrame =
		insertFreezeFrame;
}
