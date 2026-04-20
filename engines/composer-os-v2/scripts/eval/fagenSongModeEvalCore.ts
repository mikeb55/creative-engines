/**
 * Fagen Song Mode batch evaluation — pure parsing + metrics (no generation).
 */

import type { GenerationMetadata } from '../../core/compositionContext';
import {
  readSongModeSectionShapingDiagnosticsFromManifestRoot,
  type SongModeSectionShapingDiagnosticsEvalSnapshot,
} from './songModeSectionShapingDiagnosticsReader';

export type EvalArm = 'fagen' | 'neutral_keys';

export interface ParsedManifestForEval {
  seed: number | null;
  songwriterStyleId: string | null;
  songModeFagenKeysCompV15Applied: boolean | null;
  fagenDiagnostics: GenerationMetadata['fagenKeysCompMusicalDiagnostics'] | null;
  songModeStyleSurfaceNotes: string[] | null;
  /** Optional eval-only extension: >1 pivot bars ⇒ illegal (rule check). */
  fagenSignaturePivotBars: number[] | null;
  /** Stable aggregate from `finalizeSongModeSectionShaping` (manifest root). */
  songModeSectionShapingDiagnostics: SongModeSectionShapingDiagnosticsEvalSnapshot;
  parseError?: string;
}

export function parseManifestValidationBehaviourGates(raw: string): boolean | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const v = j.validation as Record<string, unknown> | undefined;
    if (v && typeof v.behaviourGates === 'boolean') return v.behaviourGates;
    return null;
  } catch {
    return null;
  }
}

