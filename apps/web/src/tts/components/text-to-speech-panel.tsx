"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditor } from "@/editor/use-editor";
import {
	DEFAULT_TTS_VOICE,
	TTS_VOICES,
	encodeWavBlob,
	ttsService,
} from "@/services/tts/service";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { useT } from "@/i18n";

export function TextToSpeechPanel() {
	const editor = useEditor();
	const [text, setText] = useState("");
	const [voiceId, setVoiceId] = useState(DEFAULT_TTS_VOICE);
	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState<{ phase: string; progress: number } | null>(
		null,
	);
	const { t } = useT();

	const generate = async () => {
		const trimmed = text.trim();
		if (!trimmed) {
			toast.error(t("Enter some text first"));
			return;
		}
		setIsGenerating(true);
		try {
			const output = await ttsService.synthesize({
				text: trimmed,
				voiceId,
				onProgress: (progress) => setProgress(progress),
			});

			const wavBlob = encodeWavBlob({
				samples: output.audio,
				sampleRate: output.samplingRate,
			});
			const file = new File(
				[wavBlob],
				`TTS ${trimmed.slice(0, 24)}${trimmed.length > 24 ? "…" : ""}.wav`,
				{ type: "audio/wav" },
			);
			const [asset] = await processMediaAssets({ files: [file] });
			if (!asset) throw new Error("Failed to process generated speech");

			const activeProject = editor.project.getActive();
			if (!activeProject) throw new Error("No active project");
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset,
			});
			const mediaId = stored?.id ?? crypto.randomUUID();

			const durationSeconds =
				output.audio.length / output.samplingRate || 1;
			const element = buildElementFromMedia({
				mediaId,
				mediaType: "audio",
				name: `TTS: ${trimmed.slice(0, 24)}`,
				duration: mediaTimeFromSeconds({ seconds: durationSeconds }),
				startTime: editor.playback.getCurrentTime(),
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto", trackType: "audio" },
			});
			toast.success(t("Speech added at the playhead"));
			setText("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Speech synthesis failed",
			);
		} finally {
			setIsGenerating(false);
			setProgress(null);
		}
	};

	const progressLabel = progress
		? progress.phase === "loading-model"
			? `${t("Loading voice model…")} ${progress.progress}%`
			: t("Synthesizing…")
		: null;

	return (
		<div className="flex flex-col gap-2.5 rounded-md border border-border/60 p-3">
			<p className="text-sm font-medium">{t("Text to speech")}</p>
			<textarea
				value={text}
				onChange={(event) => setText(event.target.value)}
				placeholder={t("Type narration text…")}
				rows={3}
				className={cn(
					"w-full resize-none rounded-md border border-border/60 bg-transparent p-2 text-sm",
					"placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
				)}
				disabled={isGenerating}
			/>
			<div className="flex items-center gap-2">
				<Select
					value={voiceId}
					onValueChange={setVoiceId}
					disabled={isGenerating}
				>
					<SelectTrigger className="h-9 flex-1">
						<SelectValue placeholder={t("Voice")} />
					</SelectTrigger>
					<SelectContent>
						{TTS_VOICES.map((voice) => (
							<SelectItem key={voice.id} value={voice.id}>
								{t(voice.language)} · {voice.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					size="sm"
					onClick={() => void generate()}
					disabled={isGenerating || !text.trim()}
				>
					{isGenerating ? t("Generating…") : t("Generate")}
				</Button>
			</div>
			{progressLabel && (
				<p className="text-xs text-muted-foreground">{progressLabel}</p>
			)}
			<p className="text-xs text-muted-foreground">
				{t(
					"Generates speech locally in your browser and inserts it at the playhead.",
				)}
			</p>
		</div>
	);
}
