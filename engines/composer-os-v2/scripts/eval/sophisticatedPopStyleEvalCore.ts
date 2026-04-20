/**
 * STYLE_SOPHISTICATED_POP — GCE-style batch metrics (diagnostic score, not a release gate).
 */

import { chordColourDepth } from '../../core/song-mode/sophisticatedPopHarmonyDressing';
import {
  readSongModeSectionShapingDiagnosticsFromManifestRoot,
  type SongModeSectionShapingDiagnosticsEvalSnapshot,
} from './songModeSectionShapingDiagnosticsReader';

export type StyleEvalArm = 'neutral_ecm' | 'soph_pop';

export interface ParsedSophPopManifest {
  seed: number | null;
  styleProfile: string | null;
  sophisticatedPopHarmonyDiagnostics: {
    barsConsidered: number;
    barsChanged: number;
    meanColourDepth: number;
    meanColourDepthSectionA: number;
    meanColourDepthSectionB: number;
    sectionContrastDelta: number;
    extensionAdds: number;
  } | null;
  parsedBars: string[] | null;
  songModeStyleSurfaceNotes: string[] | null;
  songwriterSyncopationBias: number | null;
  songwriterDensityBias: number | null;
  manifestBehaviourGates: boolean | null;
  songModeSectionShapingDiagnostics: SongModeSectionShapingDiagnosticsEvalSnapshot;
  parseError?: string;
}

export function parseBehaviourGatesFromManifestRaw(raw: string): boolean | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const v = j.validation as Record<string, unknown> | undefined;
    if (v && typeof v.behaviourGates === 'boolean') return v.behaviourGates;
  } catch {
    /* skip */
  }
  return null;
}

export function parseManifestJsonForSophPopEval(raw: string): ParsedSophPopManifest {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const v = j.validation as Record<string, unknown> | undefined;
    const gates = v && typeof v.behaviourGates === 'boolean' ? v.behaviourGates : null;
    const sp = j.sophisticatedPopHarmonyDiagnostics;
    const diag =
      sp && typeof sp === 'object'
        ? {
            barsConsidered: typeof (sp as { barsConsidered?: unknown }).barsConsidered === 'number'
              ? ((sp as { barsConsidered: number }).barsConsidered)
              : 0,
            barsChanged: typeof (sp as { barsChanged?: unknown }).barsChanged === 'number'
              ? ((sp as { barsChanged: number }).barsChanged)
              : 0,
            meanColourDepth: typeof (sp as { meanColourDepth?: unknown }).meanColourDepth === 'number'
              ? ((sp as { meanColourDepth: number }).meanColourDepth)
              : 0,
            meanColourDepthSectionA:
              typeof (sp as { meanColourDepthSectionA?: unknown }).meanColourDepthSectionA === 'number'
                ? ((sp as { meanColourDepthSectionA: number }).meanColourDepthSectionA)
                : 0,
            meanColourDepthSectionB:
              typeof (sp as { meanColourDepthSectionB?: unknown }).meanColourDepthSectionB === 'number'
                ? ((sp as { meanColourDepthSectionB: number }).meanColourDepthSectionB)
                : 0,
            sectionContrastDelta:
              typeof (sp as { sectionContrastDelta?: unknown }).sectionContrastDelta === 'number'
                ? ((sp as { sectionContrastDelta: number }).sectionContrastDelta)
                : 0,
            extensionAdds:
              typeof (sp as { extensionAdds?: unknown }).extensionAdds === 'number'
                ? ((sp as { extensionAdds: number }).extensionAdds)
                : 0,
          }
        : null;
    const pb = j.parsedCustomProgressionBars;
    const bars = Array.isArray(pb) ? (pb as string[]).filter((x) => typeof x === 'string') : null;
    const notes = Array.isArray(j.songModeStyleSurfaceNotes)
      ? (j.songModeStyleSurfaceNotes as string[])
      : null;
    return {
      seed: typeof j.seed === 'number' ? j.seed : null,
      styleProfile: typeof j.styleProfile === 'string' ? j.styleProfile : null,
      sophisticatedPopHarmonyDiagnostics: diag,
      parsedBars: bars?.length ? bars : null,
      songModeStyleSurfaceNotes: notes,
      songwriterSyncopationBias: typeof j.songwriterSyncopationBias === 'number' ? j.songwriterSyncopationBias : null,
      songwriterDensityBias: typeof j.songwriterDensityBias === 'number' ? j.songwriterDensityBias : null,
      manifestBehaviourGates: gates,
      songModeSectionShapingDiagnostics: readSongModeSectionShapingDiagnosticsFromManifestRoot(j),
    };
  } catch (e) {
    return {
      seed: null,
      styleProfile: null,
      sophisticatedPopHarmonyDiagnostics: null,
      parsedBars: null,
      songModeStyleSurfaceNotes: null,
      songwriterSyncopationBias: null,
      songwriterDensityBias: null,
      manifestBehaviourGates: null,
      songModeSectionShapingDiagnostics: readSongModeSectionShapingDiagnosticsFromManifestRoot({}),
      parseError: e instanceof Error ? e.message : String(e),
    };
  }
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Ratio of bars whose colour depth is ≥ 1 (7th family or richer). */
export function extendedChordRatioFromBars(bars: string[] | null | undefined): number | null {
  if (!bars?.length) return null;
  const hits = bars.filter((b) => chordColourDepth(b) >= 1).length;
  return hits / bars.length;
}

