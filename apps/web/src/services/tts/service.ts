import type { TtsWorkerMessage, TtsWorkerResponse } from "./worker";

export interface TtsVoice {
	id: string;
	/** i18n dictionary key for the language name. */
	language: string;
	/** Romanized speaker label, shown as-is. */
	label: string;
}

/** Kokoro-82M v1.1-zh voices (single shared model; voice switching is instant). */
export const TTS_VOICES: TtsVoice[] = [
	{ id: "zf_001", language: "Chinese", label: "女声 01" },
	{ id: "zf_002", language: "Chinese", label: "女声 02" },
	{ id: "zf_003", language: "Chinese", label: "女声 03" },
	{ id: "zm_009", language: "Chinese", label: "男声 01" },
	{ id: "zm_010", language: "Chinese", label: "男声 02" },
	{ id: "zm_011", language: "Chinese", label: "男声 03" },
	{ id: "af_maple", language: "English", label: "Maple (female)" },
	{ id: "af_sol", language: "English", label: "Sol (female)" },
	{ id: "bf_vale", language: "English (UK)", label: "Vale (female)" },
];

export const DEFAULT_TTS_VOICE = "zf_001";

export interface TtsProgress {
	phase: "loading-model" | "synthesizing";
	progress: number;
}

type ProgressCallback = (progress: TtsProgress) => void;

class TextToSpeechService {
	private worker: Worker | null = null;
	private initPromise: Promise<void> | null = null;

	async synthesize({
		text,
		voiceId = DEFAULT_TTS_VOICE,
		onProgress,
	}: {
		text: string;
		voiceId?: string;
		onProgress?: ProgressCallback;
	}): Promise<{ audio: Float32Array; samplingRate: number }> {
		await this.ensureWorker({ onProgress });

		return new Promise((resolve, reject) => {
			if (!this.worker) {
				reject(new Error("TTS worker not initialized"));
				return;
			}

			const requestId = Date.now();
			const voice =
				TTS_VOICES.find((candidate) => candidate.id === voiceId)?.id ??
				DEFAULT_TTS_VOICE;
			const handleMessage = (event: MessageEvent<TtsWorkerResponse>) => {
				const response = event.data;
				if (
					(response.type === "synthesize-complete" ||
						response.type === "synthesize-error") &&
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
					case "synthesize-complete":
						this.worker?.removeEventListener("message", handleMessage);
						resolve({
							audio: response.audio,
							samplingRate: response.samplingRate,
						});
						break;
					case "synthesize-error":
						this.worker?.removeEventListener("message", handleMessage);
						reject(new Error(response.error));
						break;
				}
			};

			this.worker.addEventListener("message", handleMessage);
			const message: TtsWorkerMessage = {
				type: "synthesize",
				text,
				voice,
				requestId,
			};
			this.worker.postMessage(message);
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
			if (this.worker) {
				this.worker.terminate();
				this.worker = null;
			}

			this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
				type: "module",
			});

			await new Promise<void>((resolve, reject) => {
				if (!this.worker) {
					reject(new Error("Failed to start TTS worker"));
					return;
				}

				let initSettled = false;
				const handleMessage = (event: MessageEvent<TtsWorkerResponse>) => {
					switch (event.data.type) {
						case "init-progress":
							onProgress?.({
								phase: "loading-model",
								progress: event.data.progress,
							});
							break;
						case "init-complete":
							if (!initSettled) {
								initSettled = true;
								this.worker?.removeEventListener("message", handleMessage);
								resolve();
							}
							break;
						case "init-error":
							if (!initSettled) {
								initSettled = true;
								this.worker?.removeEventListener("message", handleMessage);
								reject(new Error(event.data.error));
							}
							break;
					}
				};
				this.worker.addEventListener("message", handleMessage);

				const message: TtsWorkerMessage = { type: "init" };
				this.worker.postMessage(message);
			});
		})();

		this.initPromise = this.initPromise.catch((error) => {
			this.worker?.terminate();
			this.worker = null;
			this.initPromise = null;
			throw error;
		});

		return this.initPromise;
	}
}

export const ttsService = new TextToSpeechService();

/** Encodes mono float samples into a WAV blob. */
export function encodeWavBlob({
	samples,
	sampleRate,
}: {
	samples: Float32Array;
	sampleRate: number;
}): Blob {
	const buffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);

	const writeString = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i++) {
			view.setUint8(offset + i, value.charCodeAt(i));
		}
	};

	writeString(0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeString(36, "data");
	view.setUint32(40, samples.length * 2, true);

	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const raw = samples[i];
		// NaN samples would clamp to NaN and encode as silence; zero them out.
		const sample = Number.isNaN(raw) ? 0 : Math.max(-1, Math.min(1, raw));
		view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
		offset += 2;
	}

	return new Blob([buffer], { type: "audio/wav" });
}
