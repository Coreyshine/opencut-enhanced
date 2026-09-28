import type { ParamValues } from "@/params";
import { generateUUID } from "@/utils/id";
import { getT } from "@/i18n";
import { mediaTimeFromSeconds, type MediaTime } from "@/wasm";

/**
 * A declarative template: a set of text/graphic elements laid out relative
 * to the canvas, inserted at the playhead when applied. Media (video/audio)
 * is intentionally not part of templates — those stay user-driven.
 */
export interface TemplateElement {
	type: "text" | "graphic";
	definitionId?: string;
	name: string;
	/** Position of the element center, as a fraction of canvas size (0..1). */
	position: { x: number; y: number };
	durationSeconds: number;
	params: ParamValues;
	/** Baked entrance animation (scale/opacity keyframes). */
	animate?: "fade-in" | "zoom-in";
}

export interface EditorTemplate {
	id: string;
	name: string;
	description: string;
	builtin: boolean;
	elements: TemplateElement[];
}

const FONT_DEFAULTS = {
	fontFamily: "Arial",
	textAlign: "center" as const,
	fontWeight: "normal" as const,
	fontStyle: "normal" as const,
	textDecoration: "none" as const,
	letterSpacing: 0,
	lineHeight: 1.4,
};

function textElement({
	name,
	content,
	fontSize,
	color,
	position,
	durationSeconds,
	weight = "normal",
	letterSpacing = 0,
	fontStyle = "normal",
	background,
	animate,
	shadow,
}: {
	name: string;
	content: string;
	fontSize: number;
	color: string;
	position: { x: number; y: number };
	durationSeconds: number;
	weight?: "normal" | "bold";
	letterSpacing?: number;
	fontStyle?: "normal" | "italic";
	background?: { color: string; radius: number; paddingX: number; paddingY: number };
	animate?: "fade-in" | "zoom-in";
	shadow?: boolean;
}): TemplateElement {
	const params: ParamValues = {
		...FONT_DEFAULTS,
		content,
		fontSize,
		fontWeight: weight,
		color,
		letterSpacing,
		fontStyle,
	};
	if (background) {
		params["background.enabled"] = true;
		params["background.color"] = background.color;
		params["background.cornerRadius"] = background.radius;
		params["background.paddingX"] = background.paddingX;
		params["background.paddingY"] = background.paddingY;
	}
	if (shadow) {
		params["shadow.enabled"] = true;
		params["shadow.color"] = "#000000";
		params["shadow.blur"] = 6;
		params["shadow.offsetX"] = 0;
		params["shadow.offsetY"] = 3;
	}
	return {
		type: "text",
		name,
		position,
		durationSeconds,
		params,
		animate,
	};
}

export const BUILTIN_TEMPLATES: EditorTemplate[] = [
	{
		id: "builtin-title-intro",
		name: "Title Intro",
		description: "Bold center title with a zoom entrance",
		builtin: true,
		elements: [
			textElement({
				name: "Title",
				content: "YOUR TITLE",
				fontSize: 42,
				color: "#ffffff",
				position: { x: 0.5, y: 0.42 },
				durationSeconds: 3,
				weight: "bold",
				letterSpacing: 4,
				shadow: true,
				animate: "zoom-in",
			}),
			textElement({
				name: "Subtitle",
				content: "a short subtitle",
				fontSize: 18,
				color: "#e5e7eb",
				position: { x: 0.5, y: 0.55 },
				durationSeconds: 3,
				letterSpacing: 6,
				animate: "fade-in",
			}),
		],
	},
	{
		id: "builtin-lower-third",
		name: "Lower Third",
		description: "Name card anchored to the lower third",
		builtin: true,
		elements: [
			textElement({
				name: "Name",
				content: "NAME SURNAME",
				fontSize: 24,
				color: "#ffffff",
				position: { x: 0.32, y: 0.78 },
				durationSeconds: 4,
				weight: "bold",
				background: { color: "#111827", radius: 12, paddingX: 24, paddingY: 10 },
				animate: "fade-in",
			}),
			textElement({
				name: "Role",
				content: "role / title",
				fontSize: 15,
				color: "#e5e7eb",
				position: { x: 0.32, y: 0.87 },
				durationSeconds: 4,
				background: { color: "#374151", radius: 10, paddingX: 18, paddingY: 8 },
				animate: "fade-in",
			}),
		],
	},
	{
		id: "builtin-end-card",
		name: "End Card",
		description: "Thanks-for-watching closing card",
		builtin: true,
		elements: [
			textElement({
				name: "Thanks",
				content: "THANKS FOR WATCHING",
				fontSize: 36,
				color: "#ffffff",
				position: { x: 0.5, y: 0.45 },
				durationSeconds: 4,
				weight: "bold",
				letterSpacing: 3,
				animate: "zoom-in",
			}),
			textElement({
				name: "Subscribe",
				content: "subscribe ★ like ★ share",
				fontSize: 17,
				color: "#fde047",
				position: { x: 0.5, y: 0.6 },
				durationSeconds: 4,
				animate: "fade-in",
			}),
		],
	},
	{
		id: "builtin-caption-quote",
		name: "Quote",
		description: "Centered quote with caption box",
		builtin: true,
		elements: [
			textElement({
				name: "Quote",
				content: "“An inspiring quote goes here.”",
				fontSize: 26,
				color: "#ffffff",
				position: { x: 0.5, y: 0.5 },
				durationSeconds: 4,
				fontStyle: "italic",
				background: { color: "#000000", radius: 16, paddingX: 28, paddingY: 14 },
				animate: "fade-in",
			}),
		],
	},
];