/** Mean colour depth 0–2 scaled to 0–1. */
export function meanColourDepthNormalized(bars: string[] | null | undefined): number | null {
  if (!bars?.length) return null;
  return mean(bars.map((b) => chordColourDepth(b))) / 2;
}

/** Cheap proxy for borrowed / chromatic harmony (not Roman analysis). */
export function nonDiatonicChordHeuristicCount(bars: string[] | null | undefined): number | null {
  if (!bars?.length) return null;
  let n = 0;
  for (const s of bars) {
    const t = s.toLowerCase();
    if (/alt|ø|m7b5|half-dim|bdim|#5|#9|b9|b13|phryg|loc/.test(t)) n++;
  }
  return n;
}

/** |mean depth return 8 bars − mean depth opening 8 bars| when length ≥ 16. */
export function openingReturnColourDelta(bars: string[] | null | undefined): number | null {
  if (!bars || bars.length < 16) return null;
  const open = mean(bars.slice(0, 8).map((b) => chordColourDepth(b)));
  const ret = mean(bars.slice(-8).map((b) => chordColourDepth(b)));
  return Math.abs(ret - open);
}

export interface StyleEvalMetrics {
  extChordRatio: number | null;
  meanColourNorm: number | null;
  nonDiatonicCount: number | null;
  sectionContrastDelta: number | null;
  densityColourA: number | null;
  densityColourB: number | null;
  openingReturnDelta: number | null;
  syncBias: number | null;
  densityBias: number | null;
  sophPopReceiptsPresent: boolean;
  sectionShaping_densityDeltaBMinusA: number | null;
  sectionShaping_colourDeltaBMinusA: number | null;
  sectionShaping_openingVsReturnDelta: number | null;
  sectionShaping_returnVariationType: string | null;
  sectionShaping_contributingSliceCount: number | null;
  sectionShaping_returnSummary: string | null;
}

export function metricsFromParsedManifest(p: ParsedSophPopManifest): StyleEvalMetrics {
  const bars = p.parsedBars;
  const diag = p.sophisticatedPopHarmonyDiagnostics;
  const ssd = p.songModeSectionShapingDiagnostics;
  const notes = p.songModeStyleSurfaceNotes ?? [];
  const sophReceipt =
    notes.some(
      (l) =>
        l.includes('STYLE_SOPHISTICATED_POP') ||
        l.includes('Sophisticated Pop') ||
        l.includes('sophisticated pop')
    );
  const sectionContrastDelta = ssd?.colourDeltaBMinusA ?? diag?.sectionContrastDelta ?? null;
  const openingReturnDelta = ssd?.openingVsReturnDelta ?? openingReturnColourDelta(bars);
  return {
    extChordRatio: extendedChordRatioFromBars(bars),
    meanColourNorm: meanColourDepthNormalized(bars),
    nonDiatonicCount: nonDiatonicChordHeuristicCount(bars),
    sectionContrastDelta,
    densityColourA: diag?.meanColourDepthSectionA ?? null,
    densityColourB: diag?.meanColourDepthSectionB ?? null,
    openingReturnDelta,
    syncBias: p.songwriterSyncopationBias,
    densityBias: p.songwriterDensityBias,
    sophPopReceiptsPresent: sophReceipt,
    sectionShaping_densityDeltaBMinusA: ssd?.densityDeltaBMinusA ?? null,
    sectionShaping_colourDeltaBMinusA: ssd?.colourDeltaBMinusA ?? null,
    sectionShaping_openingVsReturnDelta: ssd?.openingVsReturnDelta ?? null,
    sectionShaping_returnVariationType: ssd?.returnVariationType ?? null,
    sectionShaping_contributingSliceCount: ssd?.contributingSliceCount ?? null,
    sectionShaping_returnSummary: ssd?.returnVariationSummary ?? null,
  };
}

export interface GceStyleScoreBreakdown {
  extendedLift: boolean;
  sectionContrastLift: boolean;
  returnVariationLift: boolean;
  receiptsPresent: boolean;
}

/** Per-seed composite 0–4 — diagnostic only. */
export function computeGceStyleScore(
  neutral: StyleEvalMetrics,
  soph: StyleEvalMetrics
): { score: number; breakdown: GceStyleScoreBreakdown } {
  const extendedLift =
    neutral.extChordRatio != null &&
    soph.extChordRatio != null &&
    soph.extChordRatio > neutral.extChordRatio + 1e-6;

  const sectionContrastLift =
    (soph.sectionShaping_colourDeltaBMinusA != null && soph.sectionShaping_colourDeltaBMinusA > 0.05) ||
    (soph.sectionContrastDelta != null && soph.sectionContrastDelta > 0.05) ||
    (soph.densityColourB != null &&
      soph.densityColourA != null &&
      soph.densityColourB > soph.densityColourA + 0.02);

  const returnVariationLift =
    (neutral.openingReturnDelta != null &&
      soph.openingReturnDelta != null &&
      soph.openingReturnDelta > neutral.openingReturnDelta + 0.02) ||
    (soph.sectionShaping_returnVariationType != null && soph.sectionShaping_returnVariationType !== 'none');

  const receiptsPresent = soph.sophPopReceiptsPresent;

  let score = 0;
  if (extendedLift) score++;
  if (sectionContrastLift) score++;
  if (returnVariationLift) score++;
  if (receiptsPresent) score++;

  return {
    score,
    breakdown: { extendedLift, sectionContrastLift, returnVariationLift, receiptsPresent },
  };
}

export interface StyleEvalCsvRow {
  arm: StyleEvalArm;
  seed: number;
  styleName: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  manifestBehaviourGates: string;
  extChordRatio: string;
  meanColourNorm: string;
  nonDiatonicCount: string;
  sectionContrastDelta: string;
  densityColourA: string;
  densityColourB: string;
  openingReturnDelta: string;
  syncBias: string;
  densityBias: string;
  receiptsSophPop: string;
  sectionShaping_densityDeltaBMinusA: string;
  sectionShaping_colourDeltaBMinusA: string;
  sectionShaping_openingVsReturnDelta: string;
  sectionShaping_returnVariationType: string;
  sectionShaping_contributingSliceCount: string;
  sectionShaping_returnSummary: string;
  gceStyleScore: string;
}

export const SOPH_POP_EVAL_CSV_HEADERS = [
  'arm',
  'seed',
  'styleName',
  'success',
  'engineDeclaredSuccess',
  'manifestBehaviourGates',
  'extChordRatio',
  'meanColourNorm',
  'nonDiatonicCount',
  'sectionContrastDelta',
  'densityColourA',
  'densityColourB',
  'openingReturnDelta',
  'syncBias',
  'densityBias',
  'receiptsSophPop',
  'sectionShaping_densityDeltaBMinusA',
  'sectionShaping_colourDeltaBMinusA',
  'sectionShaping_openingVsReturnDelta',
  'sectionShaping_returnVariationType',
  'sectionShaping_contributingSliceCount',
  'sectionShaping_returnSummary',
  'gceStyleScore',
] as const;

export function rowToCsvRecord(r: StyleEvalCsvRow): Record<string, string | number | boolean> {
  return { ...r };
}

export function stringifyCsv(headers: string[], records: Record<string, string | number | boolean>[]): string {
  const esc = (v: string | number | boolean) => {
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const rec of records) {
    lines.push(headers.map((h) => esc(rec[h] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}
