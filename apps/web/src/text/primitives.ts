import type { TextCanvasContext, TextBlockMeasurement } from "@/text/layout";
import { DEFAULTS } from "@/timeline/defaults";
import { clamp } from "@/utils/math";
import { CORNER_RADIUS_MAX, CORNER_RADIUS_MIN } from "./background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	measureTextBlock,
	setCanvasLetterSpacing,
} from "./layout";
import { FONT_SIZE_SCALE_REFERENCE } from "./typography";

export type TextAlign = "left" | "center" | "right";
export type TextFontWeight = "normal" | "bold";
export type TextFontStyle = "normal" | "italic";
export type TextDecoration = "none" | "underline" | "line-through";

export interface TextStyleStroke {
	color: string;
	width: number;
}

export interface TextStyleShadow {
	color: string;
	blur: number;
	offsetX: number;
	offsetY: number;
}

export interface TextStyleGlow {
	color: string;
	radius: number;
}

export interface TextStyleGradient {
	color: string;
	angle: number;
}

export interface TextCharAnimation {
	type: "popup" | "wave" | "bounce" | "fade-per-char" | "karaoke";
	duration: number;
	secondColor?: string;
}

export interface TextStyleParams {
	stroke?: TextStyleStroke | null;
	shadow?: TextStyleShadow | null;
	glow?: TextStyleGlow | null;
	gradient?: TextStyleGradient | null;
}

export interface TextLayoutParams {
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textAlign: TextAlign;
	textDecoration?: TextDecoration;
	letterSpacing?: number;
	lineHeight?: number;
}

export interface ResolvedTextLayout {
	scaledFontSize: number;
	fontString: string;
	letterSpacing: number;
	lineHeightPx: number;
	fontSizeRatio: number;
	/** scaledFontSize / fontSize — multiplier from param space to draw space. */
	sizeScale: number;
	textAlign: TextAlign;
	textDecoration: TextDecoration;
}

export interface MeasuredTextLayout extends ResolvedTextLayout {
	lines: string[];
	lineMetrics: TextMetrics[];
	block: TextBlockMeasurement;
}

export interface ResolvedTextBackgroundLike {
	enabled: boolean;
	color: string;
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export function quoteFontFamily({ fontFamily }: { fontFamily: string }): string {
	return `"${fontFamily.replace(/"/g, '\\"')}"`;
}

export function buildTextFontString({
	fontFamily,
	fontWeight,
	fontStyle,
	scaledFontSize,
}: {
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	scaledFontSize: number;
}): string {
	return `${fontStyle} ${fontWeight} ${scaledFontSize}px ${quoteFontFamily({ fontFamily })}, sans-serif`;
}

export function resolveTextLayout({
	text,
	canvasHeight,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
}): ResolvedTextLayout {
	const scaledFontSize =
		text.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const fontWeight = text.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = text.fontStyle === "italic" ? "italic" : "normal";
	const letterSpacing = text.letterSpacing ?? DEFAULTS.text.letterSpacing;
	const lineHeightPx =
		scaledFontSize * (text.lineHeight ?? DEFAULTS.text.lineHeight);
	const fontSizeRatio = text.fontSize / 15;
	const sizeScale = text.fontSize > 0 ? scaledFontSize / text.fontSize : 1;

	return {
		scaledFontSize,
		fontString: buildTextFontString({
			fontFamily: text.fontFamily,
			fontWeight,
			fontStyle,
			scaledFontSize,
		}),
		letterSpacing,
		lineHeightPx,
		fontSizeRatio,
		sizeScale,
		textAlign: text.textAlign,
		textDecoration: text.textDecoration ?? "none",
	};
}

export function measureTextLayout({
	text,
	canvasHeight,
	ctx,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
	ctx: TextCanvasContext;
}): MeasuredTextLayout {
	const resolvedLayout = resolveTextLayout({ text, canvasHeight });
	const lines = text.content.split("\n");

	ctx.save();
	ctx.font = resolvedLayout.fontString;
	ctx.textBaseline = "middle";
	setCanvasLetterSpacing({
		ctx,
		letterSpacingPx: resolvedLayout.letterSpacing,
	});
	const lineMetrics = lines.map((line) => ctx.measureText(line));
	ctx.restore();

	const block = measureTextBlock({
		lineMetrics,
		lineHeightPx: resolvedLayout.lineHeightPx,
	});

	return {
		...resolvedLayout,
		lines,
		lineMetrics,
		block,
	};
}



// ===== Per-character animation =====

function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Draws a single character with all styling passes (glow/stroke/fill).
 * `cx` is the x-center of the char, `y` is the baseline.
 * `scale` and `alpha` are pre-multiplied per-char animation values.
 */
function drawStyledChar({
	ctx,
	char,
	cx,
	y,
	scale,
	alpha,
	fillColor,
	stroke,
	strokeColor,
	strokeWidth,
	secondColor,
	charProgress,
	isKaraoke,
}: {
	ctx: TextCanvasContext;
	char: string;
	cx: number;
	y: number;
	scale: number;
	alpha: number;
	fillColor: string | CanvasGradient;
	stroke: TextStyleStroke | null;
	strokeColor: string;
	strokeWidth: number;
	secondColor: string;
	charProgress: number;
	isKaraoke: boolean;
}): void {
	ctx.save();
	ctx.translate(cx, y);
	ctx.scale(scale, scale);
	ctx.globalAlpha *= alpha;

	if (stroke) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = Math.max(1, strokeWidth);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.strokeText(char, 0, 0);
	}

