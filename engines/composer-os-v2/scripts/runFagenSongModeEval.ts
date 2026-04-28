/**
 * Batch-evaluate Donald Fagen Song Mode vs optional neutral keys baseline (same seeds).
 *
 * Usage:
 *   From repo root: npm run eval:fagen -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none] [--primary donald_fagen]
 *   (Always pass `--` before CLI flags when using npm.)
 * Relative `--out` is resolved from the repo root (`creative-engines`), not `engines/composer-os-v2`.
 *
 * Env:
 *   COMPOSER_OS_EVAL_BASELINE_MANIFEST_DIR — optional folder of prior `_meta/*.manifest.json` files keyed by `seed`
 *     for offline delta-vs-baseline (manual copy from another branch/build). Not automatic git checkout.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import {
  aggregateFagenRuns,
  buildRowFromManifest,
  FAGEN_EVAL_CSV_HEADERS,
  parseManifestJsonContent,
  rowToCsvRecord,
  stringifyCsv,
  type RunMetricRow,
} from './eval/fagenSongModeEvalCore';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

/** `scripts` → `composer-os-v2` → `engines` → repo root */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_NEUTRAL_PRIMARY = 'carole_king' as const;

/** Ignore ts-node / Node preamble (`--transpile-only`, loader paths, …): parse only from the first eval-specific flag. */
const EVAL_CLI_FLAGS = new Set([
  '--out',
  '--seeds',
  '--count',
  '--seed-start',
  '--baseline',
  '--primary',
  '--baseline-manifest-dir',
]);

function getEvalArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => EVAL_CLI_FLAGS.has(a));
  return idx >= 0 ? argv.slice(idx) : [];
}

function parseArgs(argv: string[]): {
  outDir: string;
  seeds: number[];
  baseline: 'neutral' | 'none';
  primaryFagen: string;
  baselineManifestDir: string | null;
} {
  let outDir = path.join(REPO_ROOT, 'output', 'fagen-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 94100;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primaryFagen = 'donald_fagen';
  let baselineManifestDir: string | null = process.env.COMPOSER_OS_EVAL_BASELINE_MANIFEST_DIR?.trim() || null;

  const tail = getEvalArgvTail(argv);
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
    if (a === '--out' && tail[i + 1]) {
      const raw = tail[++i];
      /** npm `--prefix engines/composer-os-v2` cwd is package root; anchor relative dirs at repo root for stable `output/fagen-eval`. */
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
    } else if (a === '--baseline' && tail[i + 1]) {
      const v = tail[++i];
      baseline = v === 'none' ? 'none' : 'neutral';
    } else if (a === '--primary' && tail[i + 1]) {
      primaryFagen = tail[++i];
    } else if (a === '--baseline-manifest-dir' && tail[i + 1]) {
      baselineManifestDir = path.resolve(tail[++i]);
    }
  }

  if (seeds.length === 0) {
    for (let k = 0; k < count; k++) seeds.push(seedStart + k);
  }

  return { outDir, seeds, baseline, primaryFagen, baselineManifestDir };
}

