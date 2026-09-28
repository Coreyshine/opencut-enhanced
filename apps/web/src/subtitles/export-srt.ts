import type { EditorCore } from "@/core";
import type { TextElement } from "@/timeline";
import { mediaTimeToSeconds } from "@/wasm";
import { buildSrt } from "./srt";

/** Collects caption text elements (name "Caption …") sorted by start time. */
export function collectCaptionCues({ editor }: { editor: EditorCore }): Array<{
	text: string;
	startTimeSeconds: number;
	durationSeconds: number;
}> {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return [];

	const textTracks = scene.tracks.overlay.filter(
		(track) => track.type === "text",
	);
	const cues: Array<{
		text: string;
		startTimeSeconds: number;
		durationSeconds: number;
	}> = [];

	for (const track of textTracks) {
		for (const element of track.elements as TextElement[]) {
			if (!/^Caption\b/i.test(element.name)) {
				continue;
			}
			const content = element.params.content;
			if (typeof content !== "string" || content.trim().length === 0) {
				continue;
			}
			cues.push({
				text: content,
				startTimeSeconds: mediaTimeToSeconds({ time: element.startTime }),
				durationSeconds: mediaTimeToSeconds({ time: element.duration }),
			});
		}
	}

	return cues.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
}

export function buildProjectSrt({ editor }: { editor: EditorCore }): string {
	return buildSrt({ cues: collectCaptionCues({ editor }) });
}

export function downloadSrt({
	editor,
	filename,
}: {
	editor: EditorCore;
	filename: string;
}): number {
	const srt = buildProjectSrt({ editor });
	if (!srt) return 0;
	const blob = new Blob([srt], { type: "application/x-subrip" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename.endsWith(".srt") ? filename : `${filename}.srt`;
	anchor.click();
	URL.revokeObjectURL(url);
	return srt.split("\n\n").filter(Boolean).length;
}
