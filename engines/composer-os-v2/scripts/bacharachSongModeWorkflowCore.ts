/**
 * Shared Bacharach Song Mode batch generation + GCE eval artifacts (developer tooling only; not runtime).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import {
  aggregateBacharachGce,
  BACHARACH_EVAL_CSV_HEADERS,
  buildBacharachEvalReportMarkdown,
  computeBacharachGceScore,
  fmtMetric,
  metricsFromParsedBacharachManifest,
  parseBehaviourGatesFromManifestRaw,
  parseManifestJsonForBacharachEval,
  rowToCsvRecord,
  type BacharachEvalCsvRow,
  type BacharachEvalMetrics,
  type BacharachGceScoreBreakdown,
} from './eval/bacharachSongModeEvalCore';
import { stringifyCsv } from './eval/sophisticatedPopStyleEvalCore';

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const DEFAULT_NEUTRAL_PRIMARY = 'carole_king';
export const DEFAULT_BACH_PRIMARY = 'bacharach';

const BATCH_CLI_FLAGS = new Set([
  '--out',
  '--seeds',
  '--count',
  '--seed-start',
  '--neutral-primary',
  '--neutral-songwriter',
  /** Passed through workflow runner only; ignored by batch parser */
  '--skip-build',
  '--skip-launch',
]);

export function getBacharachBatchArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => BATCH_CLI_FLAGS.has(a));
  return idx >= 0 ? argv.slice(idx) : [];
}

export interface ParsedBacharachBatchArgs {
  outDir: string;
  seeds: number[];
  neutralPrimary: string;
}

/**
 * Shared arg parser for eval + workflow. Default `outDirDefault` is relative to repo root when not absolute.
 */
export function parseBacharachBatchArgs(
  argv: string[],
  defaults: { outDir: string; seedStart: number; count: number }
): ParsedBacharachBatchArgs {
  let outDir = defaults.outDir;
  const seeds: number[] = [];
  let count = defaults.count;
  let seedStart = defaults.seedStart;
  let neutralPrimary = DEFAULT_NEUTRAL_PRIMARY;

  const tail = getBacharachBatchArgvTail(argv);
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
    if (a === '--skip-build' || a === '--skip-launch') continue;
    if (a === '--out' && tail[i + 1]) {
      const raw = tail[++i];
      outDir = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(REPO_ROOT, raw);
    } else if (a === '--seeds' && tail[i + 1]) {
      seeds.push(
        ...tail[++i]
          .split(/[,\s]+/)
          .map((x) => parseInt(x.trim(), 10))
          .filter((n) => !Number.isNaN(n))
      );
    } else if (a === '--count' && tail[i + 1]) {
      count = parseInt(tail[++i], 10) || defaults.count;
    } else if (a === '--seed-start' && tail[i + 1]) {
      seedStart = parseInt(tail[++i], 10) || seedStart;
    } else if ((a === '--neutral-primary' || a === '--neutral-songwriter') && tail[i + 1]) {
      neutralPrimary = tail[++i];
    }
  }

  if (seeds.length === 0) {
    for (let k = 0; k < count; k++) seeds.push(seedStart + k);
  }

  return { outDir, seeds, neutralPrimary };
}

