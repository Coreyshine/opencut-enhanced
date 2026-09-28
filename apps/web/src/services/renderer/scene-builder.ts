import type { SceneTracks, TimelineTrack } from "@/timeline";
import type { MediaAsset } from "@/media/types";
import { RootNode } from "./nodes/root-node";
import { VideoNode } from "./nodes/video-node";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { StickerNode } from "./nodes/sticker-node";
import { GraphicNode } from "./nodes/graphic-node";
import { ColorNode } from "./nodes/color-node";
import { BlurBackgroundNode } from "./nodes/blur-background-node";
import { EffectLayerNode } from "./nodes/effect-layer-node";
import { TransitionPairNode } from "./nodes/transition-pair-node";
import type { AnyBaseNode } from "./nodes/base-node";
import type { TBackground, TCanvasSize } from "@/project/types";
import { DEFAULT_BACKGROUND_BLUR_INTENSITY } from "@/background/blur";
import { transitionsRegistry } from "@/transitions";
import type { AdjacentPair } from "@/transitions/timing";
import { subMediaTime, addMediaTime } from "@/wasm";
import {
	buildTransformFromParams,
	readBlendModeFromParams,
	readOpacityFromParams,
} from "@/rendering";

const PREVIEW_MAX_IMAGE_SIZE = 2048;

function getVisibleSortedElements({ track }: { track: TimelineTrack }) {
	return track.elements
		.filter((element) => !("hidden" in element && element.hidden))
		.slice()
		.sort((a, b) => {
			if (a.startTime !== b.startTime) return a.startTime - b.startTime;
			return a.id.localeCompare(b.id);
		});
}

