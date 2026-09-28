"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/editor/use-editor";
import {
	VoiceoverRecorder,
	recordingToAsset,
} from "@/media/voiceover";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { useT } from "@/i18n";
import { toast } from "sonner";
import { MicIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function VoiceoverRecorderPanel() {
	const editor = useEditor();
	const { t } = useT();
	const recorderRef = useRef<VoiceoverRecorder | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		if (!isRecording) return;
		const interval = window.setInterval(() => {
			setElapsed(recorderRef.current?.elapsedSeconds ?? 0);
		}, 200);
		return () => window.clearInterval(interval);
	}, [isRecording]);

	const startRecording = async () => {
		try {
			recorderRef.current = recorderRef.current ?? new VoiceoverRecorder();
			await recorderRef.current.start();
			setElapsed(0);
			setIsRecording(true);
		} catch {
			toast.error("Microphone access was denied");
		}
	};

	const stopRecording = async ({ discard }: { discard?: boolean } = {}) => {
		const recorder = recorderRef.current;
		if (!recorder) return;
		setIsRecording(false);
		setIsProcessing(true);
		try {
			const blob = await recorder.stop();
			if (discard || !blob) {
				return;
			}
			const currentTime = editor.playback.getCurrentTime();
			const result = await recordingToAsset({
				editor,
				blob,
				name: `Voiceover ${new Date().toLocaleTimeString()}`,
			});
			if (!result.assetId) {
				toast.error("Failed to save the recording");
				return;
			}
			const duration = mediaTimeFromSeconds({
				seconds: Math.max(0.1, result.durationSeconds),
			});
			const element = buildElementFromMedia({
				mediaId: result.assetId,
				mediaType: "audio",
				name: t("Voiceover"),
				duration,
				startTime: currentTime,
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto", trackType: "audio" },
			});
			toast.success(t("Voiceover added at the playhead"));
		} finally {
			setIsProcessing(false);
			setElapsed(0);
		}
	};

	return (
		<div className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
			<div className="flex flex-col gap-0.5">
				<p className="text-sm font-medium">{t("Voiceover")}</p>
				<p className="text-xs text-muted-foreground">
					{isRecording
						? `${t("Recording…")} ${elapsed.toFixed(1)}s`
						: t("Record from your microphone")}
				</p>
			</div>
			<div className="flex items-center gap-1.5">
				{isRecording ? (
					<>
						<Button
							variant="outline"
							size="sm"
							disabled={isProcessing}
							onClick={() => void stopRecording({ discard: true })}
						>
							<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
							{t("Discard")}
						</Button>
						<Button
							variant="destructive"
							size="sm"
							disabled={isProcessing}
							onClick={() => void stopRecording()}
						>
							{t("Stop")}
						</Button>
					</>
				) : (
					<Button
						variant="default"
						size="sm"
						disabled={isProcessing}
						onClick={() => void startRecording()}
					>
						<HugeiconsIcon icon={MicIcon} className="size-4" />
						{t("Record")}
					</Button>
				)}
			</div>
		</div>
	);
}
