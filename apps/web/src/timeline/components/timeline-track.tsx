"use client";

import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { TimelineElement } from "./timeline-element";
import type { TimelineTrack } from "@/timeline";
import type { TimelineElement as TimelineElementType } from "@/timeline";
import { TIMELINE_LAYERS } from "./layers";
import type { ElementDragView } from "@/timeline";
import { timelineTimeToPixels } from "../pixel-utils";
import { transitionsRegistry } from "@/transitions";
import { findAdjacentPair } from "@/transitions/timing";
import { useEditor } from "@/editor/use-editor";
import type { SceneTracks } from "@/timeline";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeftRightIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

interface TimelineTrackContentProps {
	track: TimelineTrack;
	zoomLevel: number;
	dragView: ElementDragView;
	onResizeStart: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
		side: "left" | "right";
	}) => void;
	onElementMouseDown: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
	}) => void;
	onElementClick: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
	}) => void;
	onTrackMouseDown?: (event: React.MouseEvent) => void;
	onTrackMouseUp?: (event: React.MouseEvent) => void;
	shouldIgnoreClick?: () => boolean;
	targetElementId?: string | null;
}

export function TimelineTrackContent({
	track,
	zoomLevel,
	dragView,
	onResizeStart,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	targetElementId = null,
}: TimelineTrackContentProps) {
	const { isElementSelected } = useElementSelection();
	const editor = useEditor();

	const transitionBadges =
		track.type === "video"
			? buildTransitionBadges({
					track,
					tracks: editor.scenes.getActiveSceneOrNull()?.tracks ?? null,
					zoomLevel,
				})
			: [];

	return (
		<div className="relative size-full">
			<button
				type="button"
				className="absolute inset-0 m-0 size-full appearance-none border-0 bg-transparent p-0"
				aria-label={`Select ${track.name} track`}
				onMouseUp={(event) => {
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			/>
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- spatial gesture surface; the wrapping <button> handles keyboard track selection, this <div> only forwards background clicks for box-select / deselect. */}
			<div
				className="relative h-full min-w-full"
				style={{ zIndex: TIMELINE_LAYERS.trackContent }}
				onMouseUp={(event) => {
					if (event.target !== event.currentTarget) return;
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					if (event.target !== event.currentTarget) return;
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			>
				{transitionBadges.map((badge) => (
					<button
						key={badge.key}
						type="button"
						aria-label={`Edit transition ${badge.name}`}
						className={cn(
							"absolute top-1/2 z-20 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
							"rounded-full border border-background/20 bg-primary text-primary-foreground shadow-md",
							"hover:scale-110 transition-transform",
						)}
						style={{ left: badge.leftPx }}
						onClick={(event) => {
							event.stopPropagation();
							onElementClick({
								event,
								element: badge.element,
								track,
							});
						}}
					>
						<HugeiconsIcon icon={ArrowLeftRightIcon} className="size-3.5" />
					</button>
				))}
				{track.elements.length === 0 ? (
					<div className="text-muted-foreground border-muted/30 pointer-events-none flex size-full items-center justify-center rounded-sm border-2 border-dashed text-xs" />
				) : (
					track.elements.map((element) => {
						const isSelected = isElementSelected({
							trackId: track.id,
							elementId: element.id,
						});

						return (
							<TimelineElement
								key={element.id}
								element={element}
								track={track}
								zoomLevel={zoomLevel}
								isSelected={isSelected}
								onResizeStart={({ event, element, side }) =>
									onResizeStart({ event, element, track, side })
								}
								onElementMouseDown={({ event, element }) =>
									onElementMouseDown({ event, element, track })
								}
								onElementClick={({ event, element }) =>
									onElementClick({ event, element, track })
								}
								dragView={dragView}
								isDropTarget={element.id === targetElementId}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

function buildTransitionBadges({
	track,
	tracks,
	zoomLevel,
}: {
	track: TimelineTrack & { type: "video" };
	tracks: SceneTracks | null;
	zoomLevel: number;
}): Array<{
	key: string;
	leftPx: number;
	name: string;
	element: TimelineElementType;
}> {
	if (!tracks) {
		return [];
	}

	const badges: Array<{
		key: string;
		leftPx: number;
		name: string;
		element: TimelineElementType;
	}> = [];

	for (const element of track.elements) {
		const transition = "transition" in element ? element.transition : undefined;
		if (!transition) continue;
		const definition = transitionsRegistry.getOrNull(transition.type);
		if (!definition) continue;
		const pair = findAdjacentPair({
			tracks,
			trackId: track.id,
			outgoingElementId: element.id,
		});
		if (!pair) continue;

		const junctionTime = element.startTime + element.duration;
		badges.push({
			key: element.id,
			leftPx: timelineTimeToPixels({ time: junctionTime, zoomLevel }),
			name: definition.name,
			element,
		});
	}

	return badges;
}
