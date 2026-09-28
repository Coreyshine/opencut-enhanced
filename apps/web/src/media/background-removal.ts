import type { EditorCore } from "@/core";
import { backgroundRemovalService } from "@/services/background-removal/service";
import { processMediaAssets } from "@/media/processing";

export interface BackgroundRemovalResult {
	success: boolean;
	name?: string;
	assetId?: string;
	error?: string;
}

/**
 * Removes the background from an image entirely in-browser (RMBG-1.4 via
 * transformers.js) and stores the cutout as a new PNG asset.
 */
export async function removeImageBackground({
	editor,
	projectId,
	file,
	name,
}: {
	editor: EditorCore;
	projectId: string;
	file: File;
	name: string;
}): Promise<BackgroundRemovalResult> {
	try {
		const pngBlob = await backgroundRemovalService.removeBackground({ file });
		const pngFile = new File(
			[pngBlob],
			`${name.replace(/\.[^.]+$/, "")} (cutout).png`,
			{ type: "image/png" },
		);
		const [asset] = await processMediaAssets({ files: [pngFile] });
		if (!asset) {
			return { success: false, error: "Failed to store the cutout" };
		}
		const stored = await editor.media.addMediaAsset({
			projectId,
			asset,
		});
		return {
			success: true,
			name: pngFile.name,
			assetId: stored?.id,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Background removal failed",
		};
	}
}
