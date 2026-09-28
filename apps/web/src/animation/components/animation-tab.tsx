"use client";

import { Section, SectionContent, SectionHeader, SectionTitle } from "@/components/section";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { ANIMATION_PRESETS } from "@/animation/presets";
import type { AnimationPresetPhase } from "@/animation/presets";
import type { ElementAnimations } from "@/animation/types";
import { useEditor } from "@/editor/use-editor";
import { useElementPreview } from "@/timeline/hooks/use-element-preview";
import type { VisualElement } from "@/timeline";
import { cn } from "@/utils/ui";

const PHASE_LABELS: Record<AnimationPresetPhase, string> = {
	in: "Entrance",
	out: "Exit",
	loop: "Loop",
};

export function AnimationTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { renderElement } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const current = renderElement as VisualElement;

	const applyPreset = (presetId: string) => {
		const preset = ANIMATION_PRESETS.find(
			(candidate) => candidate.id === presetId,
		);
		if (!preset) return;

		const canvasSize = editor.project.getActive()?.settings.canvasSize ?? {
			width: 1920,
			height: 1080,
		};
		const animations = preset.build({
			durationTicks: current.duration,
			basePosition: {
				x: Number(current.params["transform.positionX"] ?? 0),
				y: Number(current.params["transform.positionY"] ?? 0),
			},
			canvasSize,
			presetDurationSeconds: preset.defaultDurationSeconds,
		});

		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						animations: {
							...(current.animations ?? {}),
							...animations,
						} as ElementAnimations,
					},
				},
			],
		});
	};

	const clearAnimations = () => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: { animations: {} as ElementAnimations },
				},
			],
		});
	};

	const hasAnimations = Object.keys(current.animations ?? {}).length > 0;

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center justify-between">
				<SectionTitle>Animation</SectionTitle>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Clear animations"
					disabled={!hasAnimations}
					onClick={clearAnimations}
				>
					<HugeiconsIcon icon={Delete02Icon} />
				</Button>
			</div>
			{(["in", "out", "loop"] as AnimationPresetPhase[]).map((phase) => (
				<Section key={phase} sectionKey={`animation-${phase}`}>
					<SectionHeader>
						<SectionTitle>{PHASE_LABELS[phase]}</SectionTitle>
					</SectionHeader>
					<SectionContent>
						<div
							className="grid gap-2"
							style={{
								gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
							}}
						>
							{ANIMATION_PRESETS.filter(
								(preset) => preset.phase === phase,
							).map((preset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => applyPreset(preset.id)}
									className={cn(
										"rounded-md border border-border/60 px-2 py-3 text-xs transition-colors",
										"hover:border-primary/60 hover:bg-accent/60",
									)}
								>
									{preset.name}
								</button>
							))}
						</div>
					</SectionContent>
				</Section>
			))}
			<p className="px-4 pb-4 text-xs text-muted-foreground">
				Presets bake keyframes onto this clip — tweak them afterwards in the
				timeline or graph editor.
			</p>
		</div>
	);
}
