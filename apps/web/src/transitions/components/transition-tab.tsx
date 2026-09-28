"use client";

import { useT } from "@/i18n";

import { useMemo } from "react";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
	SectionFields,
} from "@/components/section";
import { PropertyParamField } from "@/components/editor/panels/properties/components/property-param-field";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { transitionsRegistry } from "@/transitions";
import { findAdjacentPair, maxTransitionDurationSeconds } from "@/transitions/timing";
import { useEditor } from "@/editor/use-editor";
import { useElementPreview } from "@/timeline/hooks/use-element-preview";
import type { ImageElement, TimelineElement, VideoElement } from "@/timeline";
import type { ParamValue } from "@/params";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/wasm";

type TransitionedElement = VideoElement | ImageElement;

const durationParam = {
	key: "duration",
	label: "Duration",
	type: "number" as const,
	default: 0.5,
	min: 0.1,
	max: 2,
	step: 0.1,
	keyframable: false,
};

const typeParam = {
	key: "type",
	label: "Type",
	type: "select" as const,
	default: "",
	keyframable: false,
	options: [],
};

export function TransitionTab({
	element,
	trackId,
}: {
	element: TransitionedElement;
	trackId: string;
}) {
	const { t } = useT();
	const editor = useEditor();
	const { renderElement, previewUpdates, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const current =
		(renderElement as TransitionedElement).transition ?? element.transition;

	const pair = useMemo(() => {
		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return null;
		return findAdjacentPair({
			tracks: activeScene.tracks,
			trackId,
			outgoingElementId: element.id,
		});
	}, [editor, trackId, element.id]);

	const maxSeconds = pair ? maxTransitionDurationSeconds({ pair }) : 2;

	if (!current) {
		return (
			<div className="flex flex-col h-full items-center justify-center gap-4 text-center">
				<div className="flex flex-col gap-2">
					<h3 className="font-medium text-foreground">{t("No transition")}</h3>
					<p className="text-muted-foreground text-sm text-balance max-w-44">
						{t("Add one from the Transitions panel in the assets sidebar.")}
					</p>
				</div>
			</div>
		);
	}

	const definition = transitionsRegistry.getOrNull(current.type);

	if (!definition) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				Unknown transition type "{current.type}".
			</div>
		);
	}

	const setTransition = (patch: { type?: string; durationSeconds?: number }) => {
		const nextType = patch.type ?? current.type;
		const nextDefinition = transitionsRegistry.getOrNull(nextType);
		if (!nextDefinition) return;
		const durationSeconds = Math.max(
			0.1,
			Math.min(
				maxSeconds,
				patch.durationSeconds ??
					mediaTimeToSeconds({ time: current.duration }),
			),
		);
		editor.timeline.setTransition({
			trackId,
			elementId: element.id,
			transition: {
				type: nextType,
				duration: mediaTimeFromSeconds({ seconds: durationSeconds }),
				params: current.params,
			},
		});
	};

	const previewType = (value: ParamValue) => {
		previewUpdates({
			transition: { ...current, type: String(value) },
		} as Partial<TimelineElement>);
	};

	const previewDuration = (value: ParamValue) => {
		const seconds = Math.max(0.1, Math.min(maxSeconds, Number(value)));
		previewUpdates({
			transition: {
				...current,
				duration: mediaTimeFromSeconds({ seconds }),
			},
		} as Partial<TimelineElement>);
	};

	const typeSelectParam = {
		...typeParam,
		options: transitionsRegistry.getAll().map((definition) => ({
			value: definition.type,
			label: definition.name,
		})),
	};

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center justify-between">
				<SectionTitle>{t("Transition")}</SectionTitle>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("Remove transition")}
					onClick={() =>
						editor.timeline.setTransition({
							trackId,
							elementId: element.id,
							transition: null,
						})
					}
				>
					<HugeiconsIcon icon={Delete02Icon} />
				</Button>
			</div>
			<Section sectionKey="transition" showTopBorder={false}>
				<SectionHeader>
					<SectionTitle>{t(definition.name)}</SectionTitle>
				</SectionHeader>
				<SectionContent className="p-0">
					<SectionFields>
						<div className="flex flex-col gap-3.5">
							<div className="px-4">
								<PropertyParamField
									param={typeSelectParam}
									value={current.type}
									onPreview={previewType}
									onCommit={commit}
								/>
							</div>
							<div className="px-4">
								<PropertyParamField
									param={durationParam}
									value={mediaTimeToSeconds({ time: current.duration })}
									onPreview={previewDuration}
									onCommit={commit}
								/>
							</div>
						</div>
					</SectionFields>
				</SectionContent>
			</Section>
			<p className="px-4 text-xs text-muted-foreground">
				{t("Maximum duration for this cut:")} {maxSeconds.toFixed(1)}s
			</p>
		</div>
	);
}
