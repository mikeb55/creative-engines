/**
 * Batch-evaluate Radiohead Song Mode vs optional neutral primary (same seeds) — read-only aggregations.
 *
 * Usage (from repo root):
 *   npm run eval:radiohead -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_RADIOHEAD_PRIMARY = 'radiohead' as const;
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
  let outDir = path.join(REPO_ROOT, 'output', 'radiohead-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 95300;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primarySongwriter = DEFAULT_RADIOHEAD_PRIMARY;

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
    title: `Radiohead eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

export type RadioheadEvalArm = 'radiohead' | 'neutral_keys';

export interface RadioheadEvalRow {
  arm: RadioheadEvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestRaw: string | null;
  barsConsidered: string;
  maj7Touches: string;
  minorTriadTouches: string;
  borrowedModalTouches: string;
  slashPedalTouches: string;
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
  const flat = j.radioheadDeviceReceipts;
  if (Array.isArray(flat)) {
    for (const x of flat) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  }
  const diag = j.radioheadDiagnostics;
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

/** Fire counts for rh:device1 … rh:device5 */
export function countRadioheadDeviceReceiptRates(receipts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of receipts) {
    const m = /^rh:device(\d):/.exec(r);
    if (m) {
      const i = parseInt(m[1]!, 10) - 1;
      if (i >= 0 && i < 5) counts[i]!++;
    }
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
  arm: RadioheadEvalArm;
  seed: number;
  songwriterId: string;
  res: { success: boolean; error?: string; filepath?: string; manifestPath?: string; validation?: { errors?: string[] } };
  manifestContent: string | null;
}): RadioheadEvalRow {
  const { arm, seed, songwriterId, res, manifestContent } = args;
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const j = parseManifestRoot(manifestContent);
  const diag = j?.radioheadDiagnostics;
  const dObj =
    diag && typeof diag === 'object' && !Array.isArray(diag) ? (diag as Record<string, unknown>) : null;
  const receipt = typeof j?.radioheadSliceReceipt === 'string' ? j.radioheadSliceReceipt.trim() : '';
  const devReceipts = j ? dedupeDeviceReceiptsFromManifest(j) : [];
  const [device1, device2, device3, device4, device5] = countRadioheadDeviceReceiptRates(devReceipts);

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
    maj7Touches: strField(dObj?.maj7Touches),
    minorTriadTouches: strField(dObj?.minorTriadTouches),
    borrowedModalTouches: strField(dObj?.borrowedModalTouches),
    slashPedalTouches: strField(dObj?.slashPedalTouches),
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
  arm: RadioheadEvalArm,
  songwriterLabel: string
): RadioheadEvalRow {
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

function rowToCsv(r: RadioheadEvalRow): string[] {
  return [
    r.arm,
    String(r.seed),
    r.songwriterId,
    r.success ? '1' : '0',
    r.engineDeclaredSuccess ? '1' : '0',
    escapeCsv(r.errorMessage),
    r.barsConsidered,
    r.maj7Touches,
    r.minorTriadTouches,
    r.borrowedModalTouches,
    r.slashPedalTouches,
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
  'maj7Touches',
  'minorTriadTouches',
  'borrowedModalTouches',
  'slashPedalTouches',
  'sliceReceiptPresent',
  'sliceReceiptPreview',
  'device1_count',
  'device2_count',
  'device3_count',
  'device4_count',
  'device5_count',
  'musicXmlPath',
  'manifestPath',
];

function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n') + '\n';
}

function buildMarkdown(args: { rows: RadioheadEvalRow[]; seeds: number[]; baseline: string }): string {
  const { rows, seeds, baseline } = args;
  const rhRows = rows.filter((r) => r.arm === 'radiohead');
  const failures = rows.filter((r) => !r.success);

  const perSeedTable = [
    '| seed | arm | success | bars | maj7 | m | borrowed | slash | d1 | d2 | d3 | d4 | d5 | sliceReceipt |',
    '|------|-----|---------|------|------|---|----------|-------|----|----|----|----|----|--------------|',
  ];
  for (const r of [...rows].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm))) {
    perSeedTable.push(
      `| ${r.seed} | ${r.arm} | ${r.success ? 'yes' : 'no'} | ${r.barsConsidered} | ${r.maj7Touches} | ${r.minorTriadTouches} | ${r.borrowedModalTouches} | ${r.slashPedalTouches} | ${r.device1} | ${r.device2} | ${r.device3} | ${r.device4} | ${r.device5} | ${r.sliceReceiptPresent ? 'yes' : 'no'} |`
    );
  }

  const diagnosticsDetail = rhRows
    .sort((a, b) => a.seed - b.seed)
    .map((r) => {
      return [
        `### Seed ${r.seed} — ${DEFAULT_RADIOHEAD_PRIMARY}`,
        '',
        '| field | value |',
        '|-------|-------|',
        `| barsConsidered | ${r.barsConsidered} |`,
        `| maj7Touches | ${r.maj7Touches} |`,
        `| device1–5 fire counts | ${r.device1} / ${r.device2} / ${r.device3} / ${r.device4} / ${r.device5} |`,
        `| radioheadSliceReceipt | ${r.sliceReceiptPresent ? 'present' : 'absent'} |`,
        '',
        `_Receipt preview:_ ${r.sliceReceiptPreview}`,
        '',
      ].join('\n');
    })
    .join('\n');

  return `# Radiohead Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Primary (Radiohead arm):** \`${DEFAULT_RADIOHEAD_PRIMARY}\`
- **Neutral baseline:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}

## Per-run summary

${perSeedTable.join('\n')}

## Radiohead — OK Computer–era diagnostics (per seed)

${diagnosticsDetail || '_No Radiohead arm rows._'}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'radiohead',
    armB: 'neutral_keys',
    labelA: `Radiohead (${DEFAULT_RADIOHEAD_PRIMARY})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation

- **deviceN_count** columns count manifest receipts matching \`rh:deviceN:\`.
- Neutral arm uses **${DEFAULT_NEUTRAL_PRIMARY}**; Radiohead diagnostics are expected only on the Radiohead arm.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const rows: RadioheadEvalRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(
        runOne(buildRequest(seed, args.primarySongwriter), runsDir, 'radiohead', args.primarySongwriter)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        arm: 'radiohead',
        seed,
        songwriterId: args.primarySongwriter,
        success: false,
        engineDeclaredSuccess: false,
        errorMessage: msg,
        musicXmlPath: '',
        manifestPath: '',
        manifestRaw: null,
        barsConsidered: '—',
        maj7Touches: '—',
        minorTriadTouches: '—',
        borrowedModalTouches: '—',
        slashPedalTouches: '—',
        sliceReceiptPresent: false,
        sliceReceiptPreview: '—',
        device1: 0,
        device2: 0,
        device3: 0,
        device4: 0,
        device5: 0,
      });
      console.warn(`[eval] Radiohead seed ${seed} threw: ${msg}`);
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
          maj7Touches: '—',
          minorTriadTouches: '—',
          borrowedModalTouches: '—',
          slashPedalTouches: '—',
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

  fs.writeFileSync(path.join(args.outDir, 'radiohead-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'radiohead-songmode-eval-report.md'), md, 'utf-8');

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'radiohead-songmode-eval.csv')}\n  ${path.join(args.outDir, 'radiohead-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);
}

main();
