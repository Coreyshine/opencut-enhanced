"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/editor/use-editor";
import {
	removeWatermarkFromImage,
	type MaskStroke,
} from "@/media/watermark-removal";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface WatermarkMaskEditorProps {
	file: File;
	name: string;
	onClose: () => void;
}

export function WatermarkMaskEditor({
	file,
	name,
	onClose,
}: WatermarkMaskEditorProps) {
	const editor = useEditor();
	const { t } = useT();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const [strokes, setStrokes] = useState<MaskStroke[]>([]);
	const [brushSize, setBrushSize] = useState(0.03);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isDrawing, setIsDrawing] = useState(false);
	const isDrawingRef = useRef(false);
	const [ready, setReady] = useState(false);
	const objectUrl = useRef<string | null>(null);

	// Load image
	useEffect(() => {
		const url = URL.createObjectURL(file);
		objectUrl.current = url;
		const img = new Image();
		img.onload = () => {
			imageRef.current = img;
			const canvas = canvasRef.current;
			if (canvas) {
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext("2d");
				ctx?.drawImage(img, 0, 0);
			}
			setReady(true);
		};
		img.src = url;
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [file]);

	const redraw = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img || !ready) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Reset to original image
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0);

		// Draw strokes as semi-transparent red overlay
		ctx.strokeStyle = "rgba(255, 60, 60, 0.5)";
		ctx.fillStyle = "rgba(255, 60, 60, 0.5)";
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		for (const stroke of strokes) {
			ctx.lineWidth = stroke.size * canvas.width;
			ctx.beginPath();
			for (let i = 0; i < stroke.points.length; i++) {
				const px = stroke.points[i].x * canvas.width;
				const py = stroke.points[i].y * canvas.height;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			if (stroke.points.length === 1) {
				const p = stroke.points[0];
				ctx.arc(
					p.x * canvas.width,
					p.y * canvas.height,
					(stroke.size * canvas.width) / 2,
					0,
					6.2831853,
				);
				ctx.fill();
			} else {
				ctx.stroke();
			}
		}
	}, [strokes, ready]);

	useEffect(() => {
		redraw();
	}, [strokes, redraw]);

	const getCoords = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;
			const rect = canvas.getBoundingClientRect();
			return {
				x: (e.clientX - rect.left) / rect.width,
				y: (e.clientY - rect.top) / rect.height,
			};
		},
		[],
	);

	const onDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!ready || isProcessing) return;
			const pos = getCoords(e);
			if (!pos) return;
			isDrawingRef.current = true;
			setIsDrawing(true);
			setStrokes((prev) => [...prev, { points: [pos], size: brushSize }]);
		},
		[ready, isProcessing, brushSize, getCoords],
	);

	const onMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDrawingRef.current || !ready || isProcessing) return;
			const pos = getCoords(e);
			if (!pos) return;
			setStrokes((prev) => {
				const last = prev[prev.length - 1];
				if (!last) return prev;
				return [
					...prev.slice(0, -1),
					{ ...last, points: [...last.points, pos] },
				];
			});
		},
		[getCoords],
	);

	const onUp = useCallback(() => {
		isDrawingRef.current = false;
		setIsDrawing(false);
	}, []);

	const handleRemove = async () => {
		if (strokes.length === 0) {
			toast.error("Paint over the watermark area first");
			return;
		}
		setIsProcessing(true);
		try {
			const activeProject = editor.project.getActive();
			if (!activeProject) {
				toast.error("No active project");
				return;
			}
			const result = await removeWatermarkFromImage({
				editor,
				projectId: activeProject.metadata.id,
				file,
				name,
				strokes,
			});
			if (result.success) {
				toast.success(
					`Watermark removed — "${result.name}" added to assets`,
				);
				onClose();
			} else {
				toast.error(result.error ?? "Watermark removal failed");
			}
		} catch {
			toast.error("An unexpected error occurred");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
			<div className="flex max-h-[92vh] max-w-[92vw] flex-col rounded-lg border bg-background p-4 shadow-xl">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-sm font-medium">
						{t(t("Paint over the watermark, then click Remove"))}
					</h3>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">
							{t(t("Brush size"))}
						</span>
						<Slider
							value={[brushSize * 100]}
							onValueChange={([v]) => setBrushSize(v / 100)}
							min={1}
							max={15}
							step={0.5}
							className="w-20"
						/>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setStrokes([])}
							disabled={strokes.length === 0 || isProcessing}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				</div>

				<div className="relative flex-1 overflow-hidden rounded border bg-muted">
					<canvas
						ref={(node) => {
							canvasRef.current = node;
							if (node && file && !ready) {
								const img = new Image();
								img.onload = () => {
									imageRef.current = img;
									node.width = img.naturalWidth;
									node.height = img.naturalHeight;
									const ctx = node.getContext("2d");
									ctx?.drawImage(img, 0, 0);
									setReady(true);
								};
								img.src = URL.createObjectURL(file);
							}
						}}
						className="mx-auto max-h-[62vh] max-w-full cursor-crosshair object-contain"
						onMouseDown={onDown}
						onMouseMove={onMove}
						onMouseUp={onUp}
						onMouseLeave={onUp}
					/>
				</div>

				<div className="mt-3 flex items-center justify-end gap-2">
					<Button variant="outline" onClick={onClose} disabled={isProcessing}>
						{t(t("取消"))}
					</Button>
					<Button
						onClick={() => void handleRemove()}
						disabled={isProcessing || strokes.length === 0}
					>
						{isProcessing
							? t("Removing watermark…")
							: t(t("移除水印"))}
					</Button>
				</div>
			</div>
		</div>
	);
}

import { useT } from "@/i18n";
