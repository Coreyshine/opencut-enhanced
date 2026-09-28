import {
	pipeline,
	RawImage,
	env,
} from "@huggingface/transformers";

export type BackgroundRemovalWorkerMessage =
	| { type: "init" }
	| {
			type: "remove-background";
			requestId: number;
			imageBitmap: ImageBitmap;
	  };

export type BackgroundRemovalWorkerResponse =
	| { type: "init-progress"; progress: number }
	| { type: "init-complete" }
	| { type: "init-error"; error: string }
	| {
			type: "complete";
			requestId: number;
			rgba: Uint8ClampedArray;
			width: number;
			height: number;
	  }
	| { type: "error"; requestId: number; error: string };

const MODEL_ID = "briaai/RMBG-1.4";

let segmenter: unknown = null;
let initStarted = false;

// Models come from the HF hub (cached by the browser); no local fallback.
env.allowLocalModels = false;

self.onmessage = async (
	event: MessageEvent<BackgroundRemovalWorkerMessage>,
) => {
	const message = event.data;
	switch (message.type) {
		case "init":
			await ensureModel();
			break;
		case "remove-background":
			await handleRemoveBackground({
				requestId: message.requestId,
				imageBitmap: message.imageBitmap,
			});
			break;
	}
};

async function ensureModel(): Promise<void> {
	if (segmenter || initStarted) {
		if (segmenter) {
			self.postMessage({ type: "init-complete" } satisfies BackgroundRemovalWorkerResponse);
		}
		return;
	}
	initStarted = true;

	try {
		segmenter = await pipeline("image-segmentation", MODEL_ID, {
			progress_callback: (progressInfo: {
				status?: string;
				file?: string;
				loaded?: number;
				total?: number;
			}) => {
				if (progressInfo.status !== "progress") return;
				const loaded = progressInfo.loaded ?? 0;
				const total = progressInfo.total ?? 0;
				if (total <= 0) return;
				const rounded = Math.floor((loaded / total) * 100);
				self.postMessage({
					type: "init-progress",
					progress: rounded,
				} satisfies BackgroundRemovalWorkerResponse);
			},
		});
		self.postMessage({ type: "init-complete" } satisfies BackgroundRemovalWorkerResponse);
	} catch (error) {
		initStarted = false;
		self.postMessage({
			type: "init-error",
			error: error instanceof Error ? error.message : "Failed to load model",
		} satisfies BackgroundRemovalWorkerResponse);
	}
}

async function handleRemoveBackground({
	requestId,
	imageBitmap,
}: {
	requestId: number;
	imageBitmap: ImageBitmap;
}) {
	try {
		await ensureModel();

		const image = await RawImage.fromBlob(
			await createImageBitmapToBlob(imageBitmap),
		);

		const result = (await (
			segmenter as {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(image: RawImage): Promise<Array<{ mask?: RawImage; label?: string; score?: number }>>;
			}
		)(image)) as Array<{ mask?: RawImage }>;

		const mask = result[0]?.mask;
		if (!mask) {
			throw new Error("Segmentation produced no mask");
		}

		// Composite: original pixels × mask alpha.
		const width = imageBitmap.width;
		const height = imageBitmap.height;
		const sourceCanvas = new OffscreenCanvas(width, height);
		const sourceCtx = sourceCanvas.getContext("2d");
		if (!sourceCtx) throw new Error("No 2D context");
		sourceCtx.drawImage(imageBitmap, 0, 0);
		const sourceData = sourceCtx.getImageData(0, 0, width, height);

		const maskCanvas = new OffscreenCanvas(mask.width, mask.height);
		const maskCtx = maskCanvas.getContext("2d");
		if (!maskCtx) throw new Error("No 2D context");
		maskCtx.drawImage(mask.toCanvas(), 0, 0);
		const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);

		const output = new ImageData(width, height);
		for (let y = 0; y < height; y++) {
			const maskY = Math.min(mask.height - 1, y);
			for (let x = 0; x < width; x++) {
				const maskX = Math.min(mask.width - 1, x);
				const maskIndex = (maskY * mask.width + maskX) * 4;
				const alpha = maskData.data[maskIndex] / 255;
				const outIndex = (y * width + x) * 4;
				output.data[outIndex] = sourceData.data[outIndex];
				output.data[outIndex + 1] = sourceData.data[outIndex + 1];
				output.data[outIndex + 2] = sourceData.data[outIndex + 2];
				output.data[outIndex + 3] = sourceData.data[outIndex + 3] * alpha;
			}
		}

		self.postMessage(
			{
				type: "complete",
				requestId,
				rgba: output.data,
				width,
				height,
			} satisfies BackgroundRemovalWorkerResponse,
			{ transfer: [output.data.buffer] },
		);
	} catch (error) {
		self.postMessage({
			type: "error",
			requestId,
			error: error instanceof Error ? error.message : "Background removal failed",
		} satisfies BackgroundRemovalWorkerResponse);
	}
}

async function createImageBitmapToBlob(
	bitmap: ImageBitmap,
): Promise<Blob> {
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No 2D context");
	ctx.drawImage(bitmap, 0, 0);
	return canvas.convertToBlob({ type: "image/png" });
}
