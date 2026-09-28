import { BaseNode } from "./base-node";

export type RootNodeParams = {
	duration: number;
	/** Prefix used for texture ids in the frame descriptor so nested
	 * sub-scenes (transition sides) cannot collide with the main scene. */
	pathPrefix?: string;
};

export class RootNode extends BaseNode<RootNodeParams> {
	get duration() {
		return this.params.duration ?? 0;
	}

	get pathPrefix() {
		return this.params.pathPrefix ?? "root";
	}
}
