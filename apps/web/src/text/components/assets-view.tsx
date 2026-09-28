import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useT } from "@/i18n";
import { useEditor } from "@/editor/use-editor";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import type { MediaTime } from "@/wasm";
import { TEXT_PRESETS } from "@/text/presets";
import { TextToSpeechPanel } from "@/tts/components/text-to-speech-panel";

export function TextView() {
	const editor = useEditor();
	const { t } = useT();

	const buildPresetElement = ({
		presetId,
		currentTime,
	}: {
		presetId: string;
		currentTime: MediaTime;
	}) => {
		const preset = TEXT_PRESETS.find((candidate) => candidate.id === presetId);
		if (!preset) return;

		const element = buildTextElement({
			raw: {
				...DEFAULTS.text.element,
				params: {
					...DEFAULTS.text.element.params,
					...preset.params,
					...(typeof preset.params["content"] === "string"
						? {
								content: t(preset.params["content"]),
							}
						: {}),
				},
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<PanelView title={t("Text")} contentClassName="overflow-y-auto">
			<div className="flex h-full flex-col gap-4 p-4">
				<TextToSpeechPanel />
				<div
					className="grid gap-2"
					style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
				>
					{TEXT_PRESETS.map((preset) => (
						<DraggableItem
							key={preset.id}
							name={t(preset.name)}
							preview={
								<div
									className="flex size-full items-center justify-center rounded"
									style={{
										background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
									}}
								>
									<span
										className="text-xs select-none text-center px-1 truncate"
										style={{
											color: preset.params["color"] as string,
											fontWeight: preset.params["fontWeight"] as
												| "normal"
												| "bold"
												| undefined,
											textShadow: preset.params["shadow.enabled"]
												? "1px 1px 2px rgba(0,0,0,0.9)"
												: undefined,
										}}
									>
										{t(String(preset.params["content"] ?? preset.name))}
									</span>
								</div>
							}
							dragData={{
								id: `text-preset-${preset.id}`,
								type: DEFAULTS.text.element.type,
								name: t(preset.name),
								content: t(
									String(preset.params["content"] ?? "Default text"),
								),
								params: preset.params,
							}}
							aspectRatio={1}
							onAddToTimeline={({ currentTime }) =>
								buildPresetElement({ presetId: preset.id, currentTime })
							}
							shouldShowLabel={false}
						/>
					))}
				</div>
			</div>
		</PanelView>
	);
}
