import { toast } from "sonner";
import type { EditorCore } from "@/core";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { showMediaUploadToast } from "@/media/upload-toast";

const DEFAULT_IMAGE_DURATION_SECONDS = 5;

/**
 * Imports local files (from the file or folder picker) into the project media
 * library and places them on the timeline at the playhead — CapCut-style
 * import for the sounds / stock panels.
 */
export async function importLocalFilesToTimeline({
	editor,
	files,
}: {
	editor: EditorCore;
	files: File[];
}): Promise<{ imported: number }> {
	if (files.length === 0) return { imported: 0 };

	const activeProject = editor.project.getActive();
	if (!activeProject) {
		toast.error("No active project");
		return { imported: 0 };
	}

	let imported = 0;
	await showMediaUploadToast({
		filesCount: files.length,
		promise: async () => {
			const processedAssets = await processMediaAssets({ files });
			const currentTime = editor.playback.getCurrentTime();

			for (const asset of processedAssets) {
				const stored = await editor.media.addMediaAsset({
					projectId: activeProject.metadata.id,
					asset,
				});
				const mediaId = stored?.id ?? crypto.randomUUID();

				const durationSeconds =
					asset.type === "video" || asset.type === "audio"
						? (asset.duration ?? DEFAULT_IMAGE_DURATION_SECONDS)
						: DEFAULT_IMAGE_DURATION_SECONDS;

				const element = buildElementFromMedia({
					mediaId,
					mediaType: asset.type,
					name: asset.name,
					duration: mediaTimeFromSeconds({
						seconds: Math.max(0.1, durationSeconds),
					}),
					startTime: currentTime,
				});

				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});
				imported += 1;
				}

			return {
				uploadedCount: processedAssets.length,
				assetNames: processedAssets.map((asset) => asset.name),
			};
		},
	});

	return { imported };
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __importLocalFiles?: typeof importLocalFilesToTimeline }).__importLocalFiles =
		importLocalFilesToTimeline;
}
