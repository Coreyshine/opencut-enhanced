import { KokoroTTS } from "@uzen/kokoro-js";

export type TtsWorkerMessage =
	| { type: "init" }
	| { type: "synthesize"; text: string; voice: string; requestId: number }
	| { type: "cancel" };

export type TtsWorkerResponse =
	| { type: "init-progress"; progress: number }
	| { type: "init-complete" }
	| { type: "init-error"; error: string }
	| {
			type: "synthesize-complete";
			requestId: number;
			audio: Float32Array;
			samplingRate: number;
	  }
	| { type: "synthesize-error"; requestId: number; error: string };

// Kokoro v1.1 Chinese build: Mandarin + mixed zh/en with the fork's built-in
// Chinese phonemizer (pinyin-pro based G2P, tone sandhi, normalization).
const MODEL_ID = "onnx-community/Kokoro-82M-v1.1-zh-ONNX";
// Voice .bin assets are fetched on demand from the open HF repo and cached
// by the browser HTTP cache (~256KB per voice).
const VOICE_PATH =
	"https://huggingface.co/onnx-community/Kokoro-82M-v1.1-zh-ONNX/resolve/main/voices";
// Kokoro caps phoneme input around 510 tokens; stay well under per chunk.
const MAX_CHUNK_LENGTH = 200;

// Some WebGPU + quantized combos emit silent/NaN audio on certain GPUs;
// fall back to progressively safer configurations when that happens.
const DEVICE_CONFIGS = [
	{ device: "webgpu", dtype: "q4f16" },
	{ device: "webgpu", dtype: "fp16" },
	{ device: "wasm", dtype: "fp32" },
] as const;

let configIndex = 0;

let tts: KokoroTTS | null = null;
let initStarted = false;
let lastReportedProgress = -1;
const fileBytes = new Map<string, { loaded: number; total: number }>();

self.onmessage = async (event: MessageEvent<TtsWorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "init":
			await handleInit();
			break;
		case "synthesize":
			await handleSynthesize({
				text: message.text,
				voice: message.voice,
				requestId: message.requestId,
			});
			break;
		case "cancel":
			break;
	}
};

async function handleInit() {
	if (tts) {
		self.postMessage({ type: "init-complete" } satisfies TtsWorkerResponse);
		return;
	}
	if (initStarted) return;
	initStarted = true;

	lastReportedProgress = -1;
	fileBytes.clear();

	try {
		const config = DEVICE_CONFIGS[configIndex];
		const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
		const device = config.device === "webgpu" && !hasWebGPU ? "wasm" : config.device;
		tts = await KokoroTTS.from_pretrained(MODEL_ID, {
			dtype: config.dtype,
			device,
			voicePath: VOICE_PATH,
			progress_callback: (progressInfo: {
				status?: string;
				file?: string;
				loaded?: number;
				total?: number;
			}) => {
				const file = progressInfo.file;
				if (!file) return;

				const loaded = progressInfo.loaded ?? 0;
				const total = progressInfo.total ?? 0;

				if (progressInfo.status === "progress" && total > 0) {
					fileBytes.set(file, { loaded, total });
				}

				let totalLoaded = 0;
				let totalSize = 0;
				for (const { loaded: l, total: t } of fileBytes.values()) {
					totalLoaded += l;
					totalSize += t;
				}

				if (totalSize === 0) return;

				const overallProgress = (totalLoaded / totalSize) * 100;
				const roundedProgress = Math.floor(overallProgress);

				if (roundedProgress !== lastReportedProgress) {
					lastReportedProgress = roundedProgress;
					self.postMessage({
						type: "init-progress",
						progress: roundedProgress,
					} satisfies TtsWorkerResponse);
				}
			},
		});
		self.postMessage({ type: "init-complete" } satisfies TtsWorkerResponse);
	} catch (error) {
		tts = null;
		initStarted = false;
		self.postMessage({
			type: "init-error",
			error: error instanceof Error ? error.message : "Failed to load TTS model",
		} satisfies TtsWorkerResponse);
	}
}

