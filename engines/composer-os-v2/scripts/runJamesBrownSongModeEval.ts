/**
 * Batch-evaluate James Brown Song Mode — aggregations for vamp lock, stabs, d1–d5, anti-elaboration guards.
 *
 * Usage (from repo root):
 *   npm run eval:james_brown -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_JB_PRIMARY = 'james_brown' as const;
const DEFAULT_NEUTRAL_PRIMARY = 'carole_king' as const;

const EVAL_CLI_FLAGS = new Set([
  '--out',
  '--seeds',
  '--count',
  '--seed-start',
  '--baseline',
  '--primary',
]);

function getEvalArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => EVAL_CLI_FLAGS.has(a));
  return idx >= 0 ? argv.slice(idx) : [];
}

function parseArgs(argv: string[]): {
  outDir: string;
  seeds: number[];
  baseline: 'neutral' | 'none';
  primarySongwriter: string;
} {
  let outDir = path.join(REPO_ROOT, 'output', 'james-brown-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 95400;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primarySongwriter = DEFAULT_JB_PRIMARY;

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
    } else if (a === '--baseline' && tail[i + 1]) {
      const v = tail[++i];
      baseline = v === 'none' ? 'none' : 'neutral';
    } else if (a === '--primary' && tail[i + 1]) {
      primarySongwriter = tail[++i]!;
    }
  }

  if (seeds.length === 0) {
    for (let k = 0; k < count; k++) seeds.push(seedStart + k);
  }

  return { outDir, seeds, baseline, primarySongwriter };
}

function buildRequest(seed: number, primarySongwriterStyle: string | undefined): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `James Brown eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

export type JamesBrownEvalArm = 'james_brown' | 'neutral_keys';

export interface JamesBrownEvalRow {
  arm: JamesBrownEvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestRaw: string | null;
  barsConsidered: string;
  vampMeanRun: string;
  stabHitRate: string;
  antiGuardTotal: string;
  sliceReceiptPresent: boolean;
  sliceReceiptPreview: string;
  device1: number;
  device2: number;
  device3: number;
  device4: number;
  device5: number;
}

function parseManifestRoot(raw: string | null): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
  } catch {
    return null;
  }
}

function collectAllDeviceReceipts(j: Record<string, unknown>): string[] {
  const out: string[] = [];
  const flat = j.jamesBrownDeviceReceipts;
  if (Array.isArray(flat)) {
    for (const x of flat) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  }
  const diag = j.jamesBrownDiagnostics;
  if (diag && typeof diag === 'object' && !Array.isArray(diag)) {
    const dr = (diag as Record<string, unknown>).deviceReceipts;
    if (Array.isArray(dr)) {
      for (const x of dr) {
        if (typeof x === 'string' && x.trim()) out.push(x.trim());
      }
    }
  }
  return out;
}

/** Fire counts for jb d1–d5 receipt prefixes. */
export function countJamesBrownDeviceReceiptRates(receipts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of receipts) {
    if (r.startsWith('jb:the_one_anchor@')) counts[0]++;
    else if (r.startsWith('jb:dominant_vamp_lock@')) counts[1]++;
    else if (r.startsWith('jb:horn_stab_rhythm@')) counts[2]++;
    else if (r.startsWith('jb:iv_side_bridge')) counts[3]++;
    else if (r.startsWith('jb:blues_tension@')) counts[4]++;
  }
  return counts;
}

function strField(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  if (typeof v === 'string') return v.length ? v : '—';
  return '—';
}

