import type { EditorCore } from "@/core";
import { inpaintDiffusion } from "./inpaint-diffusion";
import { processMediaAssets } from "./processing";

export interface WatermarkRemovalResult {
	success: boolean;
	name?: string;
	assetId?: string;
	error?: string;
}

export interface MaskStroke {
	/** Normalized coordinates (0..1 relative to image size). */
	points: Array<{ x: number; y: number }>;
	size: number;
}

/**
 * Builds a binary mask canvas from brush strokes.
 */
export function buildMaskCanvas({
	strokes,
	width,
	height,
}: {
	strokes: MaskStroke[];
	width: number;
	height: number;
}): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);
	ctx.strokeStyle = "white";
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	for (const stroke of strokes) {
		ctx.lineWidth = stroke.size * width;
		ctx.beginPath();
		for (let i = 0; i < stroke.points.length; i++) {
			const px = stroke.points[i].x * width;
			const py = stroke.points[i].y * height;
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}
		if (stroke.points.length === 1) {
			// Single click = dot
			const p = stroke.points[0];
			ctx.arc(p.x * width, p.y * height, (stroke.size * width) / 2, 0, 6.2831853);
			ctx.fill();
		} else {
			ctx.stroke();
		}
	}

	return canvas;
}

/**
 * Full watermark removal pipeline:
 * 1. Draw image to canvas
 * 2. Build mask from brush strokes
 * 3. Run diffusion inpainting on masked pixels
 * 4. Save result as new PNG asset
 */
export async function removeWatermarkFromImage({
	editor,
	projectId,
	file,
	name,
	strokes,
}: {
	editor: EditorCore;
	projectId: string;
	file: File;
	name: string;
	strokes: MaskStroke[];
}): Promise<WatermarkRemovalResult> {
	try {
		// Decode image
		const bitmap = await createImageBitmap(file);
		const width = bitmap.width;
		const height = bitmap.height;

		// Draw to canvas
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return { success: false, error: "Canvas context failed" };
		ctx.drawImage(bitmap, 0, 0);
		const imageData = ctx.getImageData(0, 0, width, height);

		// Build mask from strokes
		const maskCanvas = buildMaskCanvas({ strokes, width, height });
		const maskCtx = maskCanvas.getContext("2d");
		if (!maskCtx) return { success: false, error: "Mask context failed" };
		const maskData = maskCtx.getImageData(0, 0, width, height);

		const mask = new Uint8Array(width * height);
		let maskedCount = 0;
		for (let i = 0; i < mask.length; i++) {
			mask[i] = maskData.data[i * 4] > 128 ? 1 : 0;
			if (mask[i]) maskedCount++;
		}
		if (maskedCount === 0) {
			return { success: false, error: "Paint over the watermark area first" };
		}

		// Run diffusion inpainting
		inpaintDiffusion({
			rgba: imageData.data,
			mask,
			width,
			height,
			iterations: 30,
		});

		// Save result
		ctx.putImageData(imageData, 0, 0);
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob((b) => resolve(b), "image/png"),
		);
		if (!blob) return { success: false, error: "Failed to encode result" };

		const pngFile = new File(
			[blob],
			`${name.replace(/\.[^.]+$/, "")} (cleaned).png`,
			{ type: "image/png" },
		);
		const [asset] = await processMediaAssets({ files: [pngFile] });
		if (!asset) return { success: false, error: "Failed to store cleaned image" };

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
			error:
				error instanceof Error ? error.message : "Watermark removal failed",
		};
	}
}