function buildTrackNodes({
	tracks,
	mediaMap,
	canvasSize,
	isPreview,
	pathPrefix,
	backgroundNodes,
}: {
	tracks: TimelineTrack[];
	mediaMap: Map<string, MediaAsset>;
	canvasSize: TCanvasSize;
	isPreview?: boolean;
	pathPrefix: string;
	/** Background nodes (color/blur) prepended to transition sub-scenes. */
	backgroundNodes: AnyBaseNode[];
}): AnyBaseNode[] {
	const nodes: AnyBaseNode[] = [];

	for (const track of tracks) {
		const elements = getVisibleSortedElements({ track });

		// Map of incoming element id → transition source offset in ticks. The
		// incoming clip keeps playing from where the transition left it, so its
		// source time is shifted permanently.
		const incomingSourceOffsets = new Map<string, number>();
		// Map of outgoing element id → transition duration in ticks. The
		// outgoing clip hides itself during the window where the pair node
		// renders the blend instead.
		const outgoingSuppressDurations = new Map<string, number>();

		for (const element of elements) {
			if (element.type !== "video" && element.type !== "image") {
				continue;
			}
			const transition = element.transition;
			if (!transition || !transitionsRegistry.has(transition.type)) {
				continue;
			}
			const pair = findTrackPair({
				track,
				outgoingElementId: element.id,
			});
			if (!pair) {
				continue;
			}
			incomingSourceOffsets.set(
				pair.incoming.id,
				transition.duration,
			);
			outgoingSuppressDurations.set(
				pair.outgoing.id,
				transition.duration,
			);
		}

		for (const element of elements) {
			if (element.type === "effect") {
				nodes.push(
					new EffectLayerNode({
						effectType: element.effectType,
						effectParams: element.params,
						timeOffset: element.startTime,
						duration: element.duration,
					}),
				);
				continue;
			}

			if (element.type === "video" || element.type === "image") {
				const mediaAsset = mediaMap.get(element.mediaId);
				if (!mediaAsset?.file || !mediaAsset?.url) {
					continue;
				}

				// If this element has a transition into the next adjacent
				// element, also render the junction via a TransitionPairNode.
				// The element itself keeps rendering in the main scene outside
				// the transition window (suppressed only inside it).
				const transition = element.transition;
				if (transition && transitionsRegistry.has(transition.type)) {
					const pair = findTrackPair({
						track,
						outgoingElementId: element.id,
					});
					if (pair) {
						const node = buildTransitionPairNode({
							pair,
							transition,
							mediaMap,
							canvasSize,
							isPreview,
							pathPrefix,
							backgroundNodes,
						});
						if (node) {
							nodes.push(node);
						}
					}
				}

				const sourceTimeOffset =
					element.type === "video"
						? (incomingSourceOffsets.get(element.id) ?? 0)
						: 0;
				const transitionSuppressDuration =
					outgoingSuppressDurations.get(element.id) ?? 0;

				if (element.type === "video" && mediaAsset.type === "video") {
					nodes.push(
						new VideoNode({
							mediaId: mediaAsset.id,
							url: mediaAsset.url,
							file: mediaAsset.file,
							duration: element.duration,
							timeOffset: element.startTime,
							fadeIn: Number(element.params.fadeIn ?? 0),
							fadeOut: Number(element.params.fadeOut ?? 0),
							trimStart: element.trimStart,
							trimEnd: element.trimEnd,
							retime: element.retime,
							sourceTimeOffset,
							transitionSuppressDuration,
							transform: buildTransformFromParams({ params: element.params }),
							animations: element.animations,
							opacity: readOpacityFromParams({ params: element.params }),
							blendMode: readBlendModeFromParams({ params: element.params }),
							effects: element.effects ?? [],
							masks: element.masks ?? [],
						}),
					);
				}
				if (element.type === "image" && mediaAsset.type === "image") {
					nodes.push(
						new ImageNode({
							url: mediaAsset.url,
							duration: element.duration,
							timeOffset: element.startTime,
							fadeIn: Number(element.params.fadeIn ?? 0),
							fadeOut: Number(element.params.fadeOut ?? 0),
							trimStart: element.trimStart,
							trimEnd: element.trimEnd,
							transitionSuppressDuration,
							transform: buildTransformFromParams({ params: element.params }),
							animations: element.animations,
							opacity: readOpacityFromParams({ params: element.params }),
							blendMode: readBlendModeFromParams({ params: element.params }),
							effects: element.effects ?? [],
							masks: element.masks ?? [],
							...(isPreview && {
								maxSourceSize: PREVIEW_MAX_IMAGE_SIZE,
							}),
						}),
					);
				}
			}

			if (element.type === "text") {
				nodes.push(
					new TextNode({
						...element,
						transform: buildTransformFromParams({ params: element.params }),
						opacity: readOpacityFromParams({ params: element.params }),
						blendMode: readBlendModeFromParams({ params: element.params }),
						canvasCenter: { x: canvasSize.width / 2, y: canvasSize.height / 2 },
						canvasHeight: canvasSize.height,
						textBaseline: "middle",
						effects: element.effects ?? [],
					}),
				);
			}

			if (element.type === "sticker") {
				nodes.push(
					new StickerNode({
						stickerId: element.stickerId,
						intrinsicWidth: element.intrinsicWidth,
						intrinsicHeight: element.intrinsicHeight,
						duration: element.duration,
						timeOffset: element.startTime,
						fadeIn: Number(element.params.fadeIn ?? 0),
						fadeOut: Number(element.params.fadeOut ?? 0),
						trimStart: element.trimStart,
						trimEnd: element.trimEnd,
						transform: buildTransformFromParams({ params: element.params }),
						animations: element.animations,
						opacity: readOpacityFromParams({ params: element.params }),
						blendMode: readBlendModeFromParams({ params: element.params }),
						effects: element.effects ?? [],
					}),
				);
			}

			if (element.type === "graphic") {
				nodes.push(
					new GraphicNode({
						definitionId: element.definitionId,
						params: element.params,
						duration: element.duration,
						timeOffset: element.startTime,
						fadeIn: Number(element.params.fadeIn ?? 0),
						fadeOut: Number(element.params.fadeOut ?? 0),
						trimStart: element.trimStart,
						trimEnd: element.trimEnd,
						transform: buildTransformFromParams({ params: element.params }),
						animations: element.animations,
						opacity: readOpacityFromParams({ params: element.params }),
						blendMode: readBlendModeFromParams({ params: element.params }),
						effects: element.effects ?? [],
						masks: element.masks ?? [],
					}),
				);
			}
		}
	}

	return nodes;
}

type VideoTrackLike = Extract<TimelineTrack, { type: "video" }>;
type TransitionedElement = VideoTrackLike["elements"][number];

