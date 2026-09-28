import type { ParseSubtitleResult, SubtitleCue } from "./types";

const TIMESTAMP_SEPARATOR = /\s*-->\s*/;
const TIMESTAMP_PATTERN =
	/^(\d{2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3})/;

export function parseSrt({ input }: { input: string }): ParseSubtitleResult {
	const normalized = input.replace(/\r\n?/g, "\n").trim();
	if (!normalized) {
		return {
			captions: [],
			skippedCueCount: 0,
			warnings: [],
		};
	}

	const blocks = normalized.split(/\n{2,}/);
	const cues: SubtitleCue[] = [];
	let skippedCueCount = 0;

	for (const block of blocks) {
		const lines = block
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length < 2) {
			skippedCueCount += 1;
			continue;
		}

		const timestampIndex = TIMESTAMP_SEPARATOR.test(lines[0]) ? 0 : 1;
		const timestampLine = lines[timestampIndex];
		if (!timestampLine || !TIMESTAMP_PATTERN.test(timestampLine)) {
			skippedCueCount += 1;
			continue;
		}

		const textLines = lines.slice(timestampIndex + 1);
		const text = textLines.join("\n").trim();
		if (!text) {
			skippedCueCount += 1;
			continue;
		}

		const [rawStart, rawEnd] = timestampLine.split(TIMESTAMP_SEPARATOR);
		if (!rawStart || !rawEnd) {
			skippedCueCount += 1;
			continue;
		}

		const startTime = parseSrtTimestamp({ input: rawStart });
		const endTime = parseSrtTimestamp({ input: rawEnd });
		const duration = endTime - startTime;

		if (
			!Number.isFinite(startTime) ||
			!Number.isFinite(endTime) ||
			duration <= 0
		) {
			skippedCueCount += 1;
			continue;
		}

		cues.push({
			text,
			startTime,
			duration,
		});
	}

	return {
		captions: cues,
		skippedCueCount,
		warnings: [],
	};
}

function parseSrtTimestamp({ input }: { input: string }): number {
	const normalized = input.trim().replace(",", ".");
	const match = normalized.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
	if (!match) {
		return Number.NaN;
	}

	const [, hours, minutes, seconds, milliseconds] = match;
	const parsedHours = Number.parseInt(hours, 10);
	const parsedMinutes = Number.parseInt(minutes, 10);
	const parsedSeconds = Number.parseInt(seconds, 10);
	const parsedMilliseconds = Number.parseInt(milliseconds.padEnd(3, "0"), 10);

	return (
		parsedHours * 3600 +
		parsedMinutes * 60 +
		parsedSeconds +
		parsedMilliseconds / 1000
	);
}

function formatSrtTimestamp({ seconds }: { seconds: number }): string {
	const clamped = Math.max(0, seconds);
	const hours = Math.floor(clamped / 3600);
	const minutes = Math.floor((clamped % 3600) / 60);
	const wholeSeconds = Math.floor(clamped % 60);
	const milliseconds = Math.round((clamped - Math.floor(clamped)) * 1000);
	const pad = (value: number, length = 2) =>
		String(value).padStart(length, "0");
	return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${pad(milliseconds, 3)}`;
}

export interface SrtCue {
	text: string;
	startTimeSeconds: number;
	durationSeconds: number;
}

/** Serializes cues into an SRT document. */
export function buildSrt({ cues }: { cues: SrtCue[] }): string {
	return cues
		.map((cue, index) => {
			const start = formatSrtTimestamp({ seconds: cue.startTimeSeconds });
			const end = formatSrtTimestamp({
				seconds: cue.startTimeSeconds + cue.durationSeconds,
			});
			return `${index + 1}\n${start} --> ${end}\n${cue.text}`;
		})
		.join("\n\n")
		.concat(cues.length > 0 ? "\n" : "");
}
