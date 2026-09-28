import { mediaTimeToSeconds, roundMediaTime } from "@/wasm";
import { getElementLocalTime } from "@/animation";
import { resolveEffectParamsAtTime } from "@/animation/effect-param-channel";
import {
	buildGaussianBlurPasses,
	intensityToSigma,
} from "@/effects/definitions/blur";
import { effectsRegistry, resolveEffectPasses } from "@/effects";
import type { Effect, EffectPass } from "@/effects/types";
import { getSourceTimeAtClipTime } from "@/retime";
import {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	resolveGraphicElementParamsAtTime,
} from "@/graphics";
import {
	buildTextBackgroundFromElement,
	getTextMeasurementContext,
	measureTextElement,
} from "@/text/measure-element";
import { resolveColorAtTime, resolveOpacityAtTime } from "@/animation/values";
import { resolveTransformAtTime } from "@/rendering/animation-values";
import { videoCache } from "@/services/video-cache/service";
import { buildTransitionPasses } from "@/transitions";
import { computeFadeFactor } from "@/timeline/fades";
import { aiMattingService } from "@/services/ai-matting/service";
import { wasmCompositor } from "./compositor/wasm-compositor";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import type { CanvasRenderer } from "./canvas-renderer";
import type { AnyBaseNode } from "./nodes/base-node";
import {
	BlurBackgroundNode,
	type BackdropSource,
	type ResolvedBlurBackgroundNodeState,
} from "./nodes/blur-background-node";
import {
	EffectLayerNode,
	type ResolvedEffectLayerNodeState,
} from "./nodes/effect-layer-node";
import {
	TransitionPairNode,
	type ResolvedTransitionPairNodeState,
} from "./nodes/transition-pair-node";
import {
	GraphicNode,
	type ResolvedGraphicNodeState,
} from "./nodes/graphic-node";
import { ImageNode, loadImageSource } from "./nodes/image-node";
import { StickerNode, loadStickerSource } from "./nodes/sticker-node";
import { TextNode, type ResolvedTextNodeState } from "./nodes/text-node";
import { VideoNode } from "./nodes/video-node";
import type {
	ResolvedVisualNodeState,
	ResolvedVisualSourceNodeState,
	VisualNodeParams,
} from "./nodes/visual-node";

type ResolveContext = {
	renderer: CanvasRenderer;
	time: number;
};

export async function resolveRenderTree({
	node,
	renderer,
	time,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
	time: number;
}): Promise<void> {
	await resolveNode({
		node,
		context: {
			renderer,
			time,
		},
	});
}

async function resolveNode({
	node,
	context,
}: {
	node: AnyBaseNode;
	context: ResolveContext;
}): Promise<void> {
	if (node instanceof VideoNode) {
		node.resolved = await resolveVideoNode({ node, context });
	} else if (node instanceof ImageNode) {
		node.resolved = await resolveImageNode({ node, context });
	} else if (node instanceof StickerNode) {
		node.resolved = await resolveStickerNode({ node, context });
	} else if (node instanceof GraphicNode) {
		node.resolved = resolveGraphicNode({ node, context });
	} else if (node instanceof TextNode) {
		node.resolved = resolveTextNode({ node, context });
	} else if (node instanceof BlurBackgroundNode) {
		node.resolved = await resolveBlurBackgroundNode({ node, context });
	} else if (node instanceof EffectLayerNode) {
		node.resolved = resolveEffectLayerNode({ node, context });
	} else if (node instanceof TransitionPairNode) {
		node.resolved = await resolveTransitionPairNode({ node, context });
	}

	await Promise.all(
		node.children.map((child) => resolveNode({ node: child, context })),
	);
}

function resolveEffectPassGroups({
	effects,
	animations,
	localTime,
	width,
	height,
}: {
	effects: Effect[] | undefined;
	animations: VisualNodeParams["animations"];
	localTime: number;
	width: number;
	height: number;
}): EffectPass[][] {
	return (effects ?? [])
		.filter((effect) => effect.enabled)
		.map((effect) => {
			const resolvedParams = resolveEffectParamsAtTime({
				effectId: effect.id,
				params: effect.params,
				animations,
				localTime,
			});
			const definition = effectsRegistry.get(effect.type);
			return resolveEffectPasses({
				definition,
				effectParams: resolvedParams,
				width,
				height,
				time: localTime / 120000,
			});
		})
		.filter((passes) => passes.length > 0);
}

