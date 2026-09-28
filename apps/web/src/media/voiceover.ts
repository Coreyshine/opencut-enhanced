import type { EditorCore } from "@/core";
import { processMediaAssets } from "@/media/processing";

/**
 * Records a voiceover from the default microphone via MediaRecorder and
 * returns it as a processed media asset ready to insert on an audio track.
 */
export class VoiceoverRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private chunks: Blob[] = [];
	private startedAt = 0;

	get isRecording(): boolean {
		return this.mediaRecorder?.state === "recording";
	}

	get elapsedSeconds(): number {
		if (!this.isRecording) return 0;
		return (Date.now() - this.startedAt) / 1000;
	}

	async start(): Promise<void> {
		if (this.isRecording) {
			return;
		}
		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		this.chunks = [];
		this.mediaRecorder = new MediaRecorder(this.stream);
		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.chunks.push(event.data);
			}
		};
		this.startedAt = Date.now();
		this.mediaRecorder.start(250);
	}

	async stop(): Promise<Blob | null> {
		const recorder = this.mediaRecorder;
		if (!recorder || recorder.state === "inactive") {
			return null;
		}

		const stopped = new Promise<void>((resolve) => {
			recorder.onstop = () => resolve();
		});
		recorder.stop();
		await stopped;

		for (const track of this.stream?.getTracks() ?? []) {
			track.stop();
		}

		const mimeType = recorder.mimeType || "audio/webm";
		const blob = new Blob(this.chunks, { type: mimeType });
		this.mediaRecorder = null;
		this.stream = null;
		this.chunks = [];
		return blob.size > 0 ? blob : null;
	}
}

/** Records nothing; converts a finished recording into a timeline-ready asset. */
export async function recordingToAsset({
	editor,
	blob,
	name,
}: {
	editor: EditorCore;
	blob: Blob;
	name: string;
}): Promise<{ assetId: string | null; durationSeconds: number }> {
	const extension = blob.type.includes("mp4") ? "m4a" : "webm";
	const file = new File([blob], `${name}.${extension}`, {
		type: blob.type,
	});
	const [asset] = await processMediaAssets({ files: [file] });
	if (!asset) {
		return { assetId: null, durationSeconds: 0 };
	}

	const activeProject = editor.project.getActive();
	if (!activeProject) {
		return { assetId: null, durationSeconds: asset.duration ?? 0 };
	}

	const stored = await editor.media.addMediaAsset({
		projectId: activeProject.metadata.id,
		asset,
	});

	return {
		assetId: stored?.id ?? null,
		durationSeconds: asset.duration ?? 0,
	};
}
