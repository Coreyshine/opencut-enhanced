import { useState, useRef } from "react";
import { useEditor } from "@/editor/use-editor";

interface UseFileUploadOptions {
	accept?: string;
	multiple?: boolean;
	/** Opens the OS folder picker (webkitdirectory) instead of single files. */
	directory?: boolean;
	onFilesSelected?: (files: File[]) => void;
}

export function useFileUpload({
	accept,
	multiple,
	directory,
	onFilesSelected,
}: UseFileUploadOptions = {}) {
	const editor = useEditor();
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounterRef = useRef(0);
	const inputRef = useRef<HTMLInputElement>(null);

	function containsFiles(dataTransfer: DataTransfer): boolean {
		return (
			!editor.timeline.dragSource.isActive() &&
			dataTransfer.types.includes("Files")
		);
	}

	function openFilePicker() {
		if (!inputRef.current) return;

		if (directory) {
			// Folder picker: accept is ignored by the browser; every file under
			// the chosen folder arrives in files[] (webkitRelativePath set).
			inputRef.current.removeAttribute("accept");
			inputRef.current.multiple = true;
			inputRef.current.setAttribute("webkitdirectory", "");
			inputRef.current.setAttribute("directory", "");
		} else {
			inputRef.current.accept = accept || "*";
			inputRef.current.multiple = multiple || false;
			inputRef.current.removeAttribute("webkitdirectory");
			inputRef.current.removeAttribute("directory");
		}
		inputRef.current.click();
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		if (files.length > 0 && onFilesSelected) {
			onFilesSelected(files);
		}

		if (event.target) {
			event.target.value = "";
		}
	}

	function handleDragEnter(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current += 1;
		setIsDragOver(true);
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current -= 1;
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setIsDragOver(false);
		dragCounterRef.current = 0;

		if (onFilesSelected && containsFiles(e.dataTransfer)) {
			const files = Array.from(e.dataTransfer.files);
			const shouldUseMultiple = multiple ?? false;

			if (shouldUseMultiple) {
				onFilesSelected(files);
			} else if (files.length > 0) {
				onFilesSelected([files[0]]);
			}
		}
	}

	return {
		isDragOver,
		openFilePicker,
		fileInputProps: {
			ref: inputRef,
			type: "file",
			style: { display: "none" },
			onChange: handleFileChange,
		},
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}
