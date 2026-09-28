import { CORNER_RADIUS_MIN } from "@/text/background";
import { DEFAULTS } from "@/timeline/defaults";
import type { TextElement } from "@/timeline";
import type { TextBackground } from "@/text/background";
import { resolveNumberAtTime } from "@/animation/values";
import {
	getTextVisualRect,
} from "./layout";
import {
	measureTextLayout,
	type MeasuredTextLayout,
	type TextAlign,
	type TextDecoration,
	type TextFontStyle,
	type TextFontWeight,
	type TextLayoutParams,
	type TextStyleParams,
} from "./primitives";

export interface ResolvedTextBackground extends TextBackground {
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export interface MeasuredTextElement extends MeasuredTextLayout {
	resolvedBackground: ResolvedTextBackground;
	resolvedStyle: TextStyleParams;
	/** Character-reveal fraction for the typewriter effect (1 = fully shown). */
	visibleCharFraction: number;
	charAnimation: {
		type: string;
		progress: number;
		localTime: number;
		secondColor: string;
	} | null;
	visualRect: { left: number; top: number; width: number; height: number };
}

let textMeasurementContext:
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D
	| null = null;

export function getTextMeasurementContext():
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D {
	if (textMeasurementContext) {
		return textMeasurementContext;
	}

	if (typeof OffscreenCanvas !== "undefined") {
		const canvas = new OffscreenCanvas(1, 1);
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	if (typeof document !== "undefined") {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	throw new Error("Failed to create text measurement context");
}

export function measureTextElement({
	element,
	canvasHeight,
	localTime,
	ctx,
}: {
	element: TextElement;
	canvasHeight: number;
	localTime: number;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): MeasuredTextElement {
	const text = buildTextLayoutParamsFromElement({ element });
	const measuredLayout = measureTextLayout({
		text,
		canvasHeight,
		ctx,
	});

	const bg = buildTextBackgroundFromElement({ element });
	const resolvedBackground: ResolvedTextBackground = {
		...bg,
		paddingX: resolveNumberAtTime({
			baseValue: bg.paddingX ?? DEFAULTS.text.background.paddingX,
			animations: element.animations,
			propertyPath: "background.paddingX",
			localTime,
		}),
		paddingY: resolveNumberAtTime({
			baseValue: bg.paddingY ?? DEFAULTS.text.background.paddingY,
			animations: element.animations,
			propertyPath: "background.paddingY",
			localTime,
		}),
		offsetX: resolveNumberAtTime({
			baseValue: bg.offsetX ?? DEFAULTS.text.background.offsetX,
			animations: element.animations,
			propertyPath: "background.offsetX",
			localTime,
		}),
		offsetY: resolveNumberAtTime({
			baseValue: bg.offsetY ?? DEFAULTS.text.background.offsetY,
			animations: element.animations,
			propertyPath: "background.offsetY",
			localTime,
		}),
		cornerRadius: resolveNumberAtTime({
			baseValue: bg.cornerRadius ?? CORNER_RADIUS_MIN,
			animations: element.animations,
			propertyPath: "background.cornerRadius",
			localTime,
		}),
	};

	const visualRect = getTextVisualRect({
		textAlign: text.textAlign,
		block: measuredLayout.block,
		background: resolvedBackground,
		fontSizeRatio: measuredLayout.fontSizeRatio,
	});

	const resolvedStyle = buildTextStyleFromElement({ element });

	// Typewriter: fraction of characters revealed over the configured duration.
	const typewriterEnabled = readBooleanParam({
		params: element.params,
		key: "typewriter.enabled",
		fallback: false,
	});
	const typewriterDuration = readNumberParam({
		params: element.params,
		key: "typewriter.duration",
		fallback: 1.5,
	});
	const elapsedSeconds = localTime / 120000;
	const visibleCharFraction =
		typewriterEnabled
			? Math.min(
					1,
					Math.max(0, elapsedSeconds / Math.max(0.1, typewriterDuration)),
				)
			: 1;

	const textAnimType = typeof element.params["textAnim.type"] === "string"
		? (element.params["textAnim.type"] as string)
		: "none";
	const textAnimDuration = typeof element.params["textAnim.duration"] === "number"
		? (element.params["textAnim.duration"] as number)
		: 1.5;
	const textAnimSecondColor = typeof element.params["textAnim.secondColor"] === "string"
		? (element.params["textAnim.secondColor"] as string)
		: "#fbbf24";

	const animElapsedSeconds = localTime / 120000;
	const charAnimation = textAnimType !== "none"
		? {
				type: textAnimType,
				progress: Math.min(1, Math.max(0, animElapsedSeconds / Math.max(0.1, textAnimDuration))),
				localTime: animElapsedSeconds,
				secondColor: textAnimSecondColor,
			}
		: null;

	return {
		...measuredLayout,
		resolvedBackground,
		resolvedStyle,
		visibleCharFraction,
		charAnimation,
		visualRect,
	};
}

export function buildTextStyleFromElement({
	element,
}: {
	element: TextElement;
}): TextStyleParams {
	const strokeEnabled = readBooleanParam({
		params: element.params,
		key: "stroke.enabled",
		fallback: false,
	});
	const shadowEnabled = readBooleanParam({
		params: element.params,
		key: "shadow.enabled",
		fallback: false,
	});
	const glowEnabled = readBooleanParam({
		params: element.params,
		key: "glow.enabled",
		fallback: false,
	});
	const gradientEnabled = readBooleanParam({
		params: element.params,
		key: "gradient.enabled",
		fallback: false,
	});

	return {
		stroke: strokeEnabled
			? {
					color: readStringParam({
						params: element.params,
						key: "stroke.color",
						fallback: "#000000",
					}),
					width: readNumberParam({
						params: element.params,
						key: "stroke.width",
						fallback: 4,
					}),
				}
			: null,
		shadow: shadowEnabled
			? {
					color: readStringParam({
						params: element.params,
						key: "shadow.color",
						fallback: "#000000",
					}),
					blur: readNumberParam({
						params: element.params,
						key: "shadow.blur",
						fallback: 8,
					}),
					offsetX: readNumberParam({
						params: element.params,
						key: "shadow.offsetX",
						fallback: 2,
					}),
					offsetY: readNumberParam({
						params: element.params,
						key: "shadow.offsetY",
						fallback: 2,
					}),
				}
			: null,
		glow: glowEnabled
			? {
					color: readStringParam({
						params: element.params,
						key: "glow.color",
						fallback: "#ffffff",
					}),
					radius: readNumberParam({
						params: element.params,
						key: "glow.radius",
						fallback: 12,
					}),
				}
			: null,
		gradient: gradientEnabled
			? {
					color: readStringParam({
						params: element.params,
						key: "gradient.color",
						fallback: "#ff6b6b",
					}),
					angle: readNumberParam({
						params: element.params,
						key: "gradient.angle",
						fallback: 90,
					}),
				}
			: null,
	};
}

export function buildTextLayoutParamsFromElement({
	element,
}: {
	element: TextElement;
}): TextLayoutParams {
	return {
		content: readStringParam({
			params: element.params,
			key: "content",
			fallback: "Default text",
		}),
		fontSize: readNumberParam({
			params: element.params,
			key: "fontSize",
			fallback: 15,
		}),
		fontFamily: readStringParam({
			params: element.params,
			key: "fontFamily",
			fallback: "Arial",
		}),
		fontWeight: readFontWeight({
			value: element.params.fontWeight,
			fallback: "normal",
		}),
		fontStyle: readFontStyle({
			value: element.params.fontStyle,
			fallback: "normal",
		}),
		textAlign: readTextAlign({
			value: element.params.textAlign,
			fallback: "center",
		}),
		textDecoration: readTextDecoration({
			value: element.params.textDecoration,
			fallback: "none",
		}),
		letterSpacing: readNumberParam({
			params: element.params,
			key: "letterSpacing",
			fallback: DEFAULTS.text.letterSpacing,
		}),
		lineHeight: readNumberParam({
			params: element.params,
			key: "lineHeight",
			fallback: DEFAULTS.text.lineHeight,
		}),
	};
}

export function buildTextBackgroundFromElement({
	element,
}: {
	element: TextElement;
}): TextBackground {
	return {
		enabled: readBooleanParam({
			params: element.params,
			key: "background.enabled",
			fallback: DEFAULTS.text.background.enabled,
		}),
		color: readStringParam({
			params: element.params,
			key: "background.color",
			fallback: DEFAULTS.text.background.color,
		}),
		cornerRadius: readNumberParam({
			params: element.params,
			key: "background.cornerRadius",
			fallback: DEFAULTS.text.background.cornerRadius,
		}),
		paddingX: readNumberParam({
			params: element.params,
			key: "background.paddingX",
			fallback: DEFAULTS.text.background.paddingX,
		}),
		paddingY: readNumberParam({
			params: element.params,
			key: "background.paddingY",
			fallback: DEFAULTS.text.background.paddingY,
		}),
		offsetX: readNumberParam({
			params: element.params,
			key: "background.offsetX",
			fallback: DEFAULTS.text.background.offsetX,
		}),
		offsetY: readNumberParam({
			params: element.params,
			key: "background.offsetY",
			fallback: DEFAULTS.text.background.offsetY,
		}),
	};
}

function readStringParam({
	params,
	key,
	fallback,
}: {
	params: TextElement["params"];
	key: string;
	fallback: string;
}): string {
	const value = params[key];
	return typeof value === "string" ? value : fallback;
}

function readNumberParam({
	params,
	key,
	fallback,
}: {
	params: TextElement["params"];
	key: string;
	fallback: number;
}): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

function readBooleanParam({
	params,
	key,
	fallback,
}: {
	params: TextElement["params"];
	key: string;
	fallback: boolean;
}): boolean {
	const value = params[key];
	return typeof value === "boolean" ? value : fallback;
}

function readTextAlign({
	value,
	fallback,
}: {
	value: unknown;
	fallback: TextAlign;
}): TextAlign {
	return value === "left" || value === "center" || value === "right"
		? value
		: fallback;
}

function readFontWeight({
	value,
	fallback,
}: {
	value: unknown;
	fallback: TextFontWeight;
}): TextFontWeight {
	return value === "bold" || value === "normal" ? value : fallback;
}

function readFontStyle({
	value,
	fallback,
}: {
	value: unknown;
	fallback: TextFontStyle;
}): TextFontStyle {
	return value === "italic" || value === "normal" ? value : fallback;
}

function readTextDecoration({
	value,
	fallback,
}: {
	value: unknown;
	fallback: TextDecoration;
}): TextDecoration {
	return value === "none" || value === "underline" || value === "line-through"
		? value
		: fallback;
}
