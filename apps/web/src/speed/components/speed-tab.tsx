import { useRef } from "react";
import { useEditor } from "@/editor/use-editor";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSpeed02Icon } from "@hugeicons/core-free-icons";
import {
	buildConstantRetime,
	buildCurveFromPreset,
	getCurveAverageRate,
	SPEED_CURVE_PRESETS,
} from "@/retime";
import {
	DEFAULT_RETIME_RATE,
	MIN_RETIME_RATE,
	MAX_RETIME_RATE,
	clampRetimeRate,
	canMaintainPitch,
} from "@/retime/rate";
import type { AudioElement, VideoElement } from "@/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { usePropertyDraft } from "@/components/editor/panels/properties/hooks/use-property-draft";
import {
	formatNumberForDisplay,
	getFractionDigitsForStep,
	snapToStep,
} from "@/utils/math";
import { cn } from "@/utils/ui";
import { useT } from "@/i18n";

const SPEED_STEP = 0.01;
const SPEED_FRACTION_DIGITS = getFractionDigitsForStep({ step: SPEED_STEP });

function rateToDisplay({ rate }: { rate: number }): string {
	return formatNumberForDisplay({
		value: rate,
		fractionDigits: SPEED_FRACTION_DIGITS,
	});
}

function parseSpeedInput({ input }: { input: string }): number | null {
	const parsed = parseFloat(input);
	if (Number.isNaN(parsed)) return null;
	return clampRetimeRate({
		rate: snapToStep({ value: parsed, step: SPEED_STEP }),
	});
}

function buildRetime({
	rate,
	maintainPitch,
}: {
	rate: number;
	maintainPitch: boolean;
}) {
	if (rate === DEFAULT_RETIME_RATE && !maintainPitch) return undefined;
	return buildConstantRetime({ rate, maintainPitch });
}

function CurveGlyph({ points }: { points: Array<[number, number]> }) {
	const width = 64;
	const height = 28;
	const maxRate = Math.max(...points.map(([, rate]) => rate), 2);
	const path = points
		.map(([t, rate], index) => {
			const x = t * width;
			const y = height - (rate / maxRate) * (height - 4) - 2;
			return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="text-foreground/70"
		>
			<path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
		</svg>
	);
}

export function SpeedTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { t } = useT();
	const rate = clampRetimeRate({
		rate: element.retime?.rate ?? DEFAULT_RETIME_RATE,
	});
	const isPitchPreserveAvailable = canMaintainPitch({ rate });
	const maintainPitch = element.retime?.maintainPitch ?? false;
	const pendingRateRef = useRef(rate);

	const commitRetime = ({
		rate: nextRate,
		maintainPitch: nextMaintainPitch,
	}: {
		rate: number;
		maintainPitch: boolean;
	}) => {
		editor.timeline.updateElementRetime({
			trackId,
			elementId: element.id,
			retime: buildRetime({ rate: nextRate, maintainPitch: nextMaintainPitch }),
		});
	};

	const applyCurvePreset = ({ presetId }: { presetId: string }) => {
		const preset = SPEED_CURVE_PRESETS.find(
			(candidate) => candidate.id === presetId,
		);
		if (!preset || element.duration <= 0) return;
		const curve = buildCurveFromPreset({
			preset,
			durationTicks: element.duration,
		});
		// Anchor the audio rate at the curve average so sound roughly tracks.
		const averageRate = Math.round(getCurveAverageRate({ curve }) * 100) / 100;
		editor.timeline.updateElementRetime({
			trackId,
			elementId: element.id,
			retime: {
				rate: averageRate,
				maintainPitch,
				curve,
			},
		});
	};

	const clearCurve = () => {
		editor.timeline.updateElementRetime({
			trackId,
			elementId: element.id,
			retime: buildRetime({ rate, maintainPitch }),
		});
	};

	const speedDraft = usePropertyDraft({
		displayValue: rateToDisplay({ rate }),
		parse: (input) => parseSpeedInput({ input }),
		onPreview: (nextRate) => {
			pendingRateRef.current = nextRate;
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: {
							retime: buildRetime({ rate: nextRate, maintainPitch }),
						},
					},
				],
			});
		},
		onCommit: () => {
			commitRetime({ rate: pendingRateRef.current, maintainPitch });
		},
	});

	const hasCurve = Boolean(element.retime?.curve);

	return (
		<Section collapsible sectionKey={`${element.id}:speed`}>
			<SectionHeader>
				<SectionTitle>Speed</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label={t("Speed")}>
						<NumberField
							icon={<HugeiconsIcon icon={DashboardSpeed02Icon} />}
							value={speedDraft.displayValue}
							suffix="x"
							scrubRanges={[
								{ from: 0.01, to: 1, pixelsPerUnit: 160 },
								{ from: 1, to: 5, pixelsPerUnit: 48 },
							]}
							scrubClamp={{ min: MIN_RETIME_RATE, max: MAX_RETIME_RATE }}
							onFocus={() => {
								pendingRateRef.current = rate;
								speedDraft.onFocus();
							}}
							onChange={speedDraft.onChange}
							onBlur={speedDraft.onBlur}
							onScrub={speedDraft.scrubTo}
							onScrubEnd={speedDraft.commitScrub}
							onReset={() =>
								commitRetime({ rate: DEFAULT_RETIME_RATE, maintainPitch })
							}
							isDefault={rate === DEFAULT_RETIME_RATE}
						/>
					</SectionField>
					<div className="flex items-center justify-between">
						<span className="text-sm">{t("Change pitch")}</span>
						<Switch
							checked={!maintainPitch}
							disabled={!isPitchPreserveAvailable}
							onCheckedChange={(checked) =>
								commitRetime({ rate, maintainPitch: !checked })
							}
						/>
					</div>
				</SectionFields>
			</SectionContent>

			<Section sectionKey={`${element.id}:speed-curve`}>
				<SectionHeader
					trailing={
						hasCurve ? (
							<button
								type="button"
								className="text-xs text-muted-foreground hover:text-foreground"
								onClick={clearCurve}
							>
								Clear
							</button>
						) : null
					}
				>
					<SectionTitle>{t("Speed Curve")}</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<p className="text-xs text-muted-foreground mb-2">
						Presets ramp the speed across the clip. Video follows the curve;
						audio plays at the average rate.
					</p>
					<div className="grid grid-cols-2 gap-2">
						{SPEED_CURVE_PRESETS.map((preset) => {
							const isActive =
								element.retime?.curve != null &&
								JSON.stringify(
									element.retime.curve.points.map((p) => [
										Number((p.t / Math.max(1, element.duration)).toFixed(2)),
										Number(p.rate.toFixed(2)),
									]),
								) ===
									JSON.stringify(
										preset.points.map(([t, r]) => [t, r]),
									);
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => applyCurvePreset({ presetId: preset.id })}
									className={cn(
										"flex flex-col items-center gap-1 rounded-md border border-border/60 px-2 py-2.5 transition-colors",
										"hover:border-primary/60 hover:bg-accent/60",
										isActive && "border-primary bg-accent",
									)}
								>
									<CurveGlyph points={preset.points} />
									<span className="text-xs">{t(preset.name)}</span>
								</button>
							);
						})}
					</div>
				</SectionContent>
			</Section>
		</Section>
	);
}