function findTrackPair({
	track,
	outgoingElementId,
}: {
	track: TimelineTrack;
	outgoingElementId: string;
}): {
	outgoing: TransitionedElement;
	incoming: TransitionedElement;
} | null {
	if (track.type !== "video") {
		return null;
	}
	const elements = [...track.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const index = elements.findIndex((element) => element.id === outgoingElementId);
	if (index === -1 || index === elements.length - 1) {
		return null;
	}
	const outgoing = elements[index];
	const incoming = elements[index + 1];
	if (incoming.startTime !== outgoing.startTime + outgoing.duration) {
		return null;
	}
	return { outgoing, incoming };
}

function buildTransitionPairNode({
	pair,
	transition,
	mediaMap,
	canvasSize,
	isPreview,
	pathPrefix,
	backgroundNodes,
}: {
	pair: Pick<AdjacentPair, "outgoing" | "incoming">;
	transition: NonNullable<TransitionedElement["transition"]>;
	mediaMap: Map<string, MediaAsset>;
	canvasSize: TCanvasSize;
	isPreview?: boolean;
	pathPrefix: string;
	backgroundNodes: AnyBaseNode[];
}): TransitionPairNode | null {
	const junctionTime = addMediaTime({
		a: pair.outgoing.startTime,
		b: pair.outgoing.duration,
	});
	// During the transition window the incoming clip is already playing, so
	// its node behaves as if it started `duration` ticks earlier.
	const shiftedIncoming = {
		...pair.incoming,
		startTime: subMediaTime({
			a: pair.incoming.startTime,
			b: transition.duration,
		}),
	};

	const sceneA = buildSingleElementScene({
		element: pair.outgoing,
		mediaMap,
		canvasSize,
		isPreview,
		pathPrefix: `${pathPrefix}:ta`,
		backgroundNodes,
	});
	const sceneB = buildSingleElementScene({
		element: shiftedIncoming,
		mediaMap,
		canvasSize,
		isPreview,
		pathPrefix: `${pathPrefix}:tb`,
		backgroundNodes,
	});

	if (!sceneA || !sceneB) {
		return null;
	}

	return new TransitionPairNode({
		junctionTime,
		transition,
		sceneA,
		sceneB,
	});
}

/** Builds a sub-scene containing just one visual element over the background. */
function buildSingleElementScene({
	element,
	mediaMap,
	canvasSize,
	isPreview,
	pathPrefix,
	backgroundNodes,
}: {
	element: TransitionedElement;
	mediaMap: Map<string, MediaAsset>;
	canvasSize: TCanvasSize;
	isPreview?: boolean;
	pathPrefix: string;
	backgroundNodes: AnyBaseNode[];
}): RootNode | null {
	const nodes = buildTrackNodes({
		tracks: [
			{
				id: `${pathPrefix}-track`,
				name: pathPrefix,
				type: "video",
				muted: false,
				hidden: false,
				elements: [element],
			},
		],
		mediaMap,
		canvasSize,
		isPreview,
		pathPrefix,
		backgroundNodes,
	});
	if (nodes.length === 0) {
		return null;
	}

	const root = new RootNode({ duration: element.duration, pathPrefix });
	for (const node of backgroundNodes) {
		root.add(node);
	}
	for (const node of nodes) {
		root.add(node);
	}
	return root;
}

function buildBlurBackgroundNodes({
	track,
	mediaMap,
	blurIntensity,
}: {
	track: TimelineTrack | undefined;
	mediaMap: Map<string, MediaAsset>;
	blurIntensity: number;
}): AnyBaseNode[] {
	if (!track) {
		return [];
	}

	const nodes: AnyBaseNode[] = [];
	const elements = getVisibleSortedElements({ track });

	for (const element of elements) {
		if (element.type !== "video" && element.type !== "image") {
			continue;
		}

		const mediaAsset = mediaMap.get(element.mediaId);
		if (
			!mediaAsset?.file ||
			!mediaAsset?.url ||
			(mediaAsset.type !== "video" && mediaAsset.type !== "image")
		) {
			continue;
		}

		nodes.push(
			new BlurBackgroundNode({
				mediaId: mediaAsset.id,
				url: mediaAsset.url,
				file: mediaAsset.file,
				mediaType: mediaAsset.type,
				duration: element.duration,
				timeOffset: element.startTime,
				trimStart: element.trimStart,
				trimEnd: element.trimEnd,
				retime: element.type === "video" ? element.retime : undefined,
				blurIntensity,
			}),
		);
	}

	return nodes;
}

export type BuildSceneParams = {
	canvasSize: TCanvasSize;
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
	duration: number;
	background: TBackground;
	isPreview?: boolean;
};

export function buildScene({
	canvasSize,
	tracks,
	mediaAssets,
	duration,
	background,
	isPreview,
}: BuildSceneParams) {
	const rootNode = new RootNode({ duration });
	const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));

	const visibleTracks = [
		...tracks.overlay.filter((track) => !("hidden" in track && track.hidden)),
		...(!tracks.main.hidden ? [tracks.main] : []),
	];
	const orderedTracksBottomToTop = visibleTracks.slice().reverse();
	const mainTrack = tracks.main.hidden ? undefined : tracks.main;

	const backgroundNodes: AnyBaseNode[] = [];
	if (background.type === "blur") {
		backgroundNodes.push(
			...buildBlurBackgroundNodes({
				track: mainTrack,
				mediaMap,
				blurIntensity:
					background.blurIntensity ?? DEFAULT_BACKGROUND_BLUR_INTENSITY,
			}),
		);
	} else if (
		background.type === "color" &&
		background.color !== "transparent"
	) {
		backgroundNodes.push(new ColorNode({ color: background.color }));
	}

	const allNodes = buildTrackNodes({
		tracks: orderedTracksBottomToTop,
		mediaMap,
		canvasSize,
		isPreview,
		pathPrefix: "root",
		backgroundNodes,
	});

	for (const node of backgroundNodes) {
		rootNode.add(node);
	}
	for (const node of allNodes) {
		rootNode.add(node);
	}

	return rootNode;
}
