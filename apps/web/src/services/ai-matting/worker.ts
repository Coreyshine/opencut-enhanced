import { pipeline, RawImage } from "@huggingface/transformers";

export type MattingWorkerMessage =
	| { type: "init" }
	| {
			type: "segment";
			requestId: number;
			bitmap: ImageBitmap;
	  };

export type MattingWorkerResponse =
	| { type: "init-progress"; progress: number }
	| { type: "init-complete" }
	| { type: "init-error"; error: string }
	| {
			type: "segment-complete";
			requestId: number;
			mask: Uint8Array;
			width: number;
			height: number;
	  }
	| { type: "segment-error"; requestId: number; error: string };

const MODEL_ID = "briaai/RMBG-1.4";

let segmenter: Awaited<ReturnType<typeof makePipeline>> | null = null;
let initStarted = false;

function makePipeline() {
	return pipeline("image-segmentation", MODEL_ID, {
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
			self.postMessage({
				type: "init-progress",
				progress: Math.floor((loaded / total) * 100),
			} satisfies MattingWorkerResponse);
		},
	});
}

self.onmessage = async (event: MessageEvent<MattingWorkerMessage>) => {
	const message = event.data;
	switch (message.type) {
		case "init":
			await handleInit();
			break;
		case "segment":
			await handleSegment({
				requestId: message.requestId,
				bitmap: message.bitmap,
			});
			break;
	}
};

async function handleInit() {
	if (segmenter) {
		self.postMessage({ type: "init-complete" } satisfies MattingWorkerResponse);
		return;
	}
	if (initStarted) return;
	initStarted = true;
	try {
		segmenter = await makePipeline();
		self.postMessage({ type: "init-complete" } satisfies MattingWorkerResponse);
	} catch (error) {
		initStarted = false;
		self.postMessage({
			type: "init-error",
			error: error instanceof Error ? error.message : "Failed to load RMBG model",
		} satisfies MattingWorkerResponse);
	}
}

	async function handleSegment({
	requestId,
	bitmap,
}: {
	requestId: number;
	bitmap: ImageBitmap;
}) {
	try {
		if (!segmenter) throw new Error("RMBG model not initialized");

		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const canvasCtx = canvas.getContext("2d");
		if (!canvasCtx) throw new Error("No 2D context");
		canvasCtx.drawImage(bitmap, 0, 0);
		const blob = await canvas.convertToBlob({ type: "image/png" });
		const image = await RawImage.fromBlob(blob);

		const results = (await (
			segmenter as unknown as (
				image: RawImage,
			) => Promise<Array<{ mask?: RawImage }>>
		)(image)) as Array<{ mask?: RawImage }>;

		const maskRaw = results[0]?.mask;
		if (!maskRaw) throw new Error("Segmentation produced no mask");

		// Extract the mask intensity (red channel of the mask canvas).
		const maskCanvas = new OffscreenCanvas(maskRaw.width, maskRaw.height);
		const maskCtx = maskCanvas.getContext("2d");
		if (!maskCtx) throw new Error("No 2D context");
		maskCtx.drawImage(maskRaw.toCanvas(), 0, 0);
		const pixels = maskCtx.getImageData(
			0,
			0,
			maskRaw.width,
			maskRaw.height,
		);
		const mask = new Uint8Array(maskRaw.width * maskRaw.height);
		for (let i = 0; i < mask.length; i++) {
			mask[i] = pixels.data[i * 4];
		}

		bitmap.close();
		self.postMessage(
			{
				type: "segment-complete",
				requestId,
				mask,
				width: maskRaw.width,
				height: maskRaw.height,
			} satisfies MattingWorkerResponse,
			{ transfer: [mask.buffer] },
		);
	} catch (error) {
		bitmap.close();
		self.postMessage({
			type: "segment-error",
			requestId,
			error: error instanceof Error ? error.message : "Segmentation failed",
		} satisfies MattingWorkerResponse);
	}
}
