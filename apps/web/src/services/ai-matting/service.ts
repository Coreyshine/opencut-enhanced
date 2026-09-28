/**
 * Real-time AI matting for video clips.
 * Runs RMBG-1.4 in a dedicated worker at reduced resolution (320×320) to
 * produce per-frame alpha masks. Masks are cached per clip by frame time so
 * playback doesn't re-segment every render pass — only new frame times
 * trigger inference.
 *
 * Non-blocking: returns the nearest cached mask immediately; new
 * segmentations run in background and appear on the next render pass.
 */

import type { MattingWorkerMessage, MattingWorkerResponse } from "./worker";

const SEG_SIZE = 320;
const CACHE_MAX = 120; // ~4s at 30fps

interface MaskEntry {
	mask: Uint8Array; // alpha per pixel (0–255)
	width: number;
	height: number;
}

class AIMattingService {
	private worker: Worker | null = null;
	private initPromise: Promise<void> | null = null;
	private cache = new Map<string, Map<number, MaskEntry>>();
	private pending = new Map<
		string,
		Array<{ frameTime: number; resolve: (mask: MaskEntry | null) => void }>
	>();
	private listeners = new Set<() => void>();
	private nextRequestId = 1;

	/** Fires whenever a new mask lands, so previews can re-render. */
	onMaskReady(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyMaskReady() {
		for (const listener of this.listeners) listener();
	}

	getOrRequest({
		clipId,
		frameTime,
		frameSource,
	}: {
		clipId: string;
		frameTime: number;
		frameSource: CanvasImageSource & { width: number; height: number };
	}): MaskEntry | null {
		// Find nearest cached mask within 0.3s.
		const clipCache = this.cache.get(clipId);
		if (clipCache) {
			let best: MaskEntry | null = null;
			let bestDist = Infinity;
			for (const [t, entry] of clipCache) {
				const d = Math.abs(t - frameTime);
				if (d < bestDist) {
					bestDist = d;
					best = entry;
				}
			}
			if (bestDist <= 0.3) return best;
		}

		// Not cached — request segmentation (fire-and-forget).
		const key = `${clipId}:${frameTime.toFixed(2)}`;
		if (this.pending.has(key)) return null;

		const bitmap = document.createElement("canvas");
		bitmap.width = SEG_SIZE;
		bitmap.height = SEG_SIZE;
		const ctx = bitmap.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(frameSource, 0, 0, SEG_SIZE, SEG_SIZE);

		const promise = new Promise<MaskEntry | null>((resolve) => {
			this.pending.set(key, [
				...(this.pending.get(key) ?? []),
				{ frameTime, resolve },
			]);
		});

		this.ensureWorker()
			.then(() => {
				if (!this.worker) throw new Error("Matting worker unavailable");
				// Render into an ImageBitmap for zero-copy transfer.
				return createImageBitmap(bitmap);
			})
			.then((imageBitmap) => {
				if (!this.worker) throw new Error("Matting worker unavailable");
				const message: MattingWorkerMessage = {
					type: "segment",
					requestId: this.nextRequestId++,
					bitmap: imageBitmap,
				};
				// Keep a map from requestId → key for response routing.
				this.requestKeys.set(String(message.requestId), key);
				this.worker.postMessage(message, [imageBitmap]);
			})
			.catch(() => {
				this.resolvePending(key, null);
			});

		void promise;
		return null;
	}

	private requestKeys = new Map<string, string>();

	private resolvePending(key: string, mask: MaskEntry | null) {
		const waiters = this.pending.get(key);
		this.pending.delete(key);
		if (!waiters) return;
		for (const { frameTime, resolve } of waiters) resolve(mask);
	}

	private storeMask({
		key,
		mask,
		width,
		height,
	}: {
		key: string;
		mask: Uint8Array;
		width: number;
		height: number;
	}) {
		const clipId = key.slice(0, key.lastIndexOf(":"));
		const frameTime = Number.parseFloat(key.slice(key.lastIndexOf(":") + 1));
		let clipCache = this.cache.get(clipId);
		if (!clipCache) {
			clipCache = new Map();
			this.cache.set(clipId, clipCache);
		}
		clipCache.set(frameTime, { mask, width, height });
		this.notifyMaskReady();

		// LRU eviction.
		if (clipCache.size > CACHE_MAX) {
			const oldest = clipCache.keys().next().value;
			if (oldest !== undefined) clipCache.delete(oldest);
		}
	}

	private ensureWorker(): Promise<void> {
		if (this.worker && this.initPromise) return this.initPromise;

		this.initPromise = new Promise<void>((resolve, reject) => {
			if (!this.worker) {
				this.worker = new Worker(
					new URL("./worker.ts", import.meta.url),
					{ type: "module" },
				);
				this.worker.addEventListener(
					"message",
					(event: MessageEvent<MattingWorkerResponse>) => {
						const response = event.data;
						switch (response.type) {
							case "init-complete":
								resolve();
								break;
							case "init-error":
								reject(new Error(response.error));
								break;
							case "segment-complete": {
								const key = this.requestKeys.get(String(response.requestId));
								this.requestKeys.delete(String(response.requestId));
								if (key) {
									this.storeMask({
										key,
										mask: response.mask,
										width: response.width,
										height: response.height,
									});
									this.resolvePending(key, {
										mask: response.mask,
										width: response.width,
										height: response.height,
									});
								}
								break;
							}
							case "segment-error": {
								const key = this.requestKeys.get(String(response.requestId));
								this.requestKeys.delete(String(response.requestId));
								if (key) this.resolvePending(key, null);
								break;
							}
						}
					},
				);
			}
			this.worker.postMessage({ type: "init" } satisfies MattingWorkerMessage);
		});

		this.initPromise = this.initPromise.catch((error) => {
			this.worker?.terminate();
			this.worker = null;
			this.initPromise = null;
			throw error;
		});

		return this.initPromise;
	}

	get isReady() {
		return this.worker !== null;
	}

	preload(): Promise<void> {
		return this.ensureWorker();
	}
}

export const aiMattingService = new AIMattingService();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __aiMatting?: AIMattingService }).__aiMatting =
		aiMattingService;
}
