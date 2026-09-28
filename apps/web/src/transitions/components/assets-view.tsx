"use client";

import { useMemo } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { transitionsRegistry } from "@/transitions";
import { findAdjacentPair } from "@/transitions/timing";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { SectionTitle } from "@/components/section";
import { useT } from "@/i18n";
import { mediaTimeFromSeconds } from "@/wasm";

export function TransitionsView() {
	return (
		<PanelView title="Transitions">
			<TransitionsContent />
		</PanelView>
	);
}

function TransitionsContent() {
	const editor = useEditor();
	const { t } = useT();
	const { selectedElements } = useElementSelection();

	const junction = useMemo(() => {
		if (selectedElements.length !== 1) return null;
		const [{ trackId, elementId }] = selectedElements;
		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return null;
		const pair = findAdjacentPair({
			tracks: activeScene.tracks,
			trackId,
			outgoingElementId: elementId,
		});
		if (!pair) return null;
		return { trackId, outgoingElementId: elementId };
	}, [editor, selectedElements]);

	const applyTransition = (type: string) => {
		if (!junction) {
			toast.error(
				t("Select a clip that has another clip directly after it on the same track"),
			);
			return;
		}
		const definition = transitionsRegistry.get(type);
		editor.timeline.setTransition({
			trackId: junction.trackId,
			elementId: junction.outgoingElementId,
			transition: {
				type,
				duration: mediaTimeFromSeconds({
					seconds: definition.defaultDurationSeconds,
				}),
			},
		});
	};

	const removeTransition = () => {
		if (!junction) return;
		editor.timeline.setTransition({
			trackId: junction.trackId,
			elementId: junction.outgoingElementId,
			transition: null,
		});
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex items-center justify-between">
				<SectionTitle>{t("All transitions")}</SectionTitle>
				<button
					type="button"
					className={cn(
						"text-xs text-muted-foreground hover:text-foreground transition-colors",
						!junction && "opacity-0 pointer-events-none",
					)}
					onClick={removeTransition}
				>
					{t("Remove")}
				</button>
			</div>
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
			>
				{transitionsRegistry.getAll().map((definition) => (
					<button
						key={definition.type}
						type="button"
						onClick={() => applyTransition(definition.type)}
						className="group flex flex-col items-center gap-1.5 rounded-md p-1.5 transition-colors hover:bg-accent/60"
					>
						<div
							className="aspect-video w-full rounded-md overflow-hidden ring-1 ring-inset ring-black/5 relative"
							style={{
								background: `linear-gradient(120deg, ${definition.swatch[0]}, ${definition.swatch[1]})`,
							}}
						>
							<div
								className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/70"
								aria-hidden
							/>
						</div>
						<span className="text-xs text-foreground/90 truncate w-full text-center">
							{t(definition.name)}
						</span>
					</button>
				))}
			</div>
			<p className="text-xs text-muted-foreground">
				{t(
					"Click a transition to apply it at the cut right after the selected clip. Transitions require two adjacent clips on the same video track.",
				)}
			</p>
		</div>
	);
}
