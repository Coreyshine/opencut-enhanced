"use client";

import { useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/editor/use-editor";
import {
	BUILTIN_TEMPLATES,
	buildTemplateInserts,
	listUserTemplates,
	saveCurrentSceneAsTemplate,
	type EditorTemplate,
} from "@/templates";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { useT } from "@/i18n";
import type { CreateTimelineElement } from "@/timeline";

export function TemplatesView() {
	return (
		<PanelView title="Templates">
			<TemplatesContent />
		</PanelView>
	);
}

function TemplatesContent() {
	const editor = useEditor();
	const { t } = useT();
	const [userTemplates, setUserTemplates] = useState<EditorTemplate[]>(() =>
		listUserTemplates(),
	);
	const [newName, setNewName] = useState("");

	const allTemplates = useMemo(
		() => [...BUILTIN_TEMPLATES, ...userTemplates],
		[userTemplates],
	);

	const applyTemplate = ({ template }: { template: EditorTemplate }) => {
		const canvasSize = editor.project.getActive()?.settings.canvasSize ?? {
			width: 1920,
			height: 1080,
		};
		const startTime = editor.playback.getCurrentTime();
		const inserts = buildTemplateInserts({
			template,
			startTime,
			canvasSize,
		});
		for (const insert of inserts) {
			editor.timeline.insertElement({
				element: insert as CreateTimelineElement,
				placement: { mode: "auto" },
			});
		}
		toast.success(
			t('Applied "{name}" at the playhead').replace(
				"{name}",
				t(template.name),
			),
		);
	};

	const saveTemplate = () => {
		const name = newName.trim() || `Template ${new Date().toLocaleTimeString()}`;
		const result = saveCurrentSceneAsTemplate({ editor, name });
		if (result.success) {
			setUserTemplates(listUserTemplates());
			setNewName("");
			toast.success(
				t("Saved template with {n} element(s)").replace(
					"{n}",
					String(result.elementCount ?? 0),
				),
			);
		} else {
			toast.error(t(result.error ?? "Failed to save template"));
		}
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
				<p className="text-sm font-medium">{t("Save current text/graphics")}</p>
				<div className="flex gap-2">
					<Input
						value={newName}
						onChange={(event) => setNewName(event.target.value)}
						placeholder={t("Template name…")}
						className="h-9"
					/>
					<Button size="sm" onClick={saveTemplate}>
						{t("Save")}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					{t(
						"Saves the text and graphic clips in this scene as a reusable local template.",
					)}
				</p>
			</div>

			{BUILTIN_TEMPLATES.length + userTemplates.length > 0 && (
				<div className="flex flex-col gap-2">
					{allTemplates.map((template) => (
						<button
							key={template.id}
							type="button"
							onClick={() => applyTemplate({ template })}
							className={cn(
								"flex flex-col gap-0.5 rounded-md border border-border/60 p-3 text-left transition-colors",
								"hover:border-primary/60 hover:bg-accent/60",
							)}
						>
							<span className="text-sm font-medium">
								{t(template.name)}
								{!template.builtin && (
									<span className="ml-1.5 text-xs text-muted-foreground">
										(local)
									</span>
								)}
							</span>
							<span className="text-xs text-muted-foreground">
								{t(template.description)}
							</span>
						</button>
					))}
				</div>
			)}
			<p className="text-xs text-muted-foreground">
				{t("Click a template to insert its elements at the playhead.")}
			</p>
		</div>
	);
}