function buildRowFromRun(args: {
  arm: JamesBrownEvalArm;
  seed: number;
  songwriterId: string;
  res: { success: boolean; error?: string; filepath?: string; manifestPath?: string; validation?: { errors?: string[] } };
  manifestContent: string | null;
}): JamesBrownEvalRow {
  const { arm, seed, songwriterId, res, manifestContent } = args;
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const j = parseManifestRoot(manifestContent);
  const diag = j?.jamesBrownDiagnostics;
  const dObj =
    diag && typeof diag === 'object' && !Array.isArray(diag) ? (diag as Record<string, unknown>) : null;
  const receipt = typeof j?.jamesBrownSliceReceipt === 'string' ? j.jamesBrownSliceReceipt.trim() : '';
  const devReceipts = j ? dedupeDeviceReceiptsFromManifest(j) : [];
  const [device1, device2, device3, device4, device5] = countJamesBrownDeviceReceiptRates(devReceipts);

  const vampMean =
    dObj?.vampLockStats && typeof dObj.vampLockStats === 'object' && !Array.isArray(dObj.vampLockStats)
      ? (dObj.vampLockStats as Record<string, unknown>).meanRun
      : undefined;
  const stabHr =
    dObj?.stabPlacement && typeof dObj.stabPlacement === 'object' && !Array.isArray(dObj.stabPlacement)
      ? (dObj.stabPlacement as Record<string, unknown>).hitRate
      : undefined;
  const antiTot = dObj?.antiElaborationGuardTriggers;

  const err =
    res.success && artifactOk
      ? ''
      : (res.error ?? res.validation?.errors?.[0] ?? 'validation_or_gate_issue');

  return {
    arm,
    seed,
    songwriterId,
    success: artifactOk,
    engineDeclaredSuccess: !!res.success,
    errorMessage: err,
    musicXmlPath: res.filepath ?? '',
    manifestPath: res.manifestPath ?? '',
    manifestRaw: manifestContent,
    barsConsidered: strField(dObj?.barsConsidered),
    vampMeanRun: strField(vampMean),
    stabHitRate: strField(stabHr),
    antiGuardTotal: strField(antiTot),
    sliceReceiptPresent: receipt.length > 0,
    sliceReceiptPreview: receipt ? receipt.slice(0, 200) + (receipt.length > 200 ? '…' : '') : '—',
    device1,
    device2,
    device3,
    device4,
    device5,
  };
}

function dedupeDeviceReceiptsFromManifest(j: Record<string, unknown>): string[] {
  const raw = collectAllDeviceReceipts(j);
  return [...new Set(raw)];
}

function runOne(
  req: GenerateRequest,
  runsDir: string,
  arm: JamesBrownEvalArm,
  songwriterLabel: string
): JamesBrownEvalRow {
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
  return buildRowFromRun({
    arm,
    seed,
    songwriterId: songwriterLabel,
    res,
    manifestContent: content,
  });
}

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsv(r: JamesBrownEvalRow): string[] {
  return [
    r.arm,
    String(r.seed),
    r.songwriterId,
    r.success ? '1' : '0',
    r.engineDeclaredSuccess ? '1' : '0',
    escapeCsv(r.errorMessage),
    r.barsConsidered,
    r.vampMeanRun,
    r.stabHitRate,
    r.antiGuardTotal,
    r.sliceReceiptPresent ? '1' : '0',
    escapeCsv(r.sliceReceiptPreview),
    String(r.device1),
    String(r.device2),
    String(r.device3),
    String(r.device4),
    String(r.device5),
    escapeCsv(r.musicXmlPath),
    escapeCsv(r.manifestPath),
  ];
}

const CSV_HEADERS = [
  'arm',
  'seed',
  'songwriterId',
  'success',
  'engineDeclaredSuccess',
  'errorMessage',
  'barsConsidered',
  'vamp_mean_run',
  'stab_hit_rate',
  'anti_guard_total',
  'sliceReceiptPresent',
  'sliceReceiptPreview',
  'd1_the_one_anchor',
  'd2_dominant_vamp_lock',
  'd3_horn_stab_rhythm',
  'd4_iv_side_bridge',
  'd5_blues_tension',
  'musicXmlPath',
  'manifestPath',
];

function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n') + '\n';
}

function buildMarkdown(args: { rows: JamesBrownEvalRow[]; seeds: number[]; baseline: string }): string {
  const { rows, seeds, baseline } = args;
  const jbRows = rows.filter((r) => r.arm === 'james_brown');
  const failures = rows.filter((r) => !r.success);

  const perSeedTable = [
    '| seed | arm | success | bars | vampMean | stabHit | antiG | d1 | d2 | d3 | d4 | d5 | sliceReceipt |',
    '|------|-----|---------|------|----------|---------|-------|----|----|----|----|----|--------------|',
  ];
  for (const r of [...rows].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm))) {
    perSeedTable.push(
      `| ${r.seed} | ${r.arm} | ${r.success ? 'yes' : 'no'} | ${r.barsConsidered} | ${r.vampMeanRun} | ${r.stabHitRate} | ${r.antiGuardTotal} | ${r.device1} | ${r.device2} | ${r.device3} | ${r.device4} | ${r.device5} | ${r.sliceReceiptPresent ? 'yes' : 'no'} |`
    );
  }

  const jbAgg = jbRows.length
    ? jbRows.map((r) => ({
        seed: r.seed,
        d1: r.device1,
        d2: r.device2,
        d3: r.device3,
        d4: r.device4,
        d5: r.device5,
        stab: r.stabHitRate,
        anti: r.antiGuardTotal,
      }))
    : [];

  const summaryLines =
    jbAgg.length > 0
      ? jbAgg.map(
          (x) =>
            `- **Seed ${x.seed}:** d1=${x.d1} d2=${x.d2} d3=${x.d3} d4=${x.d4} d5=${x.d5} | stabHit=${x.stab} | antiGuards=${x.anti}`
        )
      : ['_No James Brown arm rows._'];

  return `# James Brown Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Primary (JB arm):** \`${DEFAULT_JB_PRIMARY}\`
- **Neutral baseline:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}

## Per-run summary

${perSeedTable.join('\n')}

## James Brown — device fire rates + guards

${summaryLines.join('\n')}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'james_brown',
    armB: 'neutral_keys',
    labelA: `James Brown (${DEFAULT_JB_PRIMARY})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation

