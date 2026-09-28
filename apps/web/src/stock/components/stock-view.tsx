"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileUpload } from "@/media/use-file-upload";
import { importLocalFilesToTimeline } from "@/media/import-local";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { mediaTimeFromSeconds } from "@/wasm";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { SearchIcon } from "@hugeicons/core-free-icons";
import { useT } from "@/i18n";
import { HugeiconsIcon } from "@hugeicons/react";

interface StockItem {
	id: string;
	kind: "video" | "photo";
	name: string;
	previewUrl: string;
	downloadUrl: string;
	width?: number;
	height?: number;
	duration?: number;
	author?: string;
	license: string;
	licenseUrl: string;
}

export function StockView() {
	return (
		<PanelView title="Stock">
			<StockContent />
		</PanelView>
	);
}

/** Local media import for the stock panel: files or a whole folder. */
function useLocalMediaImport() {
	const editor = useEditor();
	const { t } = useT();
	const [isImporting, setIsImporting] = useState(false);

	const handleFiles = async ({ files }: { files: File[] }) => {
		const mediaFiles = files.filter(
			(file) =>
				file.type.startsWith("video/") ||
				file.type.startsWith("image/") ||
				file.type.startsWith("audio/"),
		);
		if (mediaFiles.length === 0) {
			toast.error(t("No media files found in the selection"));
			return;
		}
		setIsImporting(true);
		try {
			await importLocalFilesToTimeline({ editor, files: mediaFiles });
		} finally {
			setIsImporting(false);
		}
	};

	const fileUpload = useFileUpload({
		accept: "video/*,image/*,audio/*",
		multiple: true,
		onFilesSelected: (files) => void handleFiles({ files }),
	});
	const folderUpload = useFileUpload({
		directory: true,
		onFilesSelected: (files) => void handleFiles({ files }),
	});

	return {
		isImporting,
		openMediaPicker: fileUpload.openFilePicker,
		openFolderPicker: folderUpload.openFilePicker,
		mediaInputProps: fileUpload.fileInputProps,
	};
}

