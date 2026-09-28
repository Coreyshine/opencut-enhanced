import { BaseNode } from "./base-node";
import type { AnyBaseNode } from "./base-node";
import type { ElementTransition } from "@/transitions/types";
import type { MediaTime } from "@/wasm";

export type TransitionPairNodeParams = {
	/** Timeline end time (ticks) of the outgoing element. */
	junctionTime: MediaTime;
	transition: ElementTransition;
	/** Pre-built scene rendering only the outgoing element (plus background). */
	sceneA: AnyBaseNode;
	/** Pre-built scene rendering only the incoming element (plus background). */
	sceneB: AnyBaseNode;
};

export interface ResolvedTransitionPairNodeState {
	canvas: OffscreenCanvas;
	/** Monotonic content key: progress quantized to the frame grid plus params. */
	contentKey: string;
}

export class TransitionPairNode extends BaseNode<
	TransitionPairNodeParams,
	ResolvedTransitionPairNodeState
> {}