export function parseManifestJsonContent(raw: string): ParsedManifestForEval {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const fd = j.fagenKeysCompMusicalDiagnostics;
    const spbRaw = j.fagenSignaturePivotBars;
    const fagenSignaturePivotBars = Array.isArray(spbRaw)
      ? spbRaw.filter((x): x is number => typeof x === 'number')
      : null;
    return {
      seed: typeof j.seed === 'number' ? j.seed : null,
      songwriterStyleId: typeof j.songwriterStyleId === 'string' ? j.songwriterStyleId : null,
      songModeFagenKeysCompV15Applied:
        typeof j.songModeFagenKeysCompV15Applied === 'boolean' ? j.songModeFagenKeysCompV15Applied : null,
      fagenDiagnostics:
        fd && typeof fd === 'object' ? (fd as GenerationMetadata['fagenKeysCompMusicalDiagnostics']) : null,
      songModeStyleSurfaceNotes: Array.isArray(j.songModeStyleSurfaceNotes)
        ? (j.songModeStyleSurfaceNotes as string[])
        : null,
      fagenSignaturePivotBars,
      songModeSectionShapingDiagnostics: readSongModeSectionShapingDiagnosticsFromManifestRoot(j),
    };
  } catch (e) {
    return {
      seed: null,
      songwriterStyleId: null,
      songModeFagenKeysCompV15Applied: null,
      fagenDiagnostics: null,
      songModeStyleSurfaceNotes: null,
      fagenSignaturePivotBars: null,
      songModeSectionShapingDiagnostics: readSongModeSectionShapingDiagnosticsFromManifestRoot({}),
      parseError: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface RunMetricRow {
  arm: EvalArm;
  seed: number;
  songwriterId: string;
  /** True when MusicXML was written — use for metric extraction even if engine validation failed. */
  success: boolean;
  /** Original `GenerateResult.success` from the app API (may be false when behaviour gates fail). */
  engineDeclaredSuccess: boolean;
  /** From `_meta` manifest `validation.behaviourGates` when present. */
  manifestBehaviourGates: boolean | null;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  syncBMinusA: number | null;
  densBMinusA: number | null;
  meanSyncopationIndex: number | null;
  openingVsReturnRhMeanDelta: number | null;
  densityDeltaBMinusAMeta: number | null;
  returnVariationSummary: string | null;
  signatureApplied: boolean | null;
  signaturePivotBar: number | null;
  signatureRuleOk: boolean;
  avgInnerMotionV2: number | null;
  receiptLineCount: number | null;
  hasFagenReceiptHints: boolean;
  passSectionContrast: boolean;
  passReturnEvolution: boolean;
  /** Heuristic 0–100 */
  fagenQualityEvalScore: number | null;
  /** Raw manifest `songModeSectionShapingDiagnostics` (stable aggregate). */
  sectionShaping_densityDeltaBMinusA: number | null;
  sectionShaping_colourDeltaBMinusA: number | null;
  sectionShaping_openingVsReturnDelta: number | null;
  sectionShaping_returnVariationType: string | null;
  sectionShaping_contributingSliceCount: number | null;
  sectionShaping_returnSummary: string | null;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return null;
}

export function buildRowFromManifest(args: {
  arm: EvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  manifestBehaviourGates?: boolean | null;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestContent: string | null;
}): RunMetricRow {
  const {
    arm,
    seed,
    songwriterId,
    success,
    engineDeclaredSuccess,
    manifestBehaviourGates: mbgArg,
    errorMessage,
    musicXmlPath,
    manifestPath,
    manifestContent,
  } = args;
  const parsed = manifestContent ? parseManifestJsonContent(manifestContent) : null;
  const ssd =
    parsed?.songModeSectionShapingDiagnostics ?? readSongModeSectionShapingDiagnosticsFromManifestRoot({});
  const manifestBehaviourGates =
    mbgArg !== undefined && mbgArg !== null
      ? mbgArg
      : manifestContent
        ? parseManifestValidationBehaviourGates(manifestContent)
        : null;
  const fd = parsed?.fagenDiagnostics;

  const syncBy = fd?.syncopationIndexBySection;
  const densBy = fd?.voicingDensityBySection;
  const syncBMinusA =
    syncBy && typeof syncBy.b === 'number' && typeof syncBy.a_open === 'number'
      ? syncBy.b - syncBy.a_open
      : null;
  const densBMinusA =
    densBy && typeof densBy.b === 'number' && typeof densBy.a_open === 'number'
      ? densBy.b - densBy.a_open
      : null;

  const sig = fd?.signatureMoment;
  let signatureRuleOk = true;
  if (sig && sig.applied && sig.pivotBar != null) {
    signatureRuleOk = true;
  }
  /** Engine guarantees ≤1 moment; flag if manifest ever carried contradictions. */
  const sigCount = sig ? (sig as unknown as { count?: number }).count : undefined;
  if (typeof sigCount === 'number' && sigCount > 1) signatureRuleOk = false;
  const pivBars = parsed?.fagenSignaturePivotBars;
  if (pivBars && pivBars.length > 1) signatureRuleOk = false;

  const receiptLines = parsed?.songModeStyleSurfaceNotes ?? null;
  const receiptLineCount = receiptLines?.length ?? null;
  const hasFagenReceiptHints =
    !!receiptLines?.some(
      (s) =>
        s.includes('Fagen') ||
        s.includes('fagen') ||
        s.includes('donald_fagen') ||
        s.includes('keys-comp')
    );

  const passSectionContrast =
    (ssd?.densityDeltaBMinusA != null && Math.abs(ssd.densityDeltaBMinusA) > 1e-4) ||
    (ssd?.colourDeltaBMinusA != null && ssd.colourDeltaBMinusA > 0.015) ||
    (syncBMinusA != null && syncBMinusA > 0) ||
    (densBMinusA != null && densBMinusA > 0) ||
    (numOrNull(fd?.densityDeltaBMinusA) != null && (fd?.densityDeltaBMinusA ?? 0) > 0);

  const openRetManifest = ssd?.openingVsReturnDelta;
  const openRetFagen = fd?.openingVsReturnRhMeanDelta;
  const passReturnEvolution =
    (typeof openRetManifest === 'number' && Math.abs(openRetManifest) > 0.25) ||
    (typeof openRetFagen === 'number' && Math.abs(openRetFagen) > 0.25) ||
    (!!ssd?.returnVariationSummary && ssd.returnVariationSummary.length > 3) ||
    (!!ssd?.returnVariationType && ssd.returnVariationType !== 'none') ||
    (!!fd?.returnVariationSummary && fd.returnVariationSummary.length > 3);

  const score =
    arm === 'fagen'
      ? computeFagenQualityScore({
          fd,
          passSectionContrast,
          passReturnEvolution,
          signatureRuleOk,
          receiptLineCount,
          hasDiagnostics: !!fd,
          sectionShapingOpeningVsReturn: ssd?.openingVsReturnDelta ?? null,
        })
      : null;

  const returnSummaryEff = ssd?.returnVariationSummary ?? fd?.returnVariationSummary ?? null;

  return {
    arm,
    seed,
    songwriterId,
    success,
    engineDeclaredSuccess,
    manifestBehaviourGates,
    errorMessage,
    musicXmlPath,
    manifestPath,
    syncBMinusA,
    densBMinusA,
    meanSyncopationIndex: numOrNull(fd?.meanSyncopationIndex),
    openingVsReturnRhMeanDelta: openRetManifest ?? numOrNull(fd?.openingVsReturnRhMeanDelta),
    densityDeltaBMinusAMeta: ssd?.densityDeltaBMinusA ?? numOrNull(fd?.densityDeltaBMinusA),
    returnVariationSummary: returnSummaryEff,
    signatureApplied: sig?.applied ?? null,
    signaturePivotBar: sig?.pivotBar ?? null,
    signatureRuleOk,
    avgInnerMotionV2: numOrNull(fd?.avgInnerMotionSemitonesV2Top),
    receiptLineCount,
    hasFagenReceiptHints,
    passSectionContrast,
    passReturnEvolution,
    fagenQualityEvalScore: score,
    sectionShaping_densityDeltaBMinusA: ssd?.densityDeltaBMinusA ?? null,
    sectionShaping_colourDeltaBMinusA: ssd?.colourDeltaBMinusA ?? null,
    sectionShaping_openingVsReturnDelta: ssd?.openingVsReturnDelta ?? null,
    sectionShaping_returnVariationType: ssd?.returnVariationType ?? null,
    sectionShaping_contributingSliceCount: ssd?.contributingSliceCount ?? null,
    sectionShaping_returnSummary: ssd?.returnVariationSummary ?? null,
  };
}

export function computeFagenQualityScore(input: {
  fd: GenerationMetadata['fagenKeysCompMusicalDiagnostics'] | null | undefined;
  passSectionContrast: boolean;
  passReturnEvolution: boolean;
  signatureRuleOk: boolean;
  receiptLineCount: number | null;
  hasDiagnostics: boolean;
  /** Manifest aggregate opening vs return (same field Song Mode writes to section diagnostics). */
  sectionShapingOpeningVsReturn?: number | null;
}): number {
  let s = 0;
  const fd = input.fd;
  if (input.passSectionContrast) s += 28;
  else if (fd?.syncopationIndexBySection?.b != null && fd.syncopationIndexBySection?.a_open != null) s += 12;

  if (input.passReturnEvolution) s += 22;
  else if (typeof fd?.openingVsReturnRhMeanDelta === 'number') s += 8;
  else if (typeof input.sectionShapingOpeningVsReturn === 'number') s += 8;

  const mot = fd?.avgInnerMotionSemitonesV2Top;
  if (typeof mot === 'number' && mot >= 1.2) s += 15;
  else if (typeof mot === 'number' && mot >= 0.5) s += 8;

  if (input.signatureRuleOk) s += 15;
  else s -= 20;

  const phrases = fd?.phraseTensionMeanDensityByPhrase;
  if (Array.isArray(phrases) && phrases.length >= 2) {
    const mx = Math.max(...phrases);
    const mn = Math.min(...phrases);
    if (mx - mn > 0.2) s += 8;
  }

  if (input.hasDiagnostics) s += 7;
  if ((input.receiptLineCount ?? 0) >= 3) s += 5;

  return Math.max(0, Math.min(100, Math.round(s)));
}

export function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

export function aggregateFagenRuns(rows: RunMetricRow[]): {
  n: number;
  meanScore: number | null;
  medianScore: number | null;
  passSectionContrastRate: number;
  passReturnRate: number;
  signatureRulePassRate: number;
  receiptHintRate: number;
} {
  const fagen = rows.filter((r) => r.arm === 'fagen' && r.success);
  const scores = fagen.map((r) => r.fagenQualityEvalScore).filter((x): x is number => typeof x === 'number');
  const n = fagen.length;
  return {
    n,
    meanScore: scores.length ? scores.reduce((a, c) => a + c, 0) / scores.length : null,
    medianScore: scores.length ? median(scores) : null,
    passSectionContrastRate: n ? fagen.filter((r) => r.passSectionContrast).length / n : 0,
    passReturnRate: n ? fagen.filter((r) => r.passReturnEvolution).length / n : 0,
    signatureRulePassRate: n ? fagen.filter((r) => r.signatureRuleOk).length / n : 0,
    receiptHintRate: n ? fagen.filter((r) => r.hasFagenReceiptHints).length / n : 0,
  };
}

/** Stable CSV column order for reports and tests. */
export const FAGEN_EVAL_CSV_HEADERS = [
  'arm',
  'seed',
  'songwriterId',
  'success',
  'engineDeclaredSuccess',
  'manifestBehaviourGates',
  'errorMessage',
  'musicXmlPath',
  'manifestPath',
  'syncBMinusA',
  'densBMinusA',
  'meanSyncopationIndex',
  'openingVsReturnRhMeanDelta',
  'densityDeltaBMinusAMeta',
  'returnVariationSummary',
  'signatureApplied',
  'signaturePivotBar',
  'signatureRuleOk',
  'avgInnerMotionV2',
  'receiptLineCount',
  'hasFagenReceiptHints',
  'passSectionContrast',
  'passReturnEvolution',
  'fagenQualityEvalScore',
  'sectionShaping_densityDeltaBMinusA',
  'sectionShaping_colourDeltaBMinusA',
  'sectionShaping_openingVsReturnDelta',
  'sectionShaping_returnVariationType',
  'sectionShaping_contributingSliceCount',
  'sectionShaping_returnSummary',
] as const;

export function rowToCsvRecord(r: RunMetricRow): Record<string, string | number | boolean> {
  return {
    arm: r.arm,
    seed: r.seed,
    songwriterId: r.songwriterId,
    success: r.success,
    engineDeclaredSuccess: r.engineDeclaredSuccess,
    manifestBehaviourGates: r.manifestBehaviourGates ?? '',
    errorMessage: r.errorMessage,
    musicXmlPath: r.musicXmlPath,
    manifestPath: r.manifestPath,
    syncBMinusA: r.syncBMinusA ?? '',
    densBMinusA: r.densBMinusA ?? '',
    meanSyncopationIndex: r.meanSyncopationIndex ?? '',
    openingVsReturnRhMeanDelta: r.openingVsReturnRhMeanDelta ?? '',
    densityDeltaBMinusAMeta: r.densityDeltaBMinusAMeta ?? '',
    returnVariationSummary: r.returnVariationSummary ?? '',
    signatureApplied: r.signatureApplied ?? '',
    signaturePivotBar: r.signaturePivotBar ?? '',
    signatureRuleOk: r.signatureRuleOk,
    avgInnerMotionV2: r.avgInnerMotionV2 ?? '',
    receiptLineCount: r.receiptLineCount ?? '',
    hasFagenReceiptHints: r.hasFagenReceiptHints,
    passSectionContrast: r.passSectionContrast,
    passReturnEvolution: r.passReturnEvolution,
    fagenQualityEvalScore: r.fagenQualityEvalScore ?? '',
    sectionShaping_densityDeltaBMinusA: r.sectionShaping_densityDeltaBMinusA ?? '',
    sectionShaping_colourDeltaBMinusA: r.sectionShaping_colourDeltaBMinusA ?? '',
    sectionShaping_openingVsReturnDelta: r.sectionShaping_openingVsReturnDelta ?? '',
    sectionShaping_returnVariationType: r.sectionShaping_returnVariationType ?? '',
    sectionShaping_contributingSliceCount: r.sectionShaping_contributingSliceCount ?? '',
    sectionShaping_returnSummary: r.sectionShaping_returnSummary
      ? String(r.sectionShaping_returnSummary).slice(0, 200)
      : '',
  };
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