function StockContent() {
	const editor = useEditor();
	const { t } = useT();
	const {
		isImporting,
		openMediaPicker,
		openFolderPicker,
		mediaInputProps,
	} = useLocalMediaImport();

	const [query, setQuery] = useState("nature");
	const [kind, setKind] = useState<"videos" | "photos">("videos");
	const [items, setItems] = useState<StockItem[]>([]);
	const [configured, setConfigured] = useState(true);
	const [setupMessage, setSetupMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isDownloading, setIsDownloading] = useState<string | null>(null);
	const searchSeq = useRef(0);

	const search = useCallback(
		async ({ q, type }: { q: string; type: "videos" | "photos" }) => {
			const seq = ++searchSeq.current;
			setIsLoading(true);
			try {
				const params = new URLSearchParams({ type, per_page: "24" });
				if (q.trim()) params.set("q", q.trim());
				const response = await fetch(`/api/stock/search?${params.toString()}`);
				const data = await response.json();
				if (seq !== searchSeq.current) return;
				if (!response.ok) {
					if (response.status === 501) {
						setConfigured(false);
						setSetupMessage(data.message ?? data.error);
					} else {
						toast.error(data.error ?? "Stock search failed");
					}
					setItems([]);
					return;
				}
				setConfigured(true);
				setItems(data.items ?? []);
			} catch {
				if (seq === searchSeq.current) {
					toast.error("Stock search failed");
					setItems([]);
				}
			} finally {
				if (seq === searchSeq.current) {
					setIsLoading(false);
				}
			}
		},
		[],
	);

	useEffect(() => {
		void search({ q: query, type: kind });
		// Initial browse only — subsequent searches are user-driven.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const addToProject = async ({ item }: { item: StockItem }) => {
		setIsDownloading(item.id);
		try {
			const response = await fetch(item.downloadUrl);
			if (!response.ok) throw new Error(`Download failed (${response.status})`);
			const blob = await response.blob();
			const extension = item.kind === "video" ? "mp4" : "jpeg";
			const file = new File([blob], `${item.name}.${extension}`, {
				type: item.kind === "video" ? "video/mp4" : "image/jpeg",
			});
			const [asset] = await processMediaAssets({ files: [file] });
			if (!asset) throw new Error("Failed to process the downloaded media");

			const activeProject = editor.project.getActive();
			if (!activeProject) throw new Error("No active project");
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset,
			});
			const mediaId = stored?.id ?? crypto.randomUUID();
			const attributedName = item.author
				? `${item.name} · ${item.author} (${item.license})`
				: `${item.name} (${item.license})`;

			const TPS = 120000;
			const durationTicks =
				item.kind === "video" && (asset.duration ?? 0) > 0
					? mediaTimeFromSeconds({ seconds: asset.duration ?? 5 })
					: mediaTimeFromSeconds({ seconds: 5 });
			const element = buildElementFromMedia({
				mediaId,
				mediaType: item.kind === "video" ? "video" : "image",
				name: attributedName,
				duration: durationTicks,
				startTime: editor.playback.getCurrentTime(),
			});
			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});
			toast.success(`Added "${item.name}" to the timeline`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add stock media",
			);
		} finally {
			setIsDownloading(null);
		}
	};

	if (!configured) {
		return (
			<div className="flex flex-col gap-3 p-5 text-sm">
				<p className="font-medium">Stock media is not configured</p>
				<p className="text-muted-foreground">{setupMessage}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex flex-col gap-2.5 p-4">
				<input {...mediaInputProps} />
				<div className="flex items-center gap-1.5">
					<Button
						variant="outline"
						size="sm"
						disabled={isImporting}
						onClick={openMediaPicker}
						className="items-center justify-center gap-1.5 flex-1"
					>
						{t("Import media")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isImporting}
						onClick={openFolderPicker}
						className="items-center justify-center gap-1.5 flex-1"
					>
						{t("Import folder")}
					</Button>
				</div>
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void search({ q: query, type: kind });
					}}
				>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("Search stock media…")}
						className="h-9"
					/>
					<Button type="submit" size="icon" variant="secondary">
						<HugeiconsIcon icon={SearchIcon} />
					</Button>
				</form>
				<Tabs
					value={kind}
					onValueChange={(value) => {
						const next = value as "videos" | "photos";
						setKind(next);
						void search({ q: query, type: next });
					}}
				>
					<TabsList>
						<TabsTrigger value="videos">{t("Videos")}</TabsTrigger>
						<TabsTrigger value="photos">{t("Photos")}</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				{isLoading ? (
					<p className="text-muted-foreground p-2 text-sm">{t("Searching…")}</p>
				) : items.length === 0 ? (
					<p className="text-muted-foreground p-2 text-sm">{t("No results")}</p>
				) : (
					<div
						className="grid gap-2"
						style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
					>
						{items.map((item) => (
							<button
								key={item.id}
								type="button"
								className={cn(
									"group relative flex flex-col overflow-hidden rounded-md border border-border/60 text-left transition-colors",
									"hover:border-primary/60",
								)}
								onClick={() => void addToProject({ item })}
								disabled={isDownloading !== null}
							>
								<div className="relative aspect-video w-full bg-muted">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={item.previewUrl}
										alt={item.name}
										className="size-full object-cover"
										loading="lazy"
									/>
									<span
										className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[10px] leading-none text-white"
										title={`${item.license} — free for commercial use, no attribution required`}
									>
										{item.license}
									</span>
									{item.duration != null && (
										<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-xs text-white">
											{item.duration}s
										</span>
									)}
									{isDownloading === item.id && (
										<span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
											{t("Downloading…")}
										</span>
									)}
								</div>
								<span className="truncate px-2 py-1.5 text-xs text-foreground/90">
									{item.name}
								</span>
								<span className="truncate px-2 pb-1.5 text-[10px] text-muted-foreground">
									{item.author ? `${t("by")} ${item.author} · ` : ""}
									<a
										href={item.licenseUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="underline hover:text-foreground"
										onClick={(event) => event.stopPropagation()}
									>
										{item.license}
									</a>
								</span>
							</button>
						))}
					</div>
				)}
				<p className="text-muted-foreground mt-3 text-xs">
					{t("Stock media by")}{" "}
					<a
						href="https://www.pexels.com/license/"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground"
					>
						{t("Pexels License")}
					</a>{" "}
					—{" "}
					{t("free for commercial use, no attribution required (appreciated).")}
					{t("Click an item to download and add it at the playhead.")}
				</p>
			</div>
		</div>
	);
}