function resolveVisualState({
	params,
	context,
	sourceWidth,
	sourceHeight,
}: {
	params: VisualNodeParams;
	context: ResolveContext;
	sourceWidth: number;
	sourceHeight: number;
}): ResolvedVisualNodeState | null {
	const clipTime = context.time - params.timeOffset;
	if (clipTime < 0 || clipTime >= params.duration) {
		return null;
	}
	// Inside the outgoing transition window the element hides itself; the
	// TransitionPairNode renders the blend instead.
	if (
		params.transitionSuppressDuration &&
		clipTime >= params.duration - params.transitionSuppressDuration
	) {
		return null;
	}

	const localTime = getElementLocalTime({
		timelineTime: context.time,
		elementStartTime: params.timeOffset,
		elementDuration: params.duration,
	});
	const transform = resolveTransformAtTime({
		baseTransform: params.transform,
		animations: params.animations,
		localTime,
	});
	const opacity =
		resolveOpacityAtTime({
			baseOpacity: params.opacity,
			animations: params.animations,
			localTime,
		}) *
		computeFadeFactor({
			params: {
				fadeIn: params.fadeIn ?? 0,
				fadeOut: params.fadeOut ?? 0,
			},
			localTimeTicks: localTime,
			durationTicks: params.duration,
		});
	const containScale = Math.min(
		context.renderer.width / sourceWidth,
		context.renderer.height / sourceHeight,
	);
	const effectWidth = Math.round(
		Math.abs(sourceWidth * containScale * transform.scaleX),
	);
	const effectHeight = Math.round(
		Math.abs(sourceHeight * containScale * transform.scaleY),
	);

	return {
		localTime,
		transform,
		opacity,
		effectPasses: resolveEffectPassGroups({
			effects: params.effects,
			animations: params.animations,
			localTime,
			width: effectWidth,
			height: effectHeight,
		}),
	};
}

async function resolveVideoNode({
	node,
	context,
}: {
	node: VideoNode;
	context: ResolveContext;
}): Promise<ResolvedVisualSourceNodeState | null> {
	const clipTime = context.time - node.params.timeOffset;
	if (clipTime < 0 || clipTime >= node.params.duration) {
		return null;
	}

	const sourceTimeTicks =
		node.params.trimStart +
		(node.params.sourceTimeOffset ?? 0) +
		getSourceTimeAtClipTime({
			clipTime,
			retime: node.params.retime,
		});
	const frame = await videoCache.getFrameAt({
		mediaId: node.params.mediaId,
		file: node.params.file,
		time: mediaTimeToSeconds({ time: roundMediaTime({ time: sourceTimeTicks }) }),
	});
	if (!frame) {
		return null;
	}

	let frameSource: CanvasImageSource = frame.canvas;

	// AI Matting: if the clip has the ai-matting effect, segment the frame
	// to remove the background. Non-blocking — nearest cached mask is used.
	const mattingFx = node.params.effects?.find(
		(e) => e.type === "ai-matting" && e.enabled,
	);
	if (mattingFx) {
		const clipId = node.params.mediaId;
		const frameTimeSec = sourceTimeTicks / 120000;
		const mask = aiMattingService.getOrRequest({
			clipId,
			frameTime: frameTimeSec,
			frameSource: frame.canvas,
		});
		if (mask) {
			frameSource = applyMattingMask({
				frame: frame.canvas,
				mask: mask.mask,
				maskW: mask.width,
				maskH: mask.height,
			});
		}
	}

	const visualState = resolveVisualState({
		params: node.params,
		context,
		sourceWidth: frame.canvas.width,
		sourceHeight: frame.canvas.height,
	});
	if (!visualState) {
		return null;
	}

	return {
		...visualState,
		source: frameSource,
		sourceWidth: frame.canvas.width,
		sourceHeight: frame.canvas.height,
	};
}

const mattingCanvasCache = new Map<string, HTMLCanvasElement>();

function applyMattingMask({ frame, mask, maskW, maskH }: {
	frame: HTMLCanvasElement | OffscreenCanvas;
	mask: Uint8Array;
	maskW: number;
	maskH: number;
}): HTMLCanvasElement {
	const w = (frame as HTMLCanvasElement).width || 640;
	const h = (frame as HTMLCanvasElement).height || 360;
	const key = `${w}x${h}`;
	let canvas = mattingCanvasCache.get(key);
	if (!canvas) {
		canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		mattingCanvasCache.set(key, canvas);
	}
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return canvas;
	ctx.clearRect(0, 0, w, h);
	ctx.drawImage(frame, 0, 0, w, h);
	const imageData = ctx.getImageData(0, 0, w, h);
	const data = imageData.data;
	for (let y = 0; y < h; y++) {
		const my = Math.min(maskH - 1, Math.floor((y / h) * maskH));
		for (let x = 0; x < w; x++) {
			const mx = Math.min(maskW - 1, Math.floor((x / w) * maskW));
			data[(y * w + x) * 4 + 3] *= mask[my * maskW + mx] / 255;
		}
	}
	ctx.putImageData(imageData, 0, 0);
	return canvas;
}

