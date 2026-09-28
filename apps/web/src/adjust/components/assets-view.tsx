"use client";

import { useT } from "@/i18n";

import { useMemo } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	FILTER_PRESETS,
	DEFAULT_FILTER_INTENSITY,
	getFilterPreset,
} from "@/effects/definitions/filters";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { SectionTitle } from "@/components/section";

const FILTER_CATEGORIES: Array<{
	id:
		| "natural"
		| "film"
		| "portrait"
		| "food"
		| "scenery"
		| "mono"
		| "retro"
		| "city";
	label: string;
}> = [
	{ id: "natural", label: "Natural" },
	{ id: "film", label: "Film" },
	{ id: "portrait", label: "Portrait" },
	{ id: "food", label: "Food" },
	{ id: "scenery", label: "Scenery" },
	{ id: "mono", label: "Mono" },
	{ id: "retro", label: "Retro" },
	{ id: "city", label: "City" },
];

export function AdjustmentView() {
	return (
		<PanelView title="Adjustment">
			<AdjustmentContent />
		</PanelView>
	);
}

function AdjustmentContent() {
	const { t } = useT();
	const editor = useEditor();
	const { selectedElements } = useElementSelection();

	const target = useMemo(() => {
		if (selectedElements.length !== 1) return null;
		const withTrack = editor.timeline
			.getElementsWithTracks({ elements: selectedElements })
			.find(({ element }) => "effects" in element);
		return withTrack ?? null;
	}, [editor, selectedElements]);

	const visualElement =
		target?.element && "effects" in target.element
			? target.element
			: null;

	const applyFilter = (presetId: string) => {
		if (!target || !visualElement) {
			toast.error("Select a clip on the timeline first");
			return;
		}
		const preset = getFilterPreset({ id: presetId });
		if (!preset) return;

		// Replace any existing filter effect so presets switch in one click.
		const existingFilters = (visualElement.effects ?? []).filter(
			(effect) => effect.type === "filter",
		);
		for (const effect of existingFilters) {
			editor.timeline.removeClipEffect({
				trackId: target.track.id,
				elementId: visualElement.id,
				effectId: effect.id,
			});
		}
		editor.timeline.addClipEffect({
			trackId: target.track.id,
			elementId: visualElement.id,
			effectType: "filter",
			params: { preset: preset.id, intensity: DEFAULT_FILTER_INTENSITY },
		});
	};

	const removeFilter = () => {
		if (!target || !visualElement) return;
		const existingFilters = (visualElement.effects ?? []).filter(
			(effect) => effect.type === "filter",
		);
		for (const effect of existingFilters) {
			editor.timeline.removeClipEffect({
				trackId: target.track.id,
				elementId: visualElement.id,
				effectId: effect.id,
			});
		}
	};

	const activeFilterId = useMemo(() => {
		if (!visualElement) {
			return null;
		}
		const filterEffect = visualElement.effects?.find(
			(effect) => effect.type === "filter",
		);
		return filterEffect ? String(filterEffect.params.preset ?? "") : null;
	}, [visualElement]);

	return (
		<div className="flex flex-col gap-5 p-4">
			<FilterSection
				activeFilterId={activeFilterId}
				hasSelection={Boolean(visualElement)}
				onApply={applyFilter}
				onRemove={removeFilter}
			/>
		</div>
	);
}

function FilterSection({
	activeFilterId,
	hasSelection,
	onApply,
	onRemove,
}: {
	activeFilterId: string | null;
	hasSelection: boolean;
	onApply: (presetId: string) => void;
	onRemove: () => void;
}) {
	const { t } = useT();
	return (
		<>
			<div className="flex items-center justify-between">
				<SectionTitle>{t("Filters")}</SectionTitle>
				<button
					type="button"
					className={cn(
						"text-xs text-muted-foreground hover:text-foreground transition-colors",
						!activeFilterId && "opacity-0 pointer-events-none",
					)}
					onClick={onRemove}
				>
					{t("Remove filter")}
				</button>
			</div>
			{FILTER_CATEGORIES.map((category) => (
				<div key={category.id} className="flex flex-col gap-2">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						{t(category.label)}
					</p>
					<div
						className="grid gap-2"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
						}}
					>
						{FILTER_PRESETS.filter(
							(preset) => preset.category === category.id,
						).map((preset) => (
							<FilterPresetCard
								key={preset.id}
								preset={preset}
								isActive={activeFilterId === preset.id}
								hasSelection={hasSelection}
								onApply={() => onApply(preset.id)}
							/>
						))}
					</div>
				</div>
			))}
		</>
	);
}

function FilterPresetCard({
	preset,
	isActive,
	hasSelection,
	onApply,
}: {
	preset: (typeof FILTER_PRESETS)[number];
	isActive: boolean;
	hasSelection: boolean;
	onApply: () => void;
}) {
	const { t } = useT();
	return (
		<button
			type="button"
			onClick={onApply}
			className={cn(
				"group flex flex-col items-center gap-1.5 rounded-md p-1.5 transition-colors",
				"hover:bg-accent/60",
				isActive && "bg-accent",
				!hasSelection && "opacity-70",
			)}
		>
			<div
				className={cn(
					"aspect-square w-full rounded-md overflow-hidden",
					"ring-1 ring-inset ring-black/5",
					isActive && "ring-2 ring-primary",
				)}
				style={{
					background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
				}}
			/>
			<span className="text-xs text-foreground/90 truncate w-full text-center">
				{t(preset.name)}
			</span>
		</button>
	);
}
