import type {
	BackgroundRemovalWorkerMessage,
	BackgroundRemovalWorkerResponse,
} from "./worker";

type ProgressCallback = (progress: { phase: string; progress: number }) => void;

class BackgroundRemovalService {
	private worker: Worker | null = null;
	private initPromise: Promise<void> | null = null;
	private requestSeq = 0;

	/** Removes the background from an image file, returning a PNG blob with transparency. */
	async removeBackground({
		file,
		onProgress,
	}: {
		file: File;
		onProgress?: ProgressCallback;
	}): Promise<Blob> {
		await this.ensureWorker({ onProgress });

		const bitmap = await createImageBitmap(file);

		return new Promise((resolve, reject) => {
			if (!this.worker) {
				reject(new Error("Background removal worker not initialized"));
				return;
			}

			const requestId = ++this.requestSeq;
			const handleMessage = (event: MessageEvent<BackgroundRemovalWorkerResponse>) => {
				const response = event.data;
				if (
					(response.type === "complete" || response.type === "error") &&
					response.requestId !== requestId
				) {
					return;
				}

				switch (response.type) {
					case "init-progress":
						onProgress?.({
							phase: "loading-model",
							progress: response.progress,
						});
						break;
					case "complete": {
						this.worker?.removeEventListener("message", handleMessage);
						const canvas = new OffscreenCanvas(response.width, response.height);
						const ctx = canvas.getContext("2d");
						if (!ctx) {
							reject(new Error("No 2D context"));
							return;
						}
						ctx.putImageData(
							new ImageData(
								new Uint8ClampedArray(response.rgba),
								response.width,
								response.height,
							),
							0,
							0,
						);
						canvas
							.convertToBlob({ type: "image/png" })
							.then(resolve)
							.catch(reject);
						break;
					}
					case "error":
						this.worker?.removeEventListener("message", handleMessage);
						reject(new Error(response.error));
						break;
				}
			};

			this.worker.addEventListener("message", handleMessage);

			const message: BackgroundRemovalWorkerMessage = {
				type: "remove-background",
				requestId,
				imageBitmap: bitmap,
			};
			this.worker.postMessage(message, [bitmap]);
		});
	}

	private ensureWorker({
		onProgress,
	}: {
		onProgress?: ProgressCallback;
	}): Promise<void> {
		if (this.worker && this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			this.worker = new Worker(
				new URL("./worker.ts", import.meta.url),
				{ type: "module" },
			);

			await new Promise<void>((resolve, reject) => {
				if (!this.worker) {
					reject(new Error("Failed to start background removal worker"));
					return;
				}

				let settled = false;
				const handleMessage = (
					event: MessageEvent<BackgroundRemovalWorkerResponse>,
				) => {
					switch (event.data.type) {
						case "init-progress":
							onProgress?.({
								phase: "loading-model",
								progress: event.data.progress,
							});
							break;
						case "init-complete":
							if (!settled) {
								settled = true;
								this.worker?.removeEventListener("message", handleMessage);
								resolve();
							}
							break;
						case "init-error":
							if (!settled) {
								settled = true;
								this.worker?.removeEventListener("message", handleMessage);
								reject(new Error(event.data.error));
							}
							break;
					}
				};
				this.worker.addEventListener("message", handleMessage);

				const message: BackgroundRemovalWorkerMessage = { type: "init" };
				this.worker.postMessage(message);
			});
		})();

		this.initPromise = this.initPromise.catch((error) => {
			this.initPromise = null;
			throw error;
		});

		return this.initPromise;
	}
}

export const backgroundRemovalService = new BackgroundRemovalService();
