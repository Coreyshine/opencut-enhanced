import { Command, type CommandResult } from "@/commands/base-command";
import { EditorCore } from "@/core";
import { updateElementInSceneTracks } from "@/timeline";
import type { ElementTransition } from "@/transitions/types";
import type { ImageElement, SceneTracks, TimelineElement, VideoElement } from "@/timeline";

type TransitionedElement = VideoElement | ImageElement;

function isTransitionedElement(element: TimelineElement): boolean {
	return element.type === "video" || element.type === "image";
}

export class SetTransitionCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly transition: ElementTransition | null;

	constructor({
		trackId,
		elementId,
		transition,
	}: {
		trackId: string;
		elementId: string;
		transition: ElementTransition | null;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.transition = transition;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const updatedTracks = updateElementInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isTransitionedElement,
			update: (element) => {
				const next: TransitionedElement = { ...(element as TransitionedElement) };
				if (this.transition) {
					next.transition = this.transition;
				} else {
					delete next.transition;
				}
				return next;
			},
		});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
