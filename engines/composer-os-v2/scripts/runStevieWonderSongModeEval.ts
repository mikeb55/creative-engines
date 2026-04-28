/**
 * Batch-evaluate Stevie Wonder Song Mode vs optional neutral primary (same seeds) — read-only aggregations.
 *
 * Usage (from repo root):
 *   npm run eval:stevie_wonder -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_STEVIE_PRIMARY = 'stevie_wonder' as const;
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
  let outDir = path.join(REPO_ROOT, 'output', 'stevie-wonder-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 95200;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primarySongwriter = DEFAULT_STEVIE_PRIMARY;

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
    title: `Stevie Wonder eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

export type StevieWonderEvalArm = 'stevie_wonder' | 'neutral_keys';

export interface StevieWonderEvalRow {
  arm: StevieWonderEvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestRaw: string | null;
  barsConsidered: string;
  sus4Touches: string;
  alteredDominantTouches: string;
  extensionNines: string;
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
  const flat = j.stevieWonderDeviceReceipts;
  if (Array.isArray(flat)) {
    for (const x of flat) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  }
  const diag = j.stevieWonderDiagnostics;
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

/** Fire counts for sw:device1 … sw:device5 (union of flat + diagnostics receipts). */
export function countStevieDeviceReceiptRates(receipts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of receipts) {
    const m = /^sw:device(\d):/.exec(r);
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
  arm: StevieWonderEvalArm;
  seed: number;
  songwriterId: string;
  res: { success: boolean; error?: string; filepath?: string; manifestPath?: string; validation?: { errors?: string[] } };
  manifestContent: string | null;
}): StevieWonderEvalRow {
  const { arm, seed, songwriterId, res, manifestContent } = args;
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const j = parseManifestRoot(manifestContent);
  const diag = j?.stevieWonderDiagnostics;
  const dObj =
    diag && typeof diag === 'object' && !Array.isArray(diag) ? (diag as Record<string, unknown>) : null;
  const receipt = typeof j?.stevieWonderSliceReceipt === 'string' ? j.stevieWonderSliceReceipt.trim() : '';
  const devReceipts = j ? dedupeDeviceReceiptsFromManifest(j) : [];
  const [device1, device2, device3, device4, device5] = countStevieDeviceReceiptRates(devReceipts);

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
    sus4Touches: strField(dObj?.sus4Touches),
    alteredDominantTouches: strField(dObj?.alteredDominantTouches),
    extensionNines: strField(dObj?.extensionNines),
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
  arm: StevieWonderEvalArm,
  songwriterLabel: string
): StevieWonderEvalRow {
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

function rowToCsv(r: StevieWonderEvalRow): string[] {
  return [
    r.arm,
    String(r.seed),
    r.songwriterId,
    r.success ? '1' : '0',
    r.engineDeclaredSuccess ? '1' : '0',
    escapeCsv(r.errorMessage),
    r.barsConsidered,
    r.sus4Touches,
    r.alteredDominantTouches,
    r.extensionNines,
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
  'sus4Touches',
  'alteredDominantTouches',
  'extensionNines',
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

function buildMarkdown(args: { rows: StevieWonderEvalRow[]; seeds: number[]; baseline: string }): string {
  const { rows, seeds, baseline } = args;
  const swRows = rows.filter((r) => r.arm === 'stevie_wonder');
  const failures = rows.filter((r) => !r.success);

  const perSeedTable = [
    '| seed | arm | success | barsConsidered | sus4 | altDom | 9s | d1 | d2 | d3 | d4 | d5 | sliceReceipt |',
    '|------|-----|---------|----------------|------|--------|----|----|----|----|----|----|--------------|',
  ];
  for (const r of [...rows].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm))) {
    perSeedTable.push(
      `| ${r.seed} | ${r.arm} | ${r.success ? 'yes' : 'no'} | ${r.barsConsidered} | ${r.sus4Touches} | ${r.alteredDominantTouches} | ${r.extensionNines} | ${r.device1} | ${r.device2} | ${r.device3} | ${r.device4} | ${r.device5} | ${r.sliceReceiptPresent ? 'yes' : 'no'} |`
    );
  }

  const diagnosticsDetail = swRows
    .sort((a, b) => a.seed - b.seed)
    .map((r) => {
      return [
        `### Seed ${r.seed} — ${DEFAULT_STEVIE_PRIMARY}`,
        '',
        '| field | value |',
        '|-------|-------|',
        `| barsConsidered | ${r.barsConsidered} |`,
        `| sus4Touches | ${r.sus4Touches} |`,
        `| alteredDominantTouches | ${r.alteredDominantTouches} |`,
        `| extensionNines | ${r.extensionNines} |`,
        `| device1–5 fire counts | ${r.device1} / ${r.device2} / ${r.device3} / ${r.device4} / ${r.device5} |`,
        `| stevieWonderSliceReceipt | ${r.sliceReceiptPresent ? 'present' : 'absent'} |`,
        '',
        `_Receipt preview:_ ${r.sliceReceiptPreview}`,
        '',
      ].join('\n');
    })
    .join('\n');

  return `# Stevie Wonder Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Primary (Stevie arm):** \`${DEFAULT_STEVIE_PRIMARY}\`
- **Neutral baseline:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}

## Per-run summary

${perSeedTable.join('\n')}

## Stevie Wonder — classic-period diagnostics (per seed)

${diagnosticsDetail || '_No Stevie Wonder arm rows._'}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'stevie_wonder',
    armB: 'neutral_keys',
    labelA: `Stevie Wonder (${DEFAULT_STEVIE_PRIMARY})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation

- **deviceN_count** columns count manifest receipts matching \`sw:deviceN:\` (harmonic devices slice + pentatonic bias tags).
- Neutral arm uses **${DEFAULT_NEUTRAL_PRIMARY}**; Stevie diagnostics are expected only on the Stevie Wonder arm.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const rows: StevieWonderEvalRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(
        runOne(buildRequest(seed, args.primarySongwriter), runsDir, 'stevie_wonder', args.primarySongwriter)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        arm: 'stevie_wonder',
        seed,
        songwriterId: args.primarySongwriter,
        success: false,
        engineDeclaredSuccess: false,
        errorMessage: msg,
        musicXmlPath: '',
        manifestPath: '',
        manifestRaw: null,
        barsConsidered: '—',
        sus4Touches: '—',
        alteredDominantTouches: '—',
        extensionNines: '—',
        sliceReceiptPresent: false,
        sliceReceiptPreview: '—',
        device1: 0,
        device2: 0,
        device3: 0,
        device4: 0,
        device5: 0,
      });
      console.warn(`[eval] Stevie Wonder seed ${seed} threw: ${msg}`);
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
          sus4Touches: '—',
          alteredDominantTouches: '—',
          extensionNines: '—',
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

  fs.writeFileSync(path.join(args.outDir, 'stevie-wonder-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'stevie-wonder-songmode-eval-report.md'), md, 'utf-8');

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'stevie-wonder-songmode-eval.csv')}\n  ${path.join(args.outDir, 'stevie-wonder-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);
}

main();