function buildRequest(seed: number, primarySongwriterStyle: string | undefined): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `Fagen eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

function loadBaselineManifestIndex(dir: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!fs.existsSync(dir)) return map;
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.manifest.json')) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = parseManifestJsonContent(raw);
          if (parsed.seed != null) map.set(parsed.seed, raw);
        } catch {
          /* skip */
        }
      }
    }
  };
  walk(dir);
  return map;
}

function runOne(
  req: GenerateRequest,
  runsDir: string,
  arm: 'fagen' | 'neutral_keys',
  songwriterLabel: string
): RunMetricRow {
  const res = runAppGeneration(req, runsDir);
  const seed = req.seed;
  const manifestPath = res.manifestPath ?? '';
  let content: string | null = null;
  if (manifestPath && fs.existsSync(manifestPath)) {
    try {
      content = fs.readFileSync(manifestPath, 'utf-8');
    } catch {
      content = null;
    }
  }
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  return buildRowFromManifest({
    arm,
    seed,
    songwriterId: songwriterLabel,
    success: artifactOk,
    engineDeclaredSuccess: !!res.success,
    manifestBehaviourGates: null,
    errorMessage:
      res.success ? '' : (res.error ?? res.validation?.errors?.[0] ?? 'validation_or_gate_issue'),
    musicXmlPath: res.filepath ?? '',
    manifestPath,
    manifestContent: content,
  });
}

function compareFagenVsNeutral(rows: RunMetricRow[]): string {
  const bySeed = new Map<number, { fagen?: RunMetricRow; neutral?: RunMetricRow }>();
  for (const r of rows) {
    const slot = bySeed.get(r.seed) ?? {};
    if (r.arm === 'fagen') slot.fagen = r;
    if (r.arm === 'neutral_keys') slot.neutral = r;
    bySeed.set(r.seed, slot);
  }
  const lines: string[] = [
    '| seed | Fagen mean sync | Neutral mean sync | Δ |',
    '|------|-----------------|-------------------|---|',
  ];
  for (const [seed, pair] of [...bySeed.entries()].sort((a, b) => a[0] - b[0])) {
    const f = pair.fagen?.meanSyncopationIndex;
    const n = pair.neutral?.meanSyncopationIndex;
    const d =
      typeof f === 'number' && typeof n === 'number' ? (f - n).toFixed(3) : '—';
    lines.push(`| ${seed} | ${f ?? '—'} | ${n ?? '—'} | ${d} |`);
  }
  lines.push('');
  lines.push('Behaviour gates (from manifest validation):');
  lines.push('| seed | Fagen behaviourGates | Neutral behaviourGates |');
  lines.push('|------|----------------------|--------------------------|');
  for (const [seed, pair] of [...bySeed.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(
      `| ${seed} | ${pair.fagen?.manifestBehaviourGates ?? '—'} | ${pair.neutral?.manifestBehaviourGates ?? '—'} |`
    );
  }
  return lines.join('\n');
}

function manifestRawFromRow(r: RunMetricRow): string | null {
  if (!r.manifestPath || !fs.existsSync(r.manifestPath)) return null;
  try {
    return fs.readFileSync(r.manifestPath, 'utf-8');
  } catch {
    return null;
  }
}

function compareToBaselineDisk(fagenRows: RunMetricRow[], baselineBySeed: Map<number, string>): string {
  if (baselineBySeed.size === 0) return '_No baseline manifest dir or no matching seeds._';
  const lines: string[] = [
    '| seed | Fagen mean sync | Baseline mean sync | Δ |',
    '|------|-----------------|-------------------|---|',
  ];
  for (const r of fagenRows.sort((a, b) => a.seed - b.seed)) {
    const raw = baselineBySeed.get(r.seed);
    if (!raw) continue;
    const b = parseManifestJsonContent(raw).fagenDiagnostics?.meanSyncopationIndex;
    const f = r.meanSyncopationIndex;
    const d =
      typeof f === 'number' && typeof b === 'number' ? (f - b).toFixed(3) : '—';
    lines.push(`| ${r.seed} | ${f ?? '—'} | ${b ?? '—'} | ${d} |`);
  }
  return lines.join('\n');
}

function buildMarkdown(args: {
  rows: RunMetricRow[];
  seeds: number[];
  baseline: string;
  baselineManifestDir: string | null;
  agg: ReturnType<typeof aggregateFagenRuns>;
  baselineBySeed: Map<number, string>;
}): string {
  const { rows, seeds, baseline, agg, baselineBySeed, baselineManifestDir } = args;
  const fagenRows = rows.filter((r) => r.arm === 'fagen');
  const failures = rows.filter((r) => !r.success);
  const softFails = rows.filter((r) => r.success && !r.engineDeclaredSuccess);

  return `# Fagen Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Baseline mode:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}
- **Soft validation / gate issues (artifact present, engine success false):** ${softFails.length}

## Aggregate (Fagen arm, rows with MusicXML artifact)

