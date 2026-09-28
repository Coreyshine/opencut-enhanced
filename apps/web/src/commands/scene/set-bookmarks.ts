import { Command, type CommandResult } from "@/commands/base-command";
import { EditorCore } from "@/core";
import type { Bookmark, TScene } from "@/timeline";
import { updateSceneInArray } from "@/timeline/scenes";

/** Replaces the active scene's bookmarks (undoable). Used by beat detection. */
export class SetSceneBookmarksCommand extends Command {
	private savedScenes: TScene[] | null = null;
	private readonly bookmarks: Bookmark[];

	constructor({ bookmarks }: { bookmarks: Bookmark[] }) {
		super();
		this.bookmarks = bookmarks;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) {
			return;
		}

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: { bookmarks: this.bookmarks },
		});

		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}
