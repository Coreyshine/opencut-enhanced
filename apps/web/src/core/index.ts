import { PlaybackManager } from "./managers/playback-manager";
import { TimelineManager } from "./managers/timeline-manager";
import { ScenesManager } from "./managers/scenes-manager";
import { ProjectManager } from "./managers/project-manager";
import { MediaManager } from "./managers/media-manager";
import { RendererManager } from "./managers/renderer-manager";
import { CommandManager } from "./managers/commands";
import { SaveManager } from "./managers/save-manager";
import { AudioManager } from "./managers/audio-manager";
import { SelectionManager } from "./managers/selection-manager";
import { ClipboardManager } from "./managers/clipboard-manager";
import { DiagnosticsManager } from "./managers/diagnostics-manager";
import { registerDefaultEffects } from "@/effects";
import { registerDefaultMasks } from "@/masks";
import { registerDefaultTransitions } from "@/transitions";
import { registerTranscriptionDiagnostics } from "@/transcription/diagnostics";

export class EditorCore {
	/** When true, the post-command reactor skips pruning empty tracks once. */
	suppressEmptyTrackPrune = false;
	private static instance: EditorCore | null = null;
	public readonly timeline: TimelineManager;
	public readonly command: CommandManager;
	public readonly playback: PlaybackManager;
	public readonly scenes: ScenesManager;
	public readonly project: ProjectManager;
	public readonly media: MediaManager;
	public readonly renderer: RendererManager;
	public readonly save: SaveManager;
	public readonly audio: AudioManager;
	public readonly selection: SelectionManager;
	public readonly clipboard: ClipboardManager;
	public readonly diagnostics: DiagnosticsManager;

	private constructor() {
		registerDefaultEffects();
		registerDefaultMasks();
		registerDefaultTransitions();
		// Dev/debug handle: lets tests and console drive the editor singleton.
		if (typeof window !== "undefined") {
			const w = window as unknown as {
				__opencutEditor?: unknown;
				__opencutErrors: string[];
			};
			w.__opencutEditor = this;
			// Persistent error ring buffer installed at app start so failures
			// during the very first render are observable from tests/console.
			if (!Array.isArray(w.__opencutErrors)) {
				w.__opencutErrors = [];
				const record = (label: string, detail: unknown) => {
					const entry = `${label}: ${String(
						(detail as Error)?.stack ?? detail,
					).slice(0, 600)}`;
					const buffer = w.__opencutErrors;
					if (buffer.length < 40) {
						buffer.push(entry);
					}
				};
				window.addEventListener("error", (event) =>
					record("ERROR", event.message),
				);
				window.addEventListener("unhandledrejection", (event) =>
					record("REJECTION", (event as PromiseRejectionEvent).reason),
				);
				const originalConsoleError = console.error.bind(console);
				console.error = (...args: unknown[]) => {
					if (args.length > 0) {
						const rendered = args
							.map((arg) =>
								String((arg as Error)?.stack ?? arg).slice(0, 400),
							)
							.join(" | ");
						record("CONSOLE", rendered);
					}
					originalConsoleError(...args);
				};
			}
		}
		this.command = new CommandManager(this);
		this.timeline = new TimelineManager(this);
		this.playback = new PlaybackManager(this);
		this.scenes = new ScenesManager(this);
		this.project = new ProjectManager(this);
		this.media = new MediaManager(this);
		this.renderer = new RendererManager(this);
		this.save = new SaveManager({ editor: this });
		this.audio = new AudioManager(this);
		this.selection = new SelectionManager(this);
		this.clipboard = new ClipboardManager(this);
		this.diagnostics = new DiagnosticsManager(this);
		registerTranscriptionDiagnostics({ diagnostics: this.diagnostics });
		this.playback.bindTimelineScope();
		this.command.registerReactor(() => {
			if (this.suppressEmptyTrackPrune) {
				this.suppressEmptyTrackPrune = false;
				return;
			}
			const activeScene = this.scenes.getActiveSceneOrNull();
			if (!activeScene) {
				return;
			}

			const tracks = activeScene.tracks;
			const prunedTracks = {
				...tracks,
				overlay: tracks.overlay.filter((track) => track.elements.length > 0),
				audio: tracks.audio.filter((track) => track.elements.length > 0),
			};
			if (
				prunedTracks.overlay.length !== tracks.overlay.length ||
				prunedTracks.audio.length !== tracks.audio.length
			) {
				this.timeline.updateTracks(prunedTracks);
			}
		});
		this.save.start();
	}

	static getInstance(): EditorCore {
		if (!EditorCore.instance) {
			EditorCore.instance = new EditorCore();
			if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
				(window as unknown as { __editor?: EditorCore }).__editor =
					EditorCore.instance;
			}
		}
		return EditorCore.instance;
	}

	static reset(): void {
		EditorCore.instance = null;
	}
}