const USER_TEMPLATES_KEY = "opencut-user-templates";

export function listUserTemplates(): EditorTemplate[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(USER_TEMPLATES_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as EditorTemplate[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Saves the scene's text/graphic elements (with their params and animations)
 * as a reusable local template. Media clips are not included.
 */
export function saveCurrentSceneAsTemplate({
	editor,
	name,
}: {
	editor: { scenes: { getActiveScene(): { tracks: { main: { elements: unknown[] }; overlay: Array<{ elements: unknown[] }> } } } };
	name: string;
}): { success: boolean; error?: string; elementCount?: number } {
	const scene = editor.scenes.getActiveScene();
	const candidates = [
		...scene.tracks.main.elements,
		...scene.tracks.overlay.flatMap((track) => track.elements),
	].filter(
		(element): element is { type: "text" | "graphic"; params: ParamValues; startTime: number; duration: number; name: string } =>
			(element as { type: string }).type === "text" ||
			(element as { type: string }).type === "graphic",
	);

	if (candidates.length === 0) {
		return { success: false, error: "No text or graphic clips to save" };
	}

	const canvasWidth = 1920;
	const canvasHeight = 1080;

	const elements: TemplateElement[] = candidates.map((element) => {
		const positionX = Number(element.params["transform.positionX"] ?? 0);
		const positionY = Number(element.params["transform.positionY"] ?? 0);
		return {
			type: element.type as "text" | "graphic",
			definitionId:
				element.type === "graphic"
					? ((element as { definitionId?: string }).definitionId ?? undefined)
					: undefined,
			name: element.name,
			position: {
				x: 0.5 + positionX / canvasWidth,
				y: 0.5 + positionY / canvasHeight,
			},
			durationSeconds: element.duration / 120000,
			params: { ...element.params },
		};
	});

	const template: EditorTemplate = {
		id: `user-${Date.now()}`,
		name,
		description: `Local template with ${elements.length} element(s)`,
		builtin: false,
		elements,
	};

	try {
		const existing = listUserTemplates();
		window.localStorage.setItem(
			USER_TEMPLATES_KEY,
			JSON.stringify([...existing, template]),
		);
		return { success: true, elementCount: elements.length };
	} catch {
		return { success: false, error: "Failed to save template locally" };
	}
}

/** Materializes a template into ready-to-insert create elements. */
export function buildTemplateInserts({
	template,
	startTime,
	canvasSize,
}: {
	template: EditorTemplate;
	startTime: MediaTime;
	canvasSize: { width: number; height: number };
}): Array<Record<string, unknown>> {
	const t = getT();
	return template.elements.map((element) => {
		const positionX = (element.position.x - 0.5) * canvasSize.width;
		const positionY = (element.position.y - 0.5) * canvasSize.height;
		const duration = mediaTimeFromSeconds({
			seconds: element.durationSeconds,
		});
		const rawParams: ParamValues = {
			...element.params,
			"transform.positionX": positionX,
			"transform.positionY": positionY,
		};
		const params: ParamValues = {
			...rawParams,
			...(typeof rawParams.content === "string"
				? { content: t(rawParams.content) }
				: {}),
		};

		const animations = buildTemplateAnimations({ animate: element.animate, durationTicks: duration });

		if (element.type === "graphic" && element.definitionId) {
			return {
				type: "graphic",
				definitionId: element.definitionId,
				name: t(element.name),
				startTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				params,
				...(animations ? { animations } : {}),
			};
		}

		return {
			type: "text",
			name: t(element.name),
			startTime,
			duration,
			trimStart: 0,
			trimEnd: 0,
			params,
			...(animations ? { animations } : {}),
		};
	});
}

function buildTemplateAnimations({
	animate,
	durationTicks,
}: {
	animate?: "fade-in" | "zoom-in";
	durationTicks: MediaTime;
}): Record<string, unknown> | null {
	if (!animate) return null;
	const key = (index: number, ticks: number, value: number) => ({
		id: generateUUID(),
		time: ticks,
		value,
		segmentToNext: "linear",
		tangentMode: "broken",
	});
	if (animate === "zoom-in") {
		return {
			"transform.scaleX": {
				keys: [key(0, 0, 0.4), key(1, durationTicks, 1)],
			},
			"transform.scaleY": {
				keys: [key(0, 0, 0.4), key(1, durationTicks, 1)],
			},
			opacity: {
				keys: [key(0, 0, 0), key(1, durationTicks, 1)],
			},
		};
	}
	return {
		opacity: {
			keys: [key(0, 0, 0), key(1, durationTicks, 1)],
		},
	};
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __templatesDebug: object }).__templatesDebug = {
		buildTemplateInserts,
		BUILTIN_TEMPLATES,
	};
}