/** Detects all-zero / NaN waveforms produced by broken device+dtype combos. */
function isSilentOrNaN({ samples }: { samples: Float32Array }): boolean {
	let peak = 0;
	for (let i = 0; i < samples.length; i += 16) {
		const v = samples[i];
		if (Number.isNaN(v)) return true;
		peak = Math.max(peak, Math.abs(v));
	}
	return peak < 1e-4;
}

/** Reinitializes the model with the next (safer) device config. */
async function fallbackToNextConfig(): Promise<boolean> {
	if (configIndex >= DEVICE_CONFIGS.length - 1) return false;
	configIndex += 1;
	tts = null;
	initStarted = false;
	lastReportedProgress = -1;
	fileBytes.clear();
	await handleInit();
	return true;
}

/** Splits text into model-safe chunks on sentence boundaries. */
function splitIntoChunks({ text }: { text: string }): string[] {
	const chunks: string[] = [];
	let current = "";

	const pushCurrent = () => {
		const trimmed = current.trim();
		if (trimmed) chunks.push(trimmed);
		current = "";
	};

	for (const part of text.split(/(?<=[.!?。！？；;，,\n])\s*/)) {
		if (!part) continue;
		if (part.length > MAX_CHUNK_LENGTH) {
			pushCurrent();
			for (let i = 0; i < part.length; i += MAX_CHUNK_LENGTH) {
				const piece = part.slice(i, i + MAX_CHUNK_LENGTH).trim();
				if (piece) chunks.push(piece);
			}
			continue;
		}
		if (current.length + part.length > MAX_CHUNK_LENGTH) {
			pushCurrent();
		}
		current += part;
	}
	pushCurrent();

	return chunks.length > 0 ? chunks : [text];
}

async function handleSynthesize({
	text,
	voice,
	requestId,
}: {
	text: string;
	voice: string;
	requestId: number;
}) {
	if (!tts) {
		self.postMessage({
			type: "synthesize-error",
			requestId,
			error: "TTS model not initialized",
		} satisfies TtsWorkerResponse);
		return;
	}

	try {
		const chunks = splitIntoChunks({ text });
		let samplingRate = 24000;
		const synthesized: Float32Array[] = [];

		for (const chunk of chunks) {
			const output = await tts.generate(chunk, {
				voice: voice as "zf_001",
				speed: 1,
			});
			samplingRate = output.sampling_rate;
			// Add a short pause between chunks so sentences don't run together.
			const pause = new Float32Array(Math.floor(samplingRate * 0.12));
			const audioOut = Array.isArray(output.audio)
				? output.audio[0]
				: output.audio;
			synthesized.push(audioOut, pause);
		}
		// Drop the trailing pause.
		synthesized.pop();

		let length = 0;
		for (const part of synthesized) length += part.length;
		const merged = new Float32Array(length);
		let offset = 0;
		for (const part of synthesized) {
			merged.set(part, offset);
			offset += part.length;
		}

		// Broken device+dtype combos synthesize silence; retry on a safer one.
		if (isSilentOrNaN({ samples: merged })) {
			if (await fallbackToNextConfig()) {
				await handleSynthesize({ text, voice, requestId });
				return;
			}
			self.postMessage({
				type: "synthesize-error",
				requestId,
				error: "Speech synthesis produced silent audio",
			} satisfies TtsWorkerResponse);
			return;
		}

		self.postMessage(
			{
				type: "synthesize-complete",
				requestId,
				audio: merged,
				samplingRate,
			} satisfies TtsWorkerResponse,
			{ transfer: [merged.buffer] },
		);
	} catch (error) {
		self.postMessage({
			type: "synthesize-error",
			requestId,
			error: error instanceof Error ? error.message : "Speech synthesis failed",
		} satisfies TtsWorkerResponse);
	}
}