	if (isKaraoke && charProgress > 0) {
		// Karaoke: base color for un-sung, secondColor for sung portion.
		ctx.fillStyle = charProgress >= 1 ? secondColor : fillColor;
		ctx.fillText(char, 0, 0);
		if (charProgress > 0 && charProgress < 1) {
			// Half-sung: overlay second color at partial alpha.
			ctx.globalAlpha *= 0.6;
			ctx.fillStyle = secondColor;
			ctx.fillText(char, 0, 0);
		}
	} else {
		ctx.fillStyle = fillColor;
		ctx.fillText(char, 0, 0);
	}

	ctx.restore();
}

/**
 * Computes the per-char stagger progress for entrance animations.
 * Returns a function: (charIndex, totalChars) => 0..1
 */
function makeCharProgressFn(
	type: string,
	progress: number,
): ((index: number, total: number) => number) | null {
	if (progress >= 1) return null; // Animation finished, draw normally.
	const charStagger = 0.06;
	return (index: number, total: number) => {
		const delay = index * charStagger;
		const charDuration = Math.max(0.2, 1 - delay);
		return Math.min(1, Math.max(0, (progress - delay) / charDuration));
	};
}

export function drawMeasuredTextLayout({
	ctx,
	layout,
	textColor,
	background,
	backgroundColor,
	textBaseline = "middle",
	style,
	visibleCharFraction = 1,
	charAnimation = null,
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	textColor: string;
	background?: ResolvedTextBackgroundLike | null;
	backgroundColor?: string;
	textBaseline?: CanvasTextBaseline;
	style?: TextStyleParams | null;
	/** Typewriter reveal: fraction of total characters to draw (1 = all). */
	visibleCharFraction?: number;
	charAnimation?: {
		type: TextCharAnimation["type"];
		progress: number;
		localTime?: number;
		secondColor?: string;
	} | null;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.fillStyle = textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	if (
		background?.enabled &&
		backgroundColor &&
		backgroundColor !== "transparent" &&
		layout.lines.length > 0
	) {
		const backgroundRect = getTextBackgroundRect({
			textAlign: layout.textAlign,
			block: layout.block,
			background: {
				...background,
				color: backgroundColor,
			},
			fontSizeRatio: layout.fontSizeRatio,
		});
		if (backgroundRect) {
			const p =
				clamp({
					value: background.cornerRadius,
					min: CORNER_RADIUS_MIN,
					max: CORNER_RADIUS_MAX,
				}) / 100;
			const radius =
				(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
			ctx.fillStyle = backgroundColor;
			ctx.beginPath();
			ctx.roundRect(
				backgroundRect.left,
				backgroundRect.top,
				backgroundRect.width,
				backgroundRect.height,
				radius,
			);
			ctx.fill();
			ctx.fillStyle = textColor;
		}
	}

	const scale = layout.sizeScale;
	const strokeS = style?.stroke;
	const shadowS = style?.shadow;
	const glowS = style?.glow;
	const gradientS = style?.gradient;

	// Per-char animation state
	const charAnim = charAnimation ?? null;
	const animType = charAnim?.type;
	const animActive = animType && charAnimation !== null;

	if (animActive && animType) {
		// ===== Per-character animated rendering =====
		const globalProgress = charAnim?.progress ?? 1;
		const localTime = charAnim?.localTime ?? 0;
		const secondColor = charAnim?.secondColor ?? "#fbbf24";
		const charStagger = 0.05;
		let globalCharIndex = 0;

		for (let li = 0; li < layout.lines.length; li++) {
			const lineY = li * layout.lineHeightPx - layout.block.visualCenterOffset;
			const line = layout.lines[li];
			const lineWidth = layout.lineMetrics[li]?.width ?? 0;

			// Char start X based on alignment
			let startX = 0;
			if (layout.textAlign === "center") startX = -lineWidth / 2;
			else if (layout.textAlign === "right") startX = -lineWidth;

			let cursorX = startX;
			for (let ci = 0; ci < line.length; ci++) {
				const char = line[ci];
				if (!char) { continue; }
				const charW = ctx.measureText(char).width;
				const charCX = cursorX + charW / 2;
				cursorX += charW;

				// Typewriter: skip chars beyond visible count
				if (visibleCharFraction < 1) {
					const globalIdx = globalCharIndex;
					const visibleCount = Math.round(totalCharsCount(layout.lines) * visibleCharFraction);
					if (globalIdx >= visibleCount) { globalCharIndex++; continue; }
				}

				const gi = globalCharIndex;
				globalCharIndex++;

				let charScale = 1;
				let charAlpha = 1;
				let charYOffset = 0;
				let isKaraokeFill = false;
				let karaokeMix = 0;

				if (animType === "popup" || animType === "bounce" || animType === "fade-per-char") {
					const delay = gi * charStagger;
					const cp = Math.min(1, Math.max(0, (globalProgress - delay) / Math.max(0.15, 1 - delay)));
					if (animType === "popup") {
						charScale = 0.2 + 0.8 * easeOutBack(cp);
						charAlpha = Math.min(1, cp * 2.5);
					} else if (animType === "bounce") {
						const b = 1 - cp;
						charYOffset = -b * b * layout.scaledFontSize * 0.8;
						charAlpha = Math.min(1, cp * 3);
					} else {
						charAlpha = cp;
					}
					if (cp <= 0) continue;
				} else if (animType === "wave") {
					charYOffset = Math.sin(localTime * 3 + gi * 0.6) * layout.scaledFontSize * 0.12;
				} else if (animType === "karaoke") {
					isKaraokeFill = true;
					karaokeMix = charAnim?.progress ?? 0;
				}

				ctx.save();
				ctx.translate(charCX, lineY + charYOffset);
				ctx.scale(charScale, charScale);
				ctx.globalAlpha *= charAlpha;

				// Glow pass per char
				if (glowS) {
					ctx.save();
					ctx.shadowColor = glowS.color;
					ctx.shadowBlur = glowS.radius * scale;
					ctx.fillStyle = glowS.color;
					for (let gp = 0; gp < 3; gp++) {
						ctx.fillText(char, 0, 0);
					}
					ctx.restore();
				}

				// Stroke pass
				if (strokeS) {
					ctx.save();
					applyShadow({ ctx, shadow: shadowS, scale });
					ctx.strokeStyle = strokeS.color;
					ctx.lineWidth = Math.max(1, strokeS.width * scale);
					ctx.lineJoin = "round";
					ctx.lineCap = "round";
					ctx.strokeText(char, 0, 0);
					ctx.restore();
				}

				// Fill pass
				ctx.save();
				applyShadow({ ctx, shadow: shadowS, scale });

				let fill: string | CanvasGradient = gradientS
					? buildGradientFillStyle({ ctx, layout, textColor, gradient: gradientS })
					: textColor;

				if (isKaraokeFill) {
					// Karaoke: sweep second color across chars.
					const sweepThreshold = karaokeMix * (layout.lines.length * 20);
					if (gi < sweepThreshold) {
						ctx.fillStyle = secondColor;
					}
					ctx.fillStyle = fill;
					if (gi < sweepThreshold) {
						ctx.fillStyle = secondColor;
					}
					ctx.fillText(char, 0, 0);
				} else {
					ctx.fillStyle = fill;
					ctx.fillText(char, 0, 0);
					if (shadowS) {
						clearShadow({ ctx });
						ctx.fillText(char, 0, 0);
					}
				}
				ctx.restore();

				ctx.restore();
			}

			// Decoration lines (draw after all chars)
			if (layout.textDecoration !== "none") {
				drawTextDecoration({
					ctx,
					textDecoration: layout.textDecoration,
					lineWidth: lineWidth,
					lineY: lineY + layout.scaledFontSize * 0.3,
					metrics: layout.lineMetrics[li],
					scaledFontSize: layout.scaledFontSize,
					textAlign: layout.textAlign,
				});
			}
		}
		return;
	}

	// ===== Non-animated rendering (original path) =====
	for (let index = 0; index < layout.lines.length; index++) {
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		const line = layout.lines[index];

		if (strokeS) {
			ctx.save();
			applyShadow({ ctx, shadow: shadowS, scale });
			ctx.strokeStyle = strokeS.color;
			ctx.lineWidth = Math.max(1, strokeS.width * scale);
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.strokeText(line, 0, lineY);
			ctx.restore();
		}

		ctx.save();
		applyShadow({ ctx, shadow: shadowS, scale });
		ctx.fillStyle = gradientS
			? buildGradientFillStyle({ ctx, layout, textColor, gradient: gradientS })
			: textColor;
		ctx.fillText(line, 0, lineY);
		if (shadowS) {
			clearShadow({ ctx });
			ctx.fillText(line, 0, lineY);
		}
		ctx.restore();

		drawTextDecoration({
			ctx,
			textDecoration: layout.textDecoration,
			lineWidth: layout.lineMetrics[index].width,
			lineY,
			metrics: layout.lineMetrics[index],
			scaledFontSize: layout.scaledFontSize,
			textAlign: layout.textAlign,
		});
	}
}

function totalCharsCount(lines: string[]): number {
	let count = 0;
	for (const line of lines) count += line.length;
	return count;
}

function applyShadow({
	ctx,
	shadow,
	scale,
}: {
	ctx: TextCanvasContext;
	shadow?: TextStyleShadow | null;
	scale: number;
}): void {
	if (!shadow) return;
	ctx.shadowColor = shadow.color;
	ctx.shadowBlur = shadow.blur * scale;
	ctx.shadowOffsetX = shadow.offsetX * scale;
	ctx.shadowOffsetY = shadow.offsetY * scale;
}

function clearShadow({ ctx }: { ctx: TextCanvasContext }): void {
	ctx.shadowColor = "transparent";
	ctx.shadowBlur = 0;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
}

function buildGradientFillStyle({
	ctx,
	layout,
	textColor,
	gradient,
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	textColor: string;
	gradient: TextStyleGradient;
}): string | CanvasGradient {
	const width = Math.max(layout.block.maxWidth, 1);
	const height = Math.max(layout.block.height, 1);
	const angle = (gradient.angle * Math.PI) / 180;
	const halfX = (Math.cos(angle) * width) / 2;
	const halfY = (-Math.sin(angle) * height) / 2;
	const gradientFill = ctx.createLinearGradient(
		-halfX,
		-halfY,
		halfX,
		halfY,
	);
	gradientFill.addColorStop(0, textColor);
	gradientFill.addColorStop(1, gradient.color);
	return gradientFill;
}

export function strokeMeasuredTextLayout({
	ctx,
	layout,
	strokeColor,
	strokeWidth,
	textBaseline = "middle",
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	strokeColor: string;
	strokeWidth: number;
	textBaseline?: CanvasTextBaseline;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = strokeWidth;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	for (let index = 0; index < layout.lines.length; index++) {
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		ctx.strokeText(layout.lines[index], 0, lineY);
	}
}
