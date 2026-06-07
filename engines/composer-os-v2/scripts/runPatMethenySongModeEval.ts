/**
 * Batch-evaluate Pat Metheny Song Mode slice — read-only aggregations + guard/device stats.
 *
 * Usage (from repo root):
 *   npm run eval:pat_metheny -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_PM_PRIMARY = 'pat_metheny' as const;
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
  let outDir = path.join(REPO_ROOT, 'output', 'pat-metheny-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 95400;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primarySongwriter: string = DEFAULT_PM_PRIMARY;

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
    title: `Pat Metheny eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

export type PatMethenyEvalArm = 'pat_metheny' | 'neutral_keys';

export interface PatMethenyEvalRow {
  arm: PatMethenyEvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestRaw: string | null;
  barsConsidered: string;
  lydianColourHitRate: string;
  susFloatHitRate: string;
  pedalHoldMaxBars: string;
  antiElaborationGuardTriggers: string;
  sliceReceiptPresent: boolean;
  sliceReceiptPreview: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
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
  const flat = j.patMethenyDeviceReceipts;
  if (Array.isArray(flat)) {
    for (const x of flat) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  }
  const diag = j.patMethenyDiagnostics;
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

/** Fire counts for pm:lydian_home / pedal_shimmer / diatonic_planing / sus_float / modal_sideSlip */
export function countPatMethenyDeviceReceiptRates(receipts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of receipts) {
    if (r.includes('pm:lydian_home')) counts[0]!++;
    else if (r.includes('pm:pedal_shimmer')) counts[1]!++;
    else if (r.includes('pm:diatonic_planing')) counts[2]!++;
    else if (r.includes('pm:sus_float')) counts[3]!++;
    else if (r.includes('pm:modal_sideSlip')) counts[4]!++;
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
  arm: PatMethenyEvalArm;
  seed: number;
  songwriterId: string;
  res: { success: boolean; error?: string; filepath?: string; manifestPath?: string; validation?: { errors?: string[] } };
  manifestContent: string | null;
}): PatMethenyEvalRow {
  const { arm, seed, songwriterId, res, manifestContent } = args;
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const j = parseManifestRoot(manifestContent);
  const diag = j?.patMethenyDiagnostics;
  const dObj =
    diag && typeof diag === 'object' && !Array.isArray(diag) ? (diag as Record<string, unknown>) : null;
  const receipt = typeof j?.patMethenySliceReceipt === 'string' ? j.patMethenySliceReceipt.trim() : '';
  const devReceipts = j ? dedupeDeviceReceiptsFromManifest(j) : [];
  const [d1, d2, d3, d4, d5] = countPatMethenyDeviceReceiptRates(devReceipts);

  const err =
    res.success && artifactOk
      ? ''
      : (res.error ?? res.validation?.errors?.[0] ?? 'validation_or_gate_issue');

  const guardTriggers = dObj?.antiElaborationGuardTriggers;

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
    lydianColourHitRate: strField(dObj?.lydianColourHitRate),
    susFloatHitRate: strField(dObj?.susFloatHitRate),
    pedalHoldMaxBars: strField(j?.patMethenyPedalHoldMaxBars ?? dObj?.pedalHoldMaxBars),
    antiElaborationGuardTriggers: strField(guardTriggers),
    sliceReceiptPresent: receipt.length > 0,
    sliceReceiptPreview: receipt ? receipt.slice(0, 200) + (receipt.length > 200 ? '…' : '') : '—',
    d1,
    d2,
    d3,
    d4,
    d5,
  };
}

function dedupeDeviceReceiptsFromManifest(j: Record<string, unknown>): string[] {
  const raw = collectAllDeviceReceipts(j);
  return [...new Set(raw)];
}

