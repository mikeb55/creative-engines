/**
 * Bacharach Song Mode — GCE-style batch metrics (diagnostic 0–4 score, not a release gate).
 */

import {
  chordColourDepth,
  sectionKindForBar,
  type SophisticatedPopSectionKind,
} from '../../core/song-mode/sophisticatedPopHarmonyDressing';
import { nonDiatonicChordHeuristicCount, openingReturnColourDelta } from './sophisticatedPopStyleEvalCore';
import {
  readSongModeSectionShapingDiagnosticsFromManifestRoot,
  type SongModeSectionShapingDiagnosticsEvalSnapshot,
} from './songModeSectionShapingDiagnosticsReader';

export type BacharachEvalArm = 'neutral' | 'bacharach';

export interface ParsedBacharachManifest {
  seed: number | null;
  songwriterStyleId: string | null;
  parsedBars: string[] | null;
  songModeStyleSurfaceNotes: string[] | null;
  bacharachHarmonyDiagnostics: {
    barsConsidered: number;
    barsChanged: number;
    meanColourDepth: number;
    meanColourDepthSectionA: number;
    meanColourDepthSectionB: number;
    sectionContrastDelta: number;
    bridgeColourApplied: boolean;
    returnCadenceLiftApplied: boolean;
    secondaryDominantTouches: number;
    mixtureTouches: number;
  } | null;
  songwriterSyncopationBias: number | null;
  songwriterDensityBias: number | null;
  manifestBehaviourGates: boolean | null;
  songModeSectionShapingDiagnostics?: SongModeSectionShapingDiagnosticsEvalSnapshot;
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

function readDiag(raw: Record<string, unknown>): ParsedBacharachManifest['bacharachHarmonyDiagnostics'] {
  const d = raw.bacharachHarmonyDiagnostics;
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  return {
    barsConsidered: typeof o.barsConsidered === 'number' ? o.barsConsidered : 0,
    barsChanged: typeof o.barsChanged === 'number' ? o.barsChanged : 0,
    meanColourDepth: typeof o.meanColourDepth === 'number' ? o.meanColourDepth : 0,
    meanColourDepthSectionA: typeof o.meanColourDepthSectionA === 'number' ? o.meanColourDepthSectionA : 0,
    meanColourDepthSectionB: typeof o.meanColourDepthSectionB === 'number' ? o.meanColourDepthSectionB : 0,
    sectionContrastDelta: typeof o.sectionContrastDelta === 'number' ? o.sectionContrastDelta : 0,
    bridgeColourApplied: o.bridgeColourApplied === true,
    returnCadenceLiftApplied: o.returnCadenceLiftApplied === true,
    secondaryDominantTouches: typeof o.secondaryDominantTouches === 'number' ? o.secondaryDominantTouches : 0,
    mixtureTouches: typeof o.mixtureTouches === 'number' ? o.mixtureTouches : 0,
  };
}

export function parseManifestJsonForBacharachEval(raw: string): ParsedBacharachManifest {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const v = j.validation as Record<string, unknown> | undefined;
    const gates = v && typeof v.behaviourGates === 'boolean' ? v.behaviourGates : null;
    const pb = j.parsedCustomProgressionBars;
    const bars = Array.isArray(pb) ? (pb as string[]).filter((x) => typeof x === 'string') : null;
    const notes = Array.isArray(j.songModeStyleSurfaceNotes)
      ? (j.songModeStyleSurfaceNotes as string[])
      : null;
    return {
      seed: typeof j.seed === 'number' ? j.seed : null,
      songwriterStyleId: typeof j.songwriterStyleId === 'string' ? j.songwriterStyleId : null,
      parsedBars: bars?.length ? bars : null,
      songModeStyleSurfaceNotes: notes,
      bacharachHarmonyDiagnostics: readDiag(j),
      songwriterSyncopationBias: typeof j.songwriterSyncopationBias === 'number' ? j.songwriterSyncopationBias : null,
      songwriterDensityBias: typeof j.songwriterDensityBias === 'number' ? j.songwriterDensityBias : null,
      manifestBehaviourGates: gates,
      songModeSectionShapingDiagnostics: readSongModeSectionShapingDiagnosticsFromManifestRoot(j),
    };
  } catch (e) {
    return {
      seed: null,
      songwriterStyleId: null,
      parsedBars: null,
      songModeStyleSurfaceNotes: null,
      bacharachHarmonyDiagnostics: null,
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

/** Maj7 / minor 7 family — “smooth sophisticated pop” proxy (not plain V7). */
export function smoothMaj7M7RatioFromBars(bars: string[] | null | undefined): number | null {
  if (!bars?.length) return null;
  let hit = 0;
  for (const full of bars) {
    const root = full.split('/')[0].trim();
    const t = root.toLowerCase();
    if (/maj7|maj9|\u0394/.test(t)) hit++;
    else if (/^[a-g][#b]?m7([^a-z0-9]|$)/i.test(root)) hit++;
    else if (/^[a-g][#b]?m9([^a-z0-9]|$)/i.test(root)) hit++;
  }
  return hit / bars.length;
}

/** Dominant-function symbols (secondary dominants, V7 family) — per-bar 0/1-ish weight. */
export function dominantSevenHitsInBar(chord: string): number {
  const h = chord.split('/')[0].trim();
  if (/maj7|m7|m9|maj9|\u0394|dim|ø|m7b5/i.test(h)) return 0;
  if (/^[A-G][#b]?(7|9|11|13)(sus|alt|b5|#5|dim|$)/i.test(h)) return 1;
  if (/^[A-G][#b]?7([^0-9a-z]|$)/i.test(h)) return 1;
  return 0;
}

export function sectionBucketHits(
  bars: string[] | null | undefined,
  pred: (chord: string) => number
): { sumA: number; sumB: number; barsA: number; barsB: number } | null {
  if (!bars?.length) return null;
  const totalBars = bars.length;
  let sumA = 0;
  let sumB = 0;
  let barsA = 0;
  let barsB = 0;
  for (let i = 1; i <= totalBars; i++) {
    const sk = sectionKindForBar(i, totalBars);
    const v = pred(bars[i - 1]);
    if (sk === 'B') {
      sumB += v;
      barsB++;
    } else if (sk === 'A' || sk === 'A_prime' || sk === 'single') {
      sumA += v;
      barsA++;
    }
  }
  return { sumA, sumB, barsA, barsB };
}

/** Borrowed / colour chromaticism proxy: iv, bVII, alt symbols — cheap string heuristic. */
export function safeNonDiatonicMovesCount(bars: string[] | null | undefined): number | null {
  if (!bars?.length) return null;
  let n = 0;
  for (const s of bars) {
    const t = s.toLowerCase();
    if (/fm|bm|^[a-g][#b]?m\b/.test(t) && !/maj/.test(t)) n++;
    else if (/bbb|bbsus|bvi|bvii|iv\b/.test(t)) n++;
    else if (/^[a-g]b[mj]?/.test(t)) n++;
  }
  return n;
}

export interface BacharachEvalMetrics {
  smoothMaj7M7Ratio: number | null;
  secDomTotal: number | null;
  secDomBMinusA: number | null;
  safeNonDiatonicTotal: number | null;
  nonDiatonicBMinusA: number | null;
  colourBMinusA: number | null;
  openingReturnDelta: number | null;
  sectionContrastDelta: number | null;
  bridgeColourApplied: boolean;
  returnCadenceLiftApplied: boolean;
  mixtureTouches: number | null;
  secondaryDominantTouchesDiag: number | null;
  bacharachSliceReceiptLines: number;
  receiptsDescribeBehaviours: boolean;
  sectionShaping_densityDeltaBMinusA: number | null;
  sectionShaping_colourDeltaBMinusA: number | null;
  sectionShaping_openingVsReturnDelta: number | null;
  sectionShaping_returnVariationType: string | null;
  sectionShaping_contributingSliceCount: number | null;
  sectionShaping_returnSummary: string | null;
}

function meanColourForKinds(bars: string[], totalBars: number, kinds: SophisticatedPopSectionKind[]): number | null {
  const depths: number[] = [];
  for (let i = 1; i <= totalBars; i++) {
    const sk = sectionKindForBar(i, totalBars);
    if (!kinds.includes(sk)) continue;
    depths.push(chordColourDepth(bars[i - 1]));
  }
  return depths.length ? mean(depths) : null;
}

export function metricsFromParsedBacharachManifest(p: ParsedBacharachManifest): BacharachEvalMetrics {
  const bars = p.parsedBars;
  const diag = p.bacharachHarmonyDiagnostics;
  const ssd = p.songModeSectionShapingDiagnostics;
  const totalBars = bars?.length ?? 0;

  let colourBMinusA: number | null = ssd?.colourDeltaBMinusA ?? null;
  if (colourBMinusA == null && bars && totalBars >= 8) {
    const meanA = meanColourForKinds(bars, totalBars, ['A', 'A_prime', 'single']);
    const meanB = meanColourForKinds(bars, totalBars, ['B']);
    if (meanA != null && meanB != null) colourBMinusA = meanB - meanA;
  }
  if (diag && colourBMinusA == null) {
    colourBMinusA = diag.meanColourDepthSectionB - diag.meanColourDepthSectionA;
  }

  const secAgg = sectionBucketHits(bars, dominantSevenHitsInBar);
  let secDomBMinusA: number | null = null;
  if (secAgg && secAgg.barsA > 0 && secAgg.barsB > 0) {
    secDomBMinusA = secAgg.sumB / secAgg.barsB - secAgg.sumA / secAgg.barsA;
  }

  const ndAgg = sectionBucketHits(bars, (ch) => ((nonDiatonicChordHeuristicCount([ch]) ?? 0) > 0 ? 1 : 0));
  let nonDiatonicBMinusA: number | null = null;
  if (ndAgg && ndAgg.barsA > 0 && ndAgg.barsB > 0) {
    nonDiatonicBMinusA = ndAgg.sumB / ndAgg.barsB - ndAgg.sumA / ndAgg.barsA;
  }

  const notes = p.songModeStyleSurfaceNotes ?? [];
  const sliceLines = notes.filter((l) => l.includes('Bacharach slice:'));
  const receiptsDescribeBehaviours =
    sliceLines.length >= 3 &&
    notes.some((l) => /maj7|m7|smooth|colour/i.test(l)) &&
    notes.some((l) => /bridge|key-colour|shift/i.test(l)) &&
    notes.some((l) => /lighter|phrase|melody|accompaniment/i.test(l));

  let secDomTotal: number | null = null;
  if (bars?.length) {
    secDomTotal = bars.reduce((acc, c) => acc + dominantSevenHitsInBar(c), 0);
  }

  const openingReturnDelta = ssd?.openingVsReturnDelta ?? openingReturnColourDelta(bars);
  const sectionContrastDelta = ssd?.colourDeltaBMinusA ?? diag?.sectionContrastDelta ?? null;

  return {
    smoothMaj7M7Ratio: smoothMaj7M7RatioFromBars(bars),
    secDomTotal,
    secDomBMinusA,
    safeNonDiatonicTotal: safeNonDiatonicMovesCount(bars),
    nonDiatonicBMinusA,
    colourBMinusA,
    openingReturnDelta,
    sectionContrastDelta,
    bridgeColourApplied: diag?.bridgeColourApplied ?? false,
    returnCadenceLiftApplied: diag?.returnCadenceLiftApplied ?? false,
    mixtureTouches: diag?.mixtureTouches ?? null,
    secondaryDominantTouchesDiag: diag?.secondaryDominantTouches ?? null,
    bacharachSliceReceiptLines: sliceLines.length,
    receiptsDescribeBehaviours,
    sectionShaping_densityDeltaBMinusA: ssd?.densityDeltaBMinusA ?? null,
    sectionShaping_colourDeltaBMinusA: ssd?.colourDeltaBMinusA ?? null,
    sectionShaping_openingVsReturnDelta: ssd?.openingVsReturnDelta ?? null,
    sectionShaping_returnVariationType: ssd?.returnVariationType ?? null,
    sectionShaping_contributingSliceCount: ssd?.contributingSliceCount ?? null,
    sectionShaping_returnSummary: ssd?.returnVariationSummary ?? null,
  };
}

export interface BacharachGceScoreBreakdown {
  smoothVersusNeutral: boolean;
  bridgeMoreAdventurousBounded: boolean;
  returnVariationVersusNeutral: boolean;
  receiptsOk: boolean;
}

/**
 * Composite 0–4 for one seed: Bacharach metrics vs neutral + internal Bacharach-only checks.
 * Diagnostic only — not used as a gate.
 */
export function computeBacharachGceScore(
  neutral: BacharachEvalMetrics,
  bach: BacharachEvalMetrics,
  parsedBach: ParsedBacharachManifest
): { score: number; breakdown: BacharachGceScoreBreakdown } {
  const eps = 1e-6;
  const smoothVersusNeutral =
    neutral.smoothMaj7M7Ratio != null &&
    bach.smoothMaj7M7Ratio != null &&
    bach.smoothMaj7M7Ratio > neutral.smoothMaj7M7Ratio + eps;

  const diag = parsedBach.bacharachHarmonyDiagnostics;
  const mixtureBounded = diag == null || diag.mixtureTouches <= 1;
  const secDomBounded =
    diag == null || diag.secondaryDominantTouches <= Math.max(8, (parsedBach.parsedBars?.length ?? 0) * 0.35);

  const bridgeMoreAdventurousBounded =
    mixtureBounded &&
    secDomBounded &&
    ((bach.secDomBMinusA != null && bach.secDomBMinusA > eps) ||
      (bach.nonDiatonicBMinusA != null && bach.nonDiatonicBMinusA > eps) ||
      (bach.colourBMinusA != null && bach.colourBMinusA > 0.02) ||
      (bach.sectionShaping_colourDeltaBMinusA != null && bach.sectionShaping_colourDeltaBMinusA > 0.02) ||
      (bach.sectionContrastDelta != null && bach.sectionContrastDelta > 0.05));

  const returnVariationVersusNeutral =
    (neutral.openingReturnDelta != null &&
      bach.openingReturnDelta != null &&
      bach.openingReturnDelta > neutral.openingReturnDelta + 0.02) ||
    bach.returnCadenceLiftApplied ||
    (bach.openingReturnDelta != null && bach.openingReturnDelta >= 0.06) ||
    (bach.sectionShaping_returnVariationType != null && bach.sectionShaping_returnVariationType !== 'none');

  const receiptsOk = bach.receiptsDescribeBehaviours;

  let score = 0;
  if (smoothVersusNeutral) score++;
  if (bridgeMoreAdventurousBounded) score++;
  if (returnVariationVersusNeutral) score++;
  if (receiptsOk) score++;

  return {
    score,
    breakdown: {
      smoothVersusNeutral,
      bridgeMoreAdventurousBounded,
      returnVariationVersusNeutral,
      receiptsOk,
    },
  };
}

export interface BacharachEvalCsvRow {
  arm: BacharachEvalArm;
  seed: number;
  primarySongwriter: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  manifestBehaviourGates: string;
  smoothMaj7M7Ratio: string;
  secDomTotal: string;
  secDomBMinusA: string;
  safeNonDiatonicTotal: string;
  nonDiatonicBMinusA: string;
  colourBMinusA: string;
  openingReturnDelta: string;
  sectionContrastDelta: string;
  bridgeColourApplied: string;
  returnCadenceLiftApplied: string;
  mixtureTouches: string;
  bacharachSliceReceiptLines: string;
  receiptsDescribeBehaviours: string;
  sectionShaping_densityDeltaBMinusA: string;
  sectionShaping_colourDeltaBMinusA: string;
  sectionShaping_openingVsReturnDelta: string;
  sectionShaping_returnVariationType: string;
  sectionShaping_contributingSliceCount: string;
  sectionShaping_returnSummary: string;
  bacharachGceScore: string;
  flagSmoothWin: string;
  flagBridgeContrast: string;
  flagReturnWin: string;
  flagReceipts: string;
}

export const BACHARACH_EVAL_CSV_HEADERS = [
  'arm',
  'seed',
  'primarySongwriter',
  'success',
  'engineDeclaredSuccess',
  'manifestBehaviourGates',
  'smoothMaj7M7Ratio',
  'secDomTotal',
  'secDomBMinusA',
  'safeNonDiatonicTotal',
  'nonDiatonicBMinusA',
  'colourBMinusA',
  'openingReturnDelta',
  'sectionContrastDelta',
  'bridgeColourApplied',
  'returnCadenceLiftApplied',
  'mixtureTouches',
  'bacharachSliceReceiptLines',
  'receiptsDescribeBehaviours',
  'sectionShaping_densityDeltaBMinusA',
  'sectionShaping_colourDeltaBMinusA',
  'sectionShaping_openingVsReturnDelta',
  'sectionShaping_returnVariationType',
  'sectionShaping_contributingSliceCount',
  'sectionShaping_returnSummary',
  'bacharachGceScore',
  'flagSmoothWin',
  'flagBridgeContrast',
  'flagReturnWin',
  'flagReceipts',
] as const;

export function rowToCsvRecord(r: BacharachEvalCsvRow): Record<string, string | number | boolean> {
  return { ...r };
}

export function fmtMetric(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(n);
}

export interface BacharachEvalAggregate {
  seeds: number[];
  artifactFailures: number;
  softFailures: number;
  meanGce: number | null;
  medianGce: number | null;
  /** Count of seeds scoring 0,1,2,3,4 */
  gceScoreHistogram: [number, number, number, number, number];
  smoothWinRate: number;
  bridgeContrastRate: number;
  returnWinRate: number;
  receiptsRate: number;
  bachRunsWithArtifacts: number;
}

export function aggregateBacharachGce(
  seeds: number[],
  scores: Map<number, number>,
  breakdowns: Map<number, BacharachGceScoreBreakdown>
): BacharachEvalAggregate {
  const scoreList = seeds.map((s) => scores.get(s)).filter((x): x is number => typeof x === 'number');
  const sorted = [...scoreList].sort((a, b) => a - b);
  const medianGce =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
  const meanGce = scoreList.length ? scoreList.reduce((a, b) => a + b, 0) / scoreList.length : null;

  const gceScoreHistogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const s of scoreList) {
    if (s >= 0 && s <= 4) gceScoreHistogram[s]++;
  }

  let smoothW = 0;
  let bridgeW = 0;
  let retW = 0;
  let recW = 0;
  for (const s of seeds) {
    const b = breakdowns.get(s);
    if (!b) continue;
    if (b.smoothVersusNeutral) smoothW++;
    if (b.bridgeMoreAdventurousBounded) bridgeW++;
    if (b.returnVariationVersusNeutral) retW++;
    if (b.receiptsOk) recW++;
  }
  const n = seeds.length || 1;
  return {
    seeds,
    artifactFailures: 0,
    softFailures: 0,
    meanGce,
    medianGce,
    gceScoreHistogram,
    smoothWinRate: smoothW / n,
    bridgeContrastRate: bridgeW / n,
    returnWinRate: retW / n,
    receiptsRate: recW / n,
    bachRunsWithArtifacts: 0,
  };
}

export function buildBacharachEvalReportMarkdown(args: {
  neutralPrimary: string;
  seeds: number[];
  outDirRel: string;
  agg: BacharachEvalAggregate;
  neutralHigherSmoothCount: number;
  metricsPresentSeeds: number;
}): string {
  const { neutralPrimary, seeds, agg, neutralHigherSmoothCount, metricsPresentSeeds, outDirRel } = args;
  const artifactFailures = agg.artifactFailures;
  const softFailures = agg.softFailures;
  const scoreDist = agg.meanGce != null ? `mean **${agg.meanGce.toFixed(2)}**, median **${agg.medianGce?.toFixed(2) ?? '—'}**` : '—';

  return `# Bacharach Song Mode eval (GCE-style diagnostic)

- **Runs:** ${seeds.length} seeds × (\`bacharach\` + neutral \`${neutralPrimary}\`) — **${artifactFailures}** artifact failures, **${softFailures}** soft failures (MusicXML present, engine success false).
- **Neutral reference primary:** \`${neutralPrimary}\` (same as Fagen batch eval baseline pattern).
- **Manifests with usable chord echo:** ${metricsPresentSeeds} / ${seeds.length} seeds.

## Bacharach GCE score (0–4 per seed)

Composite is **diagnostic only** — not a LOCK gate and not used in runtime validation.

Per-component win rates (share of seeds where the Bacharach arm satisfied the slice intent vs neutral / internal checks):

| Component | Rate |
|-----------|------|
| Smooth maj7/m7 ratio > neutral | ${(agg.smoothWinRate * 100).toFixed(1)}% |
| Bridge / B more adventurous (bounded) | ${(agg.bridgeContrastRate * 100).toFixed(1)}% |
| Return variation proxy vs neutral | ${(agg.returnWinRate * 100).toFixed(1)}% |
| Receipts describe behaviours | ${(agg.receiptsRate * 100).toFixed(1)}% |

- **Neutral had higher smooth ratio:** ${neutralHigherSmoothCount} / ${seeds.length} seeds (sanity check — usually Bacharach should win).

**Score distribution:** ${scoreDist}

| GCE score (0–4) | Seeds |
|-----------------|-------|
| 0 | ${agg.gceScoreHistogram[0]} |
| 1 | ${agg.gceScoreHistogram[1]} |
| 2 | ${agg.gceScoreHistogram[2]} |
| 3 | ${agg.gceScoreHistogram[3]} |
| 4 | ${agg.gceScoreHistogram[4]} |

## Interpretation

Positive rates indicate the Bacharach harmony dressing + surface receipts are measurable against a neutral songwriter with the **same seed, chords (engine-chosen progression), and STYLE_ECM**. Sparse diagnostics or identical builtin progressions can collapse contrasts — inspect per-row CSV flags.

## Outputs

- \`bacharach-songmode-eval.csv\` — one row per arm per seed; \`bacharachGceScore\` and flags repeat on both rows for that seed.
- Runs under \`${outDirRel}/runs/\`.

`;
}