async function resolveImageNode({
	node,
	context,
}: {
	node: ImageNode;
	context: ResolveContext;
}): Promise<ResolvedVisualSourceNodeState | null> {
	const source = await loadImageSource({
		url: node.params.url,
		maxSourceSize: node.params.maxSourceSize,
	});
	const visualState = resolveVisualState({
		params: node.params,
		context,
		sourceWidth: source.width,
		sourceHeight: source.height,
	});
	if (!visualState) {
		return null;
	}

	return {
		...visualState,
		source: source.source,
		sourceWidth: source.width,
		sourceHeight: source.height,
	};
}

async function resolveStickerNode({
	node,
	context,
}: {
	node: StickerNode;
	context: ResolveContext;
}): Promise<ResolvedVisualSourceNodeState | null> {
	const source = await loadStickerSource({ stickerId: node.params.stickerId });
	const sourceWidth = node.params.intrinsicWidth ?? source.width;
	const sourceHeight = node.params.intrinsicHeight ?? source.height;
	const visualState = resolveVisualState({
		params: node.params,
		context,
		sourceWidth,
		sourceHeight,
	});
	if (!visualState) {
		return null;
	}

	return {
		...visualState,
		source: source.source,
		sourceWidth,
		sourceHeight,
	};
}

function resolveGraphicNode({
	node,
	context,
}: {
	node: GraphicNode;
	context: ResolveContext;
}): ResolvedGraphicNodeState | null {
	const visualState = resolveVisualState({
		params: node.params,
		context,
		sourceWidth: DEFAULT_GRAPHIC_SOURCE_SIZE,
		sourceHeight: DEFAULT_GRAPHIC_SOURCE_SIZE,
	});
	if (!visualState) {
		return null;
	}

	return {
		...visualState,
		resolvedParams: resolveGraphicElementParamsAtTime({
			element: node.params,
			localTime: visualState.localTime,
		}),
	};
}

function resolveTextNode({
	node,
	context,
}: {
	node: TextNode;
	context: ResolveContext;
}): ResolvedTextNodeState | null {
	if (
		context.time < node.params.startTime ||
		context.time >= node.params.startTime + node.params.duration
	) {
		return null;
	}

	const localTime = getElementLocalTime({
		timelineTime: context.time,
		elementStartTime: node.params.startTime,
		elementDuration: node.params.duration,
	});
	const background = buildTextBackgroundFromElement({ element: node.params });

	return {
		transform: resolveTransformAtTime({
			baseTransform: node.params.transform,
			animations: node.params.animations,
			localTime,
		}),
		opacity:
			resolveOpacityAtTime({
				baseOpacity: node.params.opacity,
				animations: node.params.animations,
				localTime,
			}) *
			computeFadeFactor({
				params: node.params.params,
				localTimeTicks: localTime,
				durationTicks: node.params.duration,
			}),
		textColor: resolveColorAtTime({
			baseColor:
				typeof node.params.params.color === "string"
					? node.params.params.color
					: "#ffffff",
			animations: node.params.animations,
			propertyPath: "color",
			localTime,
		}),
		backgroundColor: resolveColorAtTime({
			baseColor: background.color,
			animations: node.params.animations,
			propertyPath: "background.color",
			localTime,
		}),
		effectPasses: resolveEffectPassGroups({
			effects: node.params.effects,
			animations: node.params.animations,
			localTime,
			width: context.renderer.width,
			height: context.renderer.height,
		}),
		measuredText: measureTextElement({
			element: node.params,
			canvasHeight: node.params.canvasHeight,
			localTime,
			ctx: getTextMeasurementContext(),
		}),
	};
}

async function resolveBlurBackgroundNode({
	node,
	context,
}: {
	node: BlurBackgroundNode;
	context: ResolveContext;
}): Promise<ResolvedBlurBackgroundNodeState | null> {
	const clipTime = context.time - node.params.timeOffset;
	if (clipTime < 0 || clipTime >= node.params.duration) {
		return null;
	}

	const backdropSource = await resolveBackdropSource({ node, clipTime });
	if (!backdropSource) {
		return null;
	}

	return {
		backdropSource,
		passes: buildGaussianBlurPasses({
			sigmaX: intensityToSigma({
				intensity: node.params.blurIntensity,
				resolution: context.renderer.width,
				reference: 1920,
			}),
			sigmaY: intensityToSigma({
				intensity: node.params.blurIntensity,
				resolution: context.renderer.height,
				reference: 1080,
			}),
		}),
	};
}