- **n:** ${agg.n}
- **Mean heuristic score:** ${agg.meanScore ?? '—'}
- **Median heuristic score:** ${agg.medianScore ?? '—'}
- **Pass rate — section contrast:** ${(agg.passSectionContrastRate * 100).toFixed(1)}%
- **Pass rate — return evolution proxy:** ${(agg.passReturnRate * 100).toFixed(1)}%
- **Pass rate — signature rule:** ${(agg.signatureRulePassRate * 100).toFixed(1)}%
- **Receipt hint rate:** ${(agg.receiptHintRate * 100).toFixed(1)}%

## Fagen vs neutral keys (same seed)

When baseline \`neutral\` was used — **Fagen-specific sync/density blocks exist only on the Fagen arm**; neutral (\`${DEFAULT_NEUTRAL_PRIMARY}\`) manifests omit them. Use behaviour-gate columns for cross-arm comparison; use sync delta when comparing two Fagen builds.

${compareFagenVsNeutral(rows)}

## Offline baseline manifests (optional)

Folder: \`${baselineManifestDir ?? '(unset)'}\` — set \`COMPOSER_OS_EVAL_BASELINE_MANIFEST_DIR\` or \`--baseline-manifest-dir\`.

${compareToBaselineDisk(fagenRows, baselineBySeed)}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: manifestRawFromRow(r),
    })),
    armA: 'fagen',
    armB: 'neutral_keys',
    labelA: `Fagen (${rows.find((x) => x.arm === 'fagen')?.songwriterId ?? 'donald_fagen'})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation (diagnostics-only)

Strong areas show higher pass rates and positive Fagen vs neutral sync deltas when contrast rules fire. Weak areas: missing \`fagenKeysCompMusicalDiagnostics\`, low inner-motion proxy, or frequent generation failures — inspect CSV \`errorMessage\` column.

## Automation note

**Branch A/B:** This repo does not auto-checkout another git branch. Copy a prior \`_meta/*.manifest.json\` tree into \`COMPOSER_OS_EVAL_BASELINE_MANIFEST_DIR\` to compare engine revisions by seed.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const baselineBySeed = args.baselineManifestDir ? loadBaselineManifestIndex(args.baselineManifestDir) : new Map();

  const rows: RunMetricRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(runOne(buildRequest(seed, args.primaryFagen), runsDir, 'fagen', args.primaryFagen));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push(
        buildRowFromManifest({
          arm: 'fagen',
          seed,
          songwriterId: args.primaryFagen,
          success: false,
          engineDeclaredSuccess: false,
          manifestBehaviourGates: null,
          errorMessage: msg,
          musicXmlPath: '',
          manifestPath: '',
          manifestContent: null,
        })
      );
      console.warn(`[eval] Fagen seed ${seed} threw: ${msg}`);
    }
    if (args.baseline === 'neutral') {
      try {
        rows.push(
          runOne(buildRequest(seed, DEFAULT_NEUTRAL_PRIMARY), runsDir, 'neutral_keys', DEFAULT_NEUTRAL_PRIMARY)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        rows.push(
          buildRowFromManifest({
            arm: 'neutral_keys',
            seed,
            songwriterId: DEFAULT_NEUTRAL_PRIMARY,
            success: false,
            engineDeclaredSuccess: false,
            manifestBehaviourGates: null,
            errorMessage: msg,
            musicXmlPath: '',
            manifestPath: '',
            manifestContent: null,
          })
        );
        console.warn(`[eval] Neutral seed ${seed} threw: ${msg}`);
      }
    }
  }

  const csv = stringifyCsv(
    [...FAGEN_EVAL_CSV_HEADERS],
    rows.map((r) => rowToCsvRecord(r))
  );

  const agg = aggregateFagenRuns(rows);
  const md = buildMarkdown({
    rows,
    seeds: args.seeds,
    baseline: args.baseline,
    baselineManifestDir: args.baselineManifestDir,
    agg,
    baselineBySeed,
  });

  fs.writeFileSync(path.join(args.outDir, 'fagen-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'fagen-songmode-eval-report.md'), md, 'utf-8');

  console.log(`Wrote:\n  ${path.join(args.outDir, 'fagen-songmode-eval.csv')}\n  ${path.join(args.outDir, 'fagen-songmode-eval-report.md')}`);
  console.log(`Runs directory: ${runsDir}`);
}

main();