function runOne(
  req: GenerateRequest,
  runsDir: string,
  arm: PatMethenyEvalArm,
  songwriterLabel: string
): PatMethenyEvalRow {
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

function rowToCsv(r: PatMethenyEvalRow): string[] {
  return [
    r.arm,
    String(r.seed),
    r.songwriterId,
    r.success ? '1' : '0',
    r.engineDeclaredSuccess ? '1' : '0',
    escapeCsv(r.errorMessage),
    r.barsConsidered,
    r.lydianColourHitRate,
    r.susFloatHitRate,
    r.pedalHoldMaxBars,
    r.antiElaborationGuardTriggers,
    r.sliceReceiptPresent ? '1' : '0',
    escapeCsv(r.sliceReceiptPreview),
    String(r.d1),
    String(r.d2),
    String(r.d3),
    String(r.d4),
    String(r.d5),
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
  'lydianColourHitRate',
  'susFloatHitRate',
  'pedalHoldMaxBars',
  'antiElaborationGuardTriggers',
  'sliceReceiptPresent',
  'sliceReceiptPreview',
  'd1_lydian_home',
  'd2_pedal_shimmer',
  'd3_diatonic_planing',
  'd4_sus_float',
  'd5_modal_sideSlip',
  'musicXmlPath',
  'manifestPath',
];

function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n') + '\n';
}

function buildMarkdown(args: { rows: PatMethenyEvalRow[]; seeds: number[]; baseline: string }): string {
  const { rows, seeds, baseline } = args;
  const pmRows = rows.filter((r) => r.arm === 'pat_metheny');
  const failures = rows.filter((r) => !r.success);

  const perSeedTable = [
    '| seed | arm | success | bars | lydianRate | susRate | pedalMax | guards | d1 | d2 | d3 | d4 | d5 | sliceReceipt |',
    '|------|-----|---------|------|------------|---------|----------|--------|----|----|----|----|----|--------------|',
  ];
  for (const r of [...rows].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm))) {
    perSeedTable.push(
      `| ${r.seed} | ${r.arm} | ${r.success ? 'yes' : 'no'} | ${r.barsConsidered} | ${r.lydianColourHitRate} | ${r.susFloatHitRate} | ${r.pedalHoldMaxBars} | ${r.antiElaborationGuardTriggers} | ${r.d1} | ${r.d2} | ${r.d3} | ${r.d4} | ${r.d5} | ${r.sliceReceiptPresent ? 'yes' : 'no'} |`
    );
  }

  const diagnosticsDetail = pmRows
    .sort((a, b) => a.seed - b.seed)
    .map((r) => {
      return [
        `### Seed ${r.seed} — ${DEFAULT_PM_PRIMARY}`,
        '',
        '| field | value |',
        '|-------|-------|',
        `| barsConsidered | ${r.barsConsidered} |`,
        `| lydianColourHitRate | ${r.lydianColourHitRate} |`,
        `| susFloatHitRate | ${r.susFloatHitRate} |`,
        `| pedalHoldMaxBars | ${r.pedalHoldMaxBars} |`,
        `| antiElaborationGuardTriggers | ${r.antiElaborationGuardTriggers} |`,
        `| d1–d5 fire counts | ${r.d1} / ${r.d2} / ${r.d3} / ${r.d4} / ${r.d5} |`,
        `| patMethenySliceReceipt | ${r.sliceReceiptPresent ? 'present' : 'absent'} |`,
        '',
        `_Receipt preview:_ ${r.sliceReceiptPreview}`,
        '',
      ].join('\n');
    })
    .join('\n');

  return `# Pat Metheny Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Primary (Pat Metheny arm):** \`${DEFAULT_PM_PRIMARY}\`
- **Neutral baseline:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}

## Per-run summary

${perSeedTable.join('\n')}

## Pat Metheny — diagnostics (per seed)

${diagnosticsDetail || '_No Pat Metheny arm rows._'}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'pat_metheny',
    armB: 'neutral_keys',
    labelA: `Pat Metheny (${DEFAULT_PM_PRIMARY})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation

- **d1–d5** count manifest receipts: \`pm:lydian_home\`, \`pm:pedal_shimmer\`, \`pm:diatonic_planing\`, \`pm:sus_float\`, \`pm:modal_sideSlip\`.
- **antiElaborationGuardTriggers** sums ii–V–I flatten, dominant-chain flatten, 2-bar hold, blues-strip.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const rows: PatMethenyEvalRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(
        runOne(buildRequest(seed, args.primarySongwriter), runsDir, 'pat_metheny', args.primarySongwriter)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        arm: 'pat_metheny',
        seed,
        songwriterId: args.primarySongwriter,
        success: false,
        engineDeclaredSuccess: false,
        errorMessage: msg,
        musicXmlPath: '',
        manifestPath: '',
        manifestRaw: null,
        barsConsidered: '—',
        lydianColourHitRate: '—',
        susFloatHitRate: '—',
        pedalHoldMaxBars: '—',
        antiElaborationGuardTriggers: '—',
        sliceReceiptPresent: false,
        sliceReceiptPreview: '—',
        d1: 0,
        d2: 0,
        d3: 0,
        d4: 0,
        d5: 0,
      });
      console.warn(`[eval] Pat Metheny seed ${seed} threw: ${msg}`);
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
          lydianColourHitRate: '—',
          susFloatHitRate: '—',
          pedalHoldMaxBars: '—',
          antiElaborationGuardTriggers: '—',
          sliceReceiptPresent: false,
          sliceReceiptPreview: '—',
          d1: 0,
          d2: 0,
          d3: 0,
          d4: 0,
          d5: 0,
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

  fs.writeFileSync(path.join(args.outDir, 'pat-metheny-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'pat-metheny-songmode-eval-report.md'), md, 'utf-8');

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'pat-metheny-songmode-eval.csv')}\n  ${path.join(args.outDir, 'pat-metheny-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);

  const pm = rows.filter((r) => r.arm === 'pat_metheny' && r.success);
  if (pm.length > 0) {
    const sumD = [0, 0, 0, 0, 0];
    let guardSum = 0;
    let pedalMaxAgg = 0;
    for (const r of pm) {
      sumD[0] += r.d1;
      sumD[1] += r.d2;
      sumD[2] += r.d3;
      sumD[3] += r.d4;
      sumD[4] += r.d5;
      const g = parseInt(r.antiElaborationGuardTriggers, 10);
      if (!Number.isNaN(g)) guardSum += g;
      const p = parseInt(r.pedalHoldMaxBars, 10);
      if (!Number.isNaN(p)) pedalMaxAgg = Math.max(pedalMaxAgg, p);
    }
    console.log('\n--- Pat Metheny arm summary (successful runs) ---');
    console.log(`runs: ${pm.length}`);
    console.log(`d1 lydian_home (total receipts): ${sumD[0]}`);
    console.log(`d2 pedal_shimmer: ${sumD[1]}`);
    console.log(`d3 diatonic_planing: ${sumD[2]}`);
    console.log(`d4 sus_float: ${sumD[3]}`);
    console.log(`d5 modal_sideSlip: ${sumD[4]}`);
    console.log(`antiElaborationGuardTriggers (sum across runs): ${guardSum}`);
    console.log(`pedalHoldMaxBars (max across runs): ${pedalMaxAgg}`);
  }
}

main();
