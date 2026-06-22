/**
 * Band mode Stage 1 — drum guide export dispatch (minimal branch off midiDrumGuideWriter).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerationMetadata } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import {
  artRockDrumGuideTicksForBar,
  buildArtRockBandDrumGuideBars,
  shouldUseArtRockMosaicDrumGuide,
  type ArtRockDrumGuideSource,
} from './artRockBandDrumGuide';
import {
  PPQ,
  reduceToBeatOnsets,
  writeDrumGuideMidi,
  type DrumGuideBar,
} from './midiDrumGuideWriter';

export type MosaicSectionPlanSlice = NonNullable<GenerationMetadata['mosaicSectionPlan']>;

export interface DrumGuideBundleOptions {
  barMeterMap?: BarMeterMap;
  bpmOverride?: number;
  bandModeEnabled?: boolean;
  mosaicSectionPlan?: MosaicSectionPlanSlice;
}

export interface DrumGuideBundleResult {
  midPath: string;
  jsonPath: string;
  drumGuideSource: ArtRockDrumGuideSource;
  bandMode: boolean;
}

function scoreTotalBars(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

function resolveDrumGuideBars(
  score: ScoreModel,
  options?: DrumGuideBundleOptions
): { bars: DrumGuideBar[]; source: ArtRockDrumGuideSource } {
  const plan = options?.mosaicSectionPlan;
  if (shouldUseArtRockMosaicDrumGuide(options?.bandModeEnabled, plan)) {
    return {
      bars: buildArtRockBandDrumGuideBars(scoreTotalBars(score), plan),
      source: 'art_rock_mosaic_grid',
    };
  }
  return {
    bars: reduceToBeatOnsets(score, options?.barMeterMap),
    source: 'gb_onset_proxy',
  };
}

/** Band mode ON always exports drum guide; otherwise honour skipDrumGuide. */
export function shouldExportDrumGuide(
  skipDrumGuide: boolean | undefined,
  bandModeEnabled: boolean | undefined,
  skipPartialRegen = false
): boolean {
  if (skipPartialRegen) return false;
  if (bandModeEnabled === true) return true;
  return skipDrumGuide !== true;
}

/**
 * Writes `_drum_guide.mid` + `_drum_guide.json`. Art Rock fixed grid when band mode + mosaic plan;
 * otherwise existing G/B onset proxy via {@link reduceToBeatOnsets}.
 */
export function exportDrumGuideBundle(
  score: ScoreModel,
  outputDir: string,
  baseName: string,
  options?: DrumGuideBundleOptions
): DrumGuideBundleResult | undefined {
  if (!score.parts?.length) return undefined;
  let hasBars = false;
  for (const p of score.parts) {
    if (p.measures.some((m) => m.index >= 1)) {
      hasBars = true;
      break;
    }
  }
  if (!hasBars) return undefined;

  const { bars, source } = resolveDrumGuideBars(score, options);
  if (bars.length === 0) return undefined;

  const bpm = options?.bpmOverride ?? score.tempo ?? 120;
  const midPath = path.join(outputDir, `${baseName}_drum_guide.mid`);
  const jsonPath = path.join(outputDir, `${baseName}_drum_guide.json`);
  writeDrumGuideMidi({ bpm, bars, outputPath: midPath });

  const bandMode = options?.bandModeEnabled === true;
  const sidecar = {
    version: 1 as const,
    ppq: PPQ,
    bpm: Math.round(bpm),
    totalBars: bars.length,
    ...(bandMode ? { bandMode: true as const } : {}),
    drumGuideSource: source,
    bars: bars.map((r) => ({
      bar: r.barIndex,
      numerator: r.meterNumerator,
      denominator: r.meterDenominator,
      beatGrouping: [...r.beatGrouping],
      kickTicks: [...r.kickTicks],
      snareTicks: [...r.snareTicks],
      ...(source === 'art_rock_mosaic_grid'
        ? {
            closedHatTicks: [
              ...artRockDrumGuideTicksForBar(r.barIndex, true).closedHatTicks,
            ],
          }
        : {}),
    })),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 0), 'utf-8');
  return { midPath, jsonPath, drumGuideSource: source, bandMode };
}
