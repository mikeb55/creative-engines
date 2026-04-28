/**
 * Batch-eval STYLE_SOPHISTICATED_POP vs neutral STYLE_ECM (same seeds, neutral primary songwriter).
 *
 * From repo root:
 *   npm run eval:style-soph-pop -- [--out DIR] [--count N] [--seed-start S] [--primary beatles]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import {
  computeGceStyleScore,
  metricsFromParsedManifest,
  parseBehaviourGatesFromManifestRaw,
  parseManifestJsonForSophPopEval,
  rowToCsvRecord,
  SOPH_POP_EVAL_CSV_HEADERS,
  stringifyCsv,
  type StyleEvalCsvRow,
} from './eval/sophisticatedPopStyleEvalCore';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const EVAL_CLI_FLAGS = new Set([
  '--out',
  '--seeds',
  '--count',
  '--seed-start',
  '--primary',
]);

function getEvalArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => EVAL_CLI_FLAGS.has(a));
  return idx >= 0 ? argv.slice(idx) : [];
}

function parseArgs(argv: string[]): {
  outDir: string;
  seeds: number[];
  primaryNeutral: string;
} {
  let outDir = path.join(REPO_ROOT, 'output', 'style-soph-pop-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 96000;
  let primaryNeutral = 'beatles';

  const tail = getEvalArgvTail(argv);
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
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
      count = parseInt(tail[++i], 10) || 5;
    } else if (a === '--seed-start' && tail[i + 1]) {
      seedStart = parseInt(tail[++i], 10) || seedStart;
    } else if (a === '--primary' && tail[i + 1]) {
      primaryNeutral = tail[++i];
    }
  }

  if (seeds.length === 0) {
    for (let k = 0; k < count; k++) seeds.push(seedStart + k);
  }

  return { outDir, seeds, primaryNeutral };
}

function buildRequest(seed: number, primary: string | undefined, styleProfile: StyleProfile): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `SophPop eval ${styleProfile} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile,
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primary ? { primarySongwriterStyle: primary } : {}),
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(n);
}

function runOne(
  req: GenerateRequest,
  runsDir: string,
  arm: StyleEvalCsvRow['arm']
): StyleEvalCsvRow & { manifestRaw: string | null } {
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
  const parsed = manifestRaw ? parseManifestJsonForSophPopEval(manifestRaw) : null;
  const m = parsed ? metricsFromParsedManifest(parsed) : null;
  const gates = manifestRaw ? parseBehaviourGatesFromManifestRaw(manifestRaw) : null;

  return {
    arm,
    seed: req.seed,
    styleName: req.styleProfile ?? '',
    success: artifactOk,
    engineDeclaredSuccess: !!res.success,
    manifestBehaviourGates: gates === null ? '' : String(gates),
    extChordRatio: fmt(m?.extChordRatio ?? null),
    meanColourNorm: fmt(m?.meanColourNorm ?? null),
    nonDiatonicCount: fmt(m?.nonDiatonicCount ?? null),
    sectionContrastDelta: fmt(m?.sectionContrastDelta ?? null),
    densityColourA: fmt(m?.densityColourA ?? null),
    densityColourB: fmt(m?.densityColourB ?? null),
    openingReturnDelta: fmt(m?.openingReturnDelta ?? null),
    syncBias: fmt(m?.syncBias ?? null),
    densityBias: fmt(m?.densityBias ?? null),
    receiptsSophPop: m?.sophPopReceiptsPresent ? 'true' : 'false',
    sectionShaping_densityDeltaBMinusA: fmt(m?.sectionShaping_densityDeltaBMinusA ?? null),
    sectionShaping_colourDeltaBMinusA: fmt(m?.sectionShaping_colourDeltaBMinusA ?? null),
    sectionShaping_openingVsReturnDelta: fmt(m?.sectionShaping_openingVsReturnDelta ?? null),
    sectionShaping_returnVariationType: m?.sectionShaping_returnVariationType ?? '',
    sectionShaping_contributingSliceCount: fmt(m?.sectionShaping_contributingSliceCount ?? null),
    sectionShaping_returnSummary: m?.sectionShaping_returnSummary
      ? String(m.sectionShaping_returnSummary).slice(0, 200)
      : '',
    gceStyleScore: '',
    manifestRaw,
  };
}

function emptyRow(
  arm: StyleEvalCsvRow['arm'],
  seed: number,
  styleName: string
): StyleEvalCsvRow & { manifestRaw: null } {
  return {
    arm,
    seed,
    styleName,
    success: false,
    engineDeclaredSuccess: false,
    manifestBehaviourGates: '',
    extChordRatio: '',
    meanColourNorm: '',
    nonDiatonicCount: '',
    sectionContrastDelta: '',
    densityColourA: '',
    densityColourB: '',
    openingReturnDelta: '',
    syncBias: '',
    densityBias: '',
    receiptsSophPop: 'false',
    sectionShaping_densityDeltaBMinusA: '',
    sectionShaping_colourDeltaBMinusA: '',
    sectionShaping_openingVsReturnDelta: '',
    sectionShaping_returnVariationType: '',
    sectionShaping_contributingSliceCount: '',
    sectionShaping_returnSummary: '',
    gceStyleScore: '',
    manifestRaw: null,
  };
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const internal: Array<StyleEvalCsvRow & { manifestRaw: string | null }> = [];

  for (const seed of args.seeds) {
    try {
      internal.push(runOne(buildRequest(seed, args.primaryNeutral, 'STYLE_ECM'), runsDir, 'neutral_ecm'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[eval] neutral seed ${seed}: ${msg}`);
      internal.push(emptyRow('neutral_ecm', seed, 'STYLE_ECM'));
    }

    try {
      internal.push(
        runOne(buildRequest(seed, args.primaryNeutral, 'STYLE_SOPHISTICATED_POP'), runsDir, 'soph_pop')
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[eval] soph_pop seed ${seed}: ${msg}`);
      internal.push(emptyRow('soph_pop', seed, 'STYLE_SOPHISTICATED_POP'));
    }
  }

  const gceBySeed = new Map<number, string>();
  for (const seed of args.seeds) {
    const ne = internal.find((r) => r.seed === seed && r.arm === 'neutral_ecm');
    const sp = internal.find((r) => r.seed === seed && r.arm === 'soph_pop');
    if (ne?.manifestRaw && sp?.manifestRaw) {
      const mn = metricsFromParsedManifest(parseManifestJsonForSophPopEval(ne.manifestRaw));
      const ms = metricsFromParsedManifest(parseManifestJsonForSophPopEval(sp.manifestRaw));
      gceBySeed.set(seed, String(computeGceStyleScore(mn, ms).score));
    } else {
      gceBySeed.set(seed, '');
    }
  }

  const finalRows: StyleEvalCsvRow[] = internal.map(({ manifestRaw: _m, ...row }) => ({
    ...row,
    gceStyleScore: gceBySeed.get(row.seed) ?? '',
  }));

  const csv = stringifyCsv(
    [...SOPH_POP_EVAL_CSV_HEADERS],
    finalRows.map((r) => rowToCsvRecord(r))
  );

  let extLiftRuns = 0;
  let bDenserRuns = 0;
  for (const seed of args.seeds) {
    const ne = internal.find((r) => r.seed === seed && r.arm === 'neutral_ecm');
    const sp = internal.find((r) => r.seed === seed && r.arm === 'soph_pop');
    if (!ne?.manifestRaw || !sp?.manifestRaw) continue;
    const mn = metricsFromParsedManifest(parseManifestJsonForSophPopEval(ne.manifestRaw));
    const ms = metricsFromParsedManifest(parseManifestJsonForSophPopEval(sp.manifestRaw));
    if (
      mn.extChordRatio != null &&
      ms.extChordRatio != null &&
      ms.extChordRatio > mn.extChordRatio + 1e-6
    )
      extLiftRuns++;
    if (
      ms.densityColourB != null &&
      ms.densityColourA != null &&
      ms.densityColourB > ms.densityColourA + 0.02
    )
      bDenserRuns++;
  }

  const scores = args.seeds
    .map((s) => gceBySeed.get(s))
    .filter((x): x is string => typeof x === 'string' && x !== '')
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));

  const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const sorted = [...scores].sort((a, b) => a - b);
  const medianScore =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;

  const shapingAb = buildBatchSectionShapingAbMarkdown({
    seeds: args.seeds,
    rows: internal.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'neutral_ecm',
    armB: 'soph_pop',
    labelA: 'STYLE_ECM (neutral)',
    labelB: 'STYLE_SOPHISTICATED_POP',
  });

  const md = `# Sophisticated Pop style eval (GCE-style diagnostic)

- **Runs:** ${finalRows.length} (${args.seeds.length} seeds × neutral STYLE_ECM + STYLE_SOPHISTICATED_POP)
- **Primary songwriter (neutral reference):** \`${args.primaryNeutral}\`
- **Artifact failures:** ${finalRows.filter((r) => !r.success).length}
- **Soft failures (artifact OK, engine success false):** ${finalRows.filter((r) => r.success && !r.engineDeclaredSuccess).length}

## Sophisticated Pop style GCE (diagnostic score 0–4 per seed)

- **Mean GCE score:** ${meanScore?.toFixed(2) ?? '—'}
- **Median GCE score:** ${medianScore?.toFixed(2) ?? '—'}
- **Soph Pop extended-chord ratio > neutral:** ${extLiftRuns} / ${args.seeds.length} seeds
- **Soph Pop B-section colour denser than A (threshold):** ${bDenserRuns} / ${args.seeds.length} seeds

Scores compare rhythm/metadata receipts + harmony diagnostics + chord progression echo. **Not a release gate** — directionality and consistency only.

## CSV

\`style-soph-pop-eval.csv\` — columns include \`gceStyleScore\` (same value on both arms for that seed).

${shapingAb}
`;

  fs.writeFileSync(path.join(args.outDir, 'style-soph-pop-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'style-soph-pop-eval-report.md'), md, 'utf-8');

  console.log(`Wrote:\n  ${path.join(args.outDir, 'style-soph-pop-eval.csv')}\n  ${path.join(args.outDir, 'style-soph-pop-eval-report.md')}`);
  console.log(`Runs directory: ${runsDir}`);
}

main();