- **d1–d5** count receipt prefixes \`jb:the_one_anchor@\`, \`jb:dominant_vamp_lock@\`, \`jb:horn_stab_rhythm@\`, \`jb:iv_side_bridge\`, \`jb:blues_tension@\`.
- **vamp_mean_run** / **stab_hit_rate** / **anti_guard_total** come from \`jamesBrownDiagnostics\` when present.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const rows: JamesBrownEvalRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(
        runOne(buildRequest(seed, args.primarySongwriter), runsDir, 'james_brown', args.primarySongwriter)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        arm: 'james_brown',
        seed,
        songwriterId: args.primarySongwriter,
        success: false,
        engineDeclaredSuccess: false,
        errorMessage: msg,
        musicXmlPath: '',
        manifestPath: '',
        manifestRaw: null,
        barsConsidered: '—',
        vampMeanRun: '—',
        stabHitRate: '—',
        antiGuardTotal: '—',
        sliceReceiptPresent: false,
        sliceReceiptPreview: '—',
        device1: 0,
        device2: 0,
        device3: 0,
        device4: 0,
        device5: 0,
      });
      console.warn(`[eval] James Brown seed ${seed} threw: ${msg}`);
    }

    if (args.baseline === 'neutral') {
      try {
        rows.push(
          runOne(buildRequest(seed, DEFAULT_NEUTRAL_PRIMARY), runsDir, 'neutral_keys', DEFAULT_NEUTRAL_PRIMARY)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        rows.push({
          arm: 'neutral_keys',
          seed,
          songwriterId: DEFAULT_NEUTRAL_PRIMARY,
          success: false,
          engineDeclaredSuccess: false,
          errorMessage: msg,
          musicXmlPath: '',
          manifestPath: '',
          manifestRaw: null,
          barsConsidered: '—',
          vampMeanRun: '—',
          stabHitRate: '—',
          antiGuardTotal: '—',
          sliceReceiptPresent: false,
          sliceReceiptPreview: '—',
          device1: 0,
          device2: 0,
          device3: 0,
          device4: 0,
          device5: 0,
        });
        console.warn(`[eval] Neutral seed ${seed} threw: ${msg}`);
      }
    }
  }

  const csv = stringifyCsv(
    CSV_HEADERS,
    rows.map((r) => rowToCsv(r))
  );
  const md = buildMarkdown({
    rows,
    seeds: args.seeds,
    baseline: args.baseline,
  });

  fs.writeFileSync(path.join(args.outDir, 'james-brown-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'james-brown-songmode-eval-report.md'), md, 'utf-8');

  const jb = rows.filter((r) => r.arm === 'james_brown');
  const d1 = jb.reduce((s, r) => s + r.device1, 0);
  const d2 = jb.reduce((s, r) => s + r.device2, 0);
  const d3 = jb.reduce((s, r) => s + r.device3, 0);
  const d4 = jb.reduce((s, r) => s + r.device4, 0);
  const d5 = jb.reduce((s, r) => s + r.device5, 0);
  const anti = jb.map((r) => parseInt(r.antiGuardTotal, 10)).filter((n) => !Number.isNaN(n));
  const antiSum = anti.reduce((a, b) => a + b, 0);

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'james-brown-songmode-eval.csv')}\n  ${path.join(args.outDir, 'james-brown-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);
  console.log(
    `[eval:james_brown] JB arm runs=${jb.length} aggregate d1–d5 counts=${d1},${d2},${d3},${d4},${d5} antiElaborationGuardTriggers(sum)=${antiSum}`
  );
}

main();