export function buildBacharachSongModeEvalRequest(seed: number, primarySongwriterStyle: string): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `Bacharach batch ${primarySongwriterStyle} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    primarySongwriterStyle,
  };
}

export function metricsToRowFields(m: BacharachEvalMetrics): Pick<
  BacharachEvalCsvRow,
  | 'smoothMaj7M7Ratio'
  | 'secDomTotal'
  | 'secDomBMinusA'
  | 'safeNonDiatonicTotal'
  | 'nonDiatonicBMinusA'
  | 'colourBMinusA'
  | 'openingReturnDelta'
  | 'sectionContrastDelta'
  | 'bridgeColourApplied'
  | 'returnCadenceLiftApplied'
  | 'mixtureTouches'
  | 'bacharachSliceReceiptLines'
  | 'receiptsDescribeBehaviours'
  | 'sectionShaping_densityDeltaBMinusA'
  | 'sectionShaping_colourDeltaBMinusA'
  | 'sectionShaping_openingVsReturnDelta'
  | 'sectionShaping_returnVariationType'
  | 'sectionShaping_contributingSliceCount'
  | 'sectionShaping_returnSummary'
> {
  return {
    smoothMaj7M7Ratio: fmtMetric(m.smoothMaj7M7Ratio),
    secDomTotal: fmtMetric(m.secDomTotal),
    secDomBMinusA: fmtMetric(m.secDomBMinusA),
    safeNonDiatonicTotal: fmtMetric(m.safeNonDiatonicTotal),
    nonDiatonicBMinusA: fmtMetric(m.nonDiatonicBMinusA),
    colourBMinusA: fmtMetric(m.colourBMinusA),
    openingReturnDelta: fmtMetric(m.openingReturnDelta),
    sectionContrastDelta: fmtMetric(m.sectionContrastDelta),
    bridgeColourApplied: m.bridgeColourApplied ? 'true' : 'false',
    returnCadenceLiftApplied: m.returnCadenceLiftApplied ? 'true' : 'false',
    mixtureTouches: fmtMetric(m.mixtureTouches),
    bacharachSliceReceiptLines: String(m.bacharachSliceReceiptLines),
    receiptsDescribeBehaviours: m.receiptsDescribeBehaviours ? 'true' : 'false',
    sectionShaping_densityDeltaBMinusA: fmtMetric(m.sectionShaping_densityDeltaBMinusA),
    sectionShaping_colourDeltaBMinusA: fmtMetric(m.sectionShaping_colourDeltaBMinusA),
    sectionShaping_openingVsReturnDelta: fmtMetric(m.sectionShaping_openingVsReturnDelta),
    sectionShaping_returnVariationType: m.sectionShaping_returnVariationType ?? '',
    sectionShaping_contributingSliceCount: fmtMetric(m.sectionShaping_contributingSliceCount),
    sectionShaping_returnSummary: m.sectionShaping_returnSummary
      ? String(m.sectionShaping_returnSummary).slice(0, 200)
      : '',
  };
}

export function runSingleBacharachGeneration(
  req: GenerateRequest,
  runsDir: string,
  arm: BacharachEvalCsvRow['arm'],
  primaryLabel: string
): BacharachEvalCsvRow & { manifestRaw: string | null } {
  const res = runAppGeneration(req, runsDir);
  const manifestPath = res.manifestPath ?? '';
  let manifestRaw: string | null = null;
  if (manifestPath && fs.existsSync(manifestPath)) {
    try {
      manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
    } catch {
      manifestRaw = null;
    }
  }
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const parsed = manifestRaw ? parseManifestJsonForBacharachEval(manifestRaw) : null;
  const m = parsed ? metricsFromParsedBacharachManifest(parsed) : null;
  const gates = manifestRaw ? parseBehaviourGatesFromManifestRaw(manifestRaw) : null;
  const fields = m
    ? metricsToRowFields(m)
    : {
        smoothMaj7M7Ratio: '',
        secDomTotal: '',
        secDomBMinusA: '',
        safeNonDiatonicTotal: '',
        nonDiatonicBMinusA: '',
        colourBMinusA: '',
        openingReturnDelta: '',
        sectionContrastDelta: '',
        bridgeColourApplied: 'false',
        returnCadenceLiftApplied: 'false',
        mixtureTouches: '',
        bacharachSliceReceiptLines: '0',
        receiptsDescribeBehaviours: 'false',
        sectionShaping_densityDeltaBMinusA: '',
        sectionShaping_colourDeltaBMinusA: '',
        sectionShaping_openingVsReturnDelta: '',
        sectionShaping_returnVariationType: '',
        sectionShaping_contributingSliceCount: '',
        sectionShaping_returnSummary: '',
      };

  return {
    arm,
    seed: req.seed,
    primarySongwriter: primaryLabel,
    success: artifactOk,
    engineDeclaredSuccess: !!res.success,
    manifestBehaviourGates: gates === null ? '' : String(gates),
    ...fields,
    bacharachGceScore: '',
    flagSmoothWin: '',
    flagBridgeContrast: '',
    flagReturnWin: '',
    flagReceipts: '',
    manifestRaw,
  };
}

export function emptyBacharachEvalRow(
  arm: BacharachEvalCsvRow['arm'],
  seed: number,
  primaryLabel: string
): BacharachEvalCsvRow & { manifestRaw: null } {
  return {
    arm,
    seed,
    primarySongwriter: primaryLabel,
    success: false,
    engineDeclaredSuccess: false,
    manifestBehaviourGates: '',
    smoothMaj7M7Ratio: '',
    secDomTotal: '',
    secDomBMinusA: '',
    safeNonDiatonicTotal: '',
    nonDiatonicBMinusA: '',
    colourBMinusA: '',
    openingReturnDelta: '',
    sectionContrastDelta: '',
    bridgeColourApplied: 'false',
    returnCadenceLiftApplied: 'false',
    mixtureTouches: '',
    bacharachSliceReceiptLines: '0',
    receiptsDescribeBehaviours: 'false',
    sectionShaping_densityDeltaBMinusA: '',
    sectionShaping_colourDeltaBMinusA: '',
    sectionShaping_openingVsReturnDelta: '',
    sectionShaping_returnVariationType: '',
    sectionShaping_contributingSliceCount: '',
    sectionShaping_returnSummary: '',
    bacharachGceScore: '',
    flagSmoothWin: '',
    flagBridgeContrast: '',
    flagReturnWin: '',
    flagReceipts: '',
    manifestRaw: null,
  };
}

export interface BacharachReceiptVerification {
  manifestParsed: boolean;
  songModeNotesPresent: boolean;
  bacharachSliceLineCount: number;
  /** Keyword checks against implemented slice wording (best-effort; non-fatal). */
  checks: {
    smoothPillarColour: boolean;
    secondaryDominantMotion: boolean;
    bridgeColourShift: boolean;
    lighterAccompaniment: boolean;
    returnOrHomeMention: boolean;
  };
  allImplementedChecksHit: boolean;
}

/** Inspect `_meta` JSON for Bacharach Song Mode surface notes (diagnostic; does not throw). */
export function verifyBacharachSongModeReceipts(manifestRaw: string | null | undefined): BacharachReceiptVerification {
  const emptyChecks = {
    smoothPillarColour: false,
    secondaryDominantMotion: false,
    bridgeColourShift: false,
    lighterAccompaniment: false,
    returnOrHomeMention: false,
  };
  if (!manifestRaw?.trim()) {
    return {
      manifestParsed: false,
      songModeNotesPresent: false,
      bacharachSliceLineCount: 0,
      checks: emptyChecks,
      allImplementedChecksHit: false,
    };
  }
  let notes: string[] = [];
  try {
    const j = JSON.parse(manifestRaw) as Record<string, unknown>;
    const n = j.songModeStyleSurfaceNotes;
    notes = Array.isArray(n) ? (n as string[]).filter((x) => typeof x === 'string') : [];
  } catch {
    return {
      manifestParsed: false,
      songModeNotesPresent: false,
      bacharachSliceLineCount: 0,
      checks: emptyChecks,
      allImplementedChecksHit: false,
    };
  }
  const sliceLines = notes.filter((l) => l.includes('Bacharach slice:'));
  const blob = notes.join(' ');
  const checks = {
    smoothPillarColour: /maj7|m7|I\s*\/\s*IV|smooth|pillar/i.test(blob),
    secondaryDominantMotion: /secondary|dominant/i.test(blob),
    bridgeColourShift: /bridge|key-colour|colour shift/i.test(blob),
    lighterAccompaniment: /lighter|melody-supportive|accompaniment/i.test(blob),
    returnOrHomeMention: /return|home/i.test(blob),
  };
  const allImplementedChecksHit = Object.values(checks).every(Boolean);
  return {
    manifestParsed: true,
    songModeNotesPresent: notes.length > 0,
    bacharachSliceLineCount: sliceLines.length,
    checks,
    allImplementedChecksHit,
  };
}

export interface EvalPipelineResult {
  finalRows: BacharachEvalCsvRow[];
  csv: string;
  reportMd: string;
  gceBySeed: Map<number, string>;
  scoreMap: Map<number, number>;
  breakdownBySeed: Map<number, BacharachGceScoreBreakdown>;
  neutralHigherSmooth: number;
  metricsPresentSeeds: number;
  agg: ReturnType<typeof aggregateBacharachGce> & {
    artifactFailures: number;
    softFailures: number;
    bachRunsWithArtifacts: number;
  };
}

export function buildBacharachEvalPipeline(
  seeds: number[],
  neutralPrimary: string,
  internal: Array<BacharachEvalCsvRow & { manifestRaw: string | null }>,
  outDirForReport: string
): EvalPipelineResult {
  const gceBySeed = new Map<number, string>();
  const breakdownBySeed = new Map<number, BacharachGceScoreBreakdown>();
  let neutralHigherSmooth = 0;
  let metricsPresentSeeds = 0;

  for (const seed of seeds) {
    const nb = internal.find((r) => r.seed === seed && r.arm === 'neutral');
    const bb = internal.find((r) => r.seed === seed && r.arm === 'bacharach');
    if (nb?.manifestRaw && bb?.manifestRaw) {
      const pn = parseManifestJsonForBacharachEval(nb.manifestRaw);
      const pb = parseManifestJsonForBacharachEval(bb.manifestRaw);
      const mn = metricsFromParsedBacharachManifest(pn);
      const mb = metricsFromParsedBacharachManifest(pb);
      if (mn.smoothMaj7M7Ratio != null && mb.smoothMaj7M7Ratio != null) {
        metricsPresentSeeds++;
        if (mn.smoothMaj7M7Ratio > mb.smoothMaj7M7Ratio + 1e-6) neutralHigherSmooth++;
      }
      const { score, breakdown } = computeBacharachGceScore(mn, mb, pb);
      gceBySeed.set(seed, String(score));
      breakdownBySeed.set(seed, breakdown);
    } else {
      gceBySeed.set(seed, '');
    }
  }

  const scoreMap = new Map<number, number>();
  for (const seed of seeds) {
    const v = gceBySeed.get(seed);
    if (v === '' || v == null) continue;
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) scoreMap.set(seed, n);
  }

  const finalRows: BacharachEvalCsvRow[] = internal.map(({ manifestRaw: _m, ...row }) => {
    const score = gceBySeed.get(row.seed) ?? '';
    const bd = breakdownBySeed.get(row.seed);
    return {
      ...row,
      bacharachGceScore: score,
      flagSmoothWin: bd ? String(bd.smoothVersusNeutral) : '',
      flagBridgeContrast: bd ? String(bd.bridgeMoreAdventurousBounded) : '',
      flagReturnWin: bd ? String(bd.returnVariationVersusNeutral) : '',
      flagReceipts: bd ? String(bd.receiptsOk) : '',
    };
  });

  const csv = stringifyCsv([...BACHARACH_EVAL_CSV_HEADERS], finalRows.map((r) => rowToCsvRecord(r)));

  const agg = aggregateBacharachGce(seeds, scoreMap, breakdownBySeed);
  agg.artifactFailures = finalRows.filter((r) => !r.success).length;
  agg.softFailures = finalRows.filter((r) => r.success && !r.engineDeclaredSuccess).length;
  agg.bachRunsWithArtifacts = seeds.filter((s) => {
    const r = finalRows.find((x) => x.seed === s && x.arm === 'bacharach');
    return r?.success === true;
  }).length;

  const outDirRel = path.relative(REPO_ROOT, outDirForReport);
  const reportMd = buildBacharachEvalReportMarkdown({
    neutralPrimary,
    seeds,
    outDirRel: outDirRel || '.',
    agg,
    neutralHigherSmoothCount: neutralHigherSmooth,
    metricsPresentSeeds,
  });

  return {
    finalRows,
    csv,
    reportMd,
    gceBySeed,
    scoreMap,
    breakdownBySeed,
    neutralHigherSmooth,
    metricsPresentSeeds,
    agg,
  };
}

export interface WorkflowReadySummary {
  lines: string[];
  verdict: string;
}

/**
 * Console "ready to commit?" block — diagnostic wording only; does not gate CI.
 */
export function buildWorkflowReadySummary(args: {
  seeds: number[];
  scoreMap: Map<number, number>;
  breakdownBySeed: Map<number, BacharachGceScoreBreakdown>;
  bachRunsWithArtifacts: number;
  bachRunsAttempted: number;
  receiptVerificationHits: number;
  neutralHigherSmooth: number;
  smoothWinCount: number;
}): WorkflowReadySummary {
  const scores = args.seeds.map((s) => args.scoreMap.get(s)).filter((x): x is number => typeof x === 'number');
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const sorted = [...scores].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;

  const lines: string[] = [
    '',
    '======== Bacharach workflow — ready to commit? (diagnostic) ========',
    `Bacharach runs with MusicXML artifact: ${args.bachRunsWithArtifacts} / ${args.bachRunsAttempted}`,
    `Bacharach manifests with receipt keyword checks passed: ${args.receiptVerificationHits} / ${args.bachRunsAttempted}`,
    `Mean GCE score (0–4): ${mean?.toFixed(2) ?? '—'} | median: ${median?.toFixed(2) ?? '—'}`,
    `Seeds where Bacharach smooth ratio > neutral: ${args.smoothWinCount} / ${args.seeds.length}`,
    `Seeds where neutral had higher smooth ratio (sanity): ${args.neutralHigherSmooth} / ${args.seeds.length}`,
  ];

  const distinguishable =
    args.bachRunsWithArtifacts >= Math.ceil(args.bachRunsAttempted * 0.6) &&
    args.smoothWinCount >= Math.ceil(args.seeds.length * 0.4);

  const verdict = distinguishable
    ? 'Bacharach slice appears distinguishable and stable vs neutral; review report and listening A/B before commit.'
    : 'Mixed or incomplete artifacts; inspect CSV, manifests, and errors before commit.';

  lines.push(`Verdict: ${verdict}`);
  lines.push('====================================================================');
  lines.push('');

  return { lines, verdict };
}