async function resolveBackdropSource({
	node,
	clipTime,
}: {
	node: BlurBackgroundNode;
	clipTime: number;
}): Promise<BackdropSource | null> {
	if (node.params.mediaType === "video") {
		const sourceTimeTicks =
			node.params.trimStart +
			getSourceTimeAtClipTime({
				clipTime,
				retime: node.params.retime,
			});
		const frame = await videoCache.getFrameAt({
			mediaId: node.params.mediaId,
			file: node.params.file,
			time: mediaTimeToSeconds({ time: roundMediaTime({ time: sourceTimeTicks }) }),
		});
		if (!frame) {
			return null;
		}

		return {
			source: frame.canvas,
			width: frame.canvas.width,
			height: frame.canvas.height,
		};
	}

	const source = await loadImageSource({ url: node.params.url });
	return {
		source: source.source,
		width: source.width,
		height: source.height,
	};
}

function resolveEffectLayerNode({
	node,
	context,
}: {
	node: EffectLayerNode;
	context: ResolveContext;
}): ResolvedEffectLayerNodeState | null {
	const time = context.time;
	if (
		time < node.params.timeOffset - 1e-6 ||
		time >= node.params.timeOffset + node.params.duration + 1e-6
	) {
		return null;
	}

	const definition = effectsRegistry.get(node.params.effectType);
	const passes = resolveEffectPasses({
		definition,
		effectParams: node.params.effectParams,
		width: context.renderer.width,
		height: context.renderer.height,
		time: (context.time - node.params.timeOffset) / 120000,
	});
	if (passes.length === 0) {
		return null;
	}

	return {
		passes,
	};
}

async function resolveTransitionPairNode({
	node,
	context,
}: {
	node: TransitionPairNode;
	context: ResolveContext;
}): Promise<ResolvedTransitionPairNodeState | null> {
	const { junctionTime, transition, sceneA, sceneB } = node.params;
	const windowStart = junctionTime - transition.duration;
	const time = context.time;
	if (time < windowStart || time >= junctionTime) {
		return null;
	}

	const progress = transition.duration
		? (time - windowStart) / transition.duration
		: 1;
	const width = context.renderer.width;
	const height = context.renderer.height;

	try {
		// A sub-render must never hang the render loop (e.g. a stalled video
		// decode worker): race it against a watchdog and degrade to no blend.
		const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
			Promise.race([
				promise,
				new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
			]);

		// Render the incoming side first: both clips usually share one media
		// source, and decoding strictly forward (B's early frame, then A's late
		// frame) avoids a backward seek on the shared decoder chain.
		const canvasB = await withTimeout(
			renderSubScene({
				node: sceneB,
				time,
				renderer: context.renderer,
			}),
			6000,
		);
		const canvasA = await withTimeout(
			renderSubScene({
				node: sceneA,
				time,
				renderer: context.renderer,
			}),
			6000,
		);
		if (!canvasA || !canvasB) {
			return null;
		}

		const passes = buildTransitionPasses({
			type: transition.type,
			progress,
			width,
			height,
			params: transition.params ?? {},
		});
		if (passes.length === 0) {
			return null;
		}

		const canvas = wasmCompositor.applyEffectPasses({
			source: canvasA,
			sourceB: canvasB,
			width,
			height,
			passes,
		});

		return {
			canvas,
			contentKey: `transition:${transition.type}:${time - windowStart}:${width}x${height}:${JSON.stringify(transition.params ?? {})}`,
		};
	} catch (error) {
		// A failing transition (missing wasm export, shader error, etc.) must
		// never take down the whole render loop — fall back to no output.
		console.error("Transition render failed:", error);
		return null;
	}
}

/**
 * Resolves and renders a transition sub-scene into a standalone canvas.
 * Must run before the main frame render: the compositor texture pool is
 * recycled at the start of each frame render.
 */
async function renderSubScene({
	node,
	time,
	renderer,
}: {
	node: AnyBaseNode;
	time: number;
	renderer: CanvasRenderer;
}): Promise<OffscreenCanvas | null> {
	await resolveRenderTree({ node, renderer, time });
	const { frame, textures } = await buildFrameDescriptor({
		node,
		renderer,
	});
	wasmCompositor.ensureInitialized({
		width: renderer.width,
		height: renderer.height,
	});
	wasmCompositor.syncTextures(textures);
	return wasmCompositor.renderFrameToCanvas(frame);
}
