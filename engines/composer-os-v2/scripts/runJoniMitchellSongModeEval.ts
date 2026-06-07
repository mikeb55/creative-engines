/**
 * Batch-evaluate Joni Mitchell Song Mode — modal lock length, sus/slash rates, d1–d5, anti-elaboration guards.
 *
 * Usage (from repo root):
 *   npm run eval:joni_mitchell -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S] [--baseline neutral|none]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildBatchSectionShapingAbMarkdown } from './eval/songModeSectionShapingEvalTable';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_JM_PRIMARY = 'joni_mitchell' as const;
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
  let outDir = path.join(REPO_ROOT, 'output', 'joni-mitchell-eval');
  const seeds: number[] = [];
  let count = 5;
  let seedStart = 95500;
  let baseline: 'neutral' | 'none' = 'neutral';
  let primarySongwriter: string = DEFAULT_JM_PRIMARY;

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
    title: `Joni Mitchell eval ${primarySongwriterStyle ?? 'default'} ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    ...(primarySongwriterStyle ? { primarySongwriterStyle } : {}),
  };
}

export type JoniMitchellEvalArm = 'joni_mitchell' | 'neutral_keys';

export interface JoniMitchellEvalRow {
  arm: JoniMitchellEvalArm;
  seed: number;
  songwriterId: string;
  success: boolean;
  engineDeclaredSuccess: boolean;
  errorMessage: string;
  musicXmlPath: string;
  manifestPath: string;
  manifestRaw: string | null;
  barsConsidered: string;
  modalFieldLockLenBars: string;
  suspensionHitRate: string;
  nonRootBassHitRate: string;
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
  const flat = j.joniMitchellDeviceReceipts;
  if (Array.isArray(flat)) {
    for (const x of flat) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  }
  const diag = j.joniMitchellDiagnostics;
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

/** Fire counts for jm:modal_field_lock, jm:unresolved_suspension, jm:non_root_bass, jm:lydian_colour, jm:modal_centre_shift */
export function countJoniMitchellDeviceReceiptRates(receipts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  const patterns = [
    /^jm:modal_field_lock@/,
    /^jm:unresolved_suspension@/,
    /^jm:non_root_bass@/,
    /^jm:lydian_colour@/,
    /^jm:modal_centre_shift@/,
  ];
  for (const r of receipts) {
    for (let i = 0; i < patterns.length; i++) {
      if (patterns[i]!.test(r)) counts[i]!++;
    }
  }
  return counts;
}

function antiElaborationTotal(j: Record<string, unknown>): number {
  const diag = j.joniMitchellDiagnostics;
  if (diag && typeof diag === 'object' && !Array.isArray(diag)) {
    const t = (diag as Record<string, unknown>).antiElaborationGuardTriggers;
    if (typeof t === 'number' && !Number.isNaN(t)) return t;
  }
  const g = j.joniMitchellAntiElaborationGuards;
  if (g && typeof g === 'object' && !Array.isArray(g)) {
    const o = g as Record<string, unknown>;
    const a = [o.dominantFamilyStripped, o.twoFiveOneFlattened, o.twoBarHoldForced, o.maj7CadenceMuted].reduce<number>(
      (s, x) => s + (typeof x === 'number' ? x : 0),
      0
    );
    return a;
  }
  return 0;
}

function strField(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  if (typeof v === 'string') return v.length ? v : '—';
  return '—';
}

function buildRowFromRun(args: {
  arm: JoniMitchellEvalArm;
  seed: number;
  songwriterId: string;
  res: { success: boolean; error?: string; filepath?: string; manifestPath?: string; validation?: { errors?: string[] } };
  manifestContent: string | null;
}): JoniMitchellEvalRow {
  const { arm, seed, songwriterId, res, manifestContent } = args;
  const artifactOk = !!(res.filepath && fs.existsSync(res.filepath));
  const j = parseManifestRoot(manifestContent);
  const diag = j?.joniMitchellDiagnostics;
  const dObj =
    diag && typeof diag === 'object' && !Array.isArray(diag) ? (diag as Record<string, unknown>) : null;
  const receipt = typeof j?.joniMitchellSliceReceipt === 'string' ? j.joniMitchellSliceReceipt.trim() : '';
  const devReceipts = j ? dedupeDeviceReceiptsFromManifest(j) : [];
  const [device1, device2, device3, device4, device5] = countJoniMitchellDeviceReceiptRates(devReceipts);

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
    modalFieldLockLenBars: strField(j?.joniMitchellModalFieldLockLengthBars ?? dObj?.modalFieldLockLengthBars),
    suspensionHitRate: strField(dObj?.suspensionHitRate),
    nonRootBassHitRate: strField(dObj?.nonRootBassHitRate),
    antiGuardTotal: j ? String(antiElaborationTotal(j)) : '—',
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
  arm: JoniMitchellEvalArm,
  songwriterLabel: string
): JoniMitchellEvalRow {
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

function rowToCsv(r: JoniMitchellEvalRow): string[] {
  return [
    r.arm,
    String(r.seed),
    r.songwriterId,
    r.success ? '1' : '0',
    r.engineDeclaredSuccess ? '1' : '0',
    escapeCsv(r.errorMessage),
    r.barsConsidered,
    r.modalFieldLockLenBars,
    r.suspensionHitRate,
    r.nonRootBassHitRate,
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
  'modalFieldLockLenBars',
  'suspensionHitRate',
  'nonRootBassHitRate',
  'antiGuardTotal',
  'sliceReceiptPresent',
  'sliceReceiptPreview',
  'd1_modal_field_lock',
  'd2_unresolved_suspension',
  'd3_non_root_bass',
  'd4_lydian_colour',
  'd5_modal_centre_shift',
  'musicXmlPath',
  'manifestPath',
];

function stringifyCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n') + '\n';
}

function buildMarkdown(args: { rows: JoniMitchellEvalRow[]; seeds: number[]; baseline: string }): string {
  const { rows, seeds, baseline } = args;
  const jmRows = rows.filter((r) => r.arm === 'joni_mitchell');
  const failures = rows.filter((r) => !r.success);

  const perSeedTable = [
    '| seed | arm | success | bars | lockLen | susRate | slashRate | antiG | d1 | d2 | d3 | d4 | d5 | sliceReceipt |',
    '|------|-----|---------|------|---------|---------|-----------|-------|----|----|----|----|----|--------------|',
  ];
  for (const r of [...rows].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm))) {
    perSeedTable.push(
      `| ${r.seed} | ${r.arm} | ${r.success ? 'yes' : 'no'} | ${r.barsConsidered} | ${r.modalFieldLockLenBars} | ${r.suspensionHitRate} | ${r.nonRootBassHitRate} | ${r.antiGuardTotal} | ${r.device1} | ${r.device2} | ${r.device3} | ${r.device4} | ${r.device5} | ${r.sliceReceiptPresent ? 'yes' : 'no'} |`
    );
  }

  const diagnosticsDetail = jmRows
    .sort((a, b) => a.seed - b.seed)
    .map((r) => {
      return [
        `### Seed ${r.seed} — ${DEFAULT_JM_PRIMARY}`,
        '',
        '| field | value |',
        '|-------|-------|',
        `| barsConsidered | ${r.barsConsidered} |`,
        `| modalFieldLockLenBars | ${r.modalFieldLockLenBars} |`,
        `| suspensionHitRate | ${r.suspensionHitRate} |`,
        `| nonRootBassHitRate | ${r.nonRootBassHitRate} |`,
        `| antiElaborationGuardTriggers | ${r.antiGuardTotal} |`,
        `| d1–d5 fire counts | ${r.device1} / ${r.device2} / ${r.device3} / ${r.device4} / ${r.device5} |`,
        `| joniMitchellSliceReceipt | ${r.sliceReceiptPresent ? 'present' : 'absent'} |`,
        '',
        `_Receipt preview:_ ${r.sliceReceiptPreview}`,
        '',
      ].join('\n');
    })
    .join('\n');

  return `# Joni Mitchell Song Mode batch evaluation

- **Runs:** ${rows.length} generation(s), seeds \`${seeds.join(', ')}\`
- **Primary (Joni arm):** \`${DEFAULT_JM_PRIMARY}\`
- **Neutral baseline:** \`${baseline}\` (neutral primary = \`${DEFAULT_NEUTRAL_PRIMARY}\` when enabled)
- **Artifact failures (no MusicXML):** ${failures.length}

## Per-run summary

${perSeedTable.join('\n')}

## Joni Mitchell — modal open-tuning diagnostics (per seed)

${diagnosticsDetail || '_No Joni Mitchell arm rows._'}

${buildBatchSectionShapingAbMarkdown({
    seeds,
    rows: rows.map((r) => ({
      seed: r.seed,
      arm: r.arm,
      manifestRaw: r.manifestRaw,
    })),
    armA: 'joni_mitchell',
    armB: 'neutral_keys',
    labelA: `Joni Mitchell (${DEFAULT_JM_PRIMARY})`,
    labelB: `neutral_keys (${DEFAULT_NEUTRAL_PRIMARY})`,
  })}

## Interpretation

- **d1–d5** count manifest receipts matching \`jm:modal_field_lock\`, \`jm:unresolved_suspension\`, \`jm:non_root_bass\`, \`jm:lydian_colour\`, \`jm:modal_centre_shift\`.
- **antiGuardTotal** sums Joni anti-elaboration guard triggers (dominant strip, ii–V–I flatten, 2-bar hold repair, maj7 cadence mute).
- Neutral arm uses **${DEFAULT_NEUTRAL_PRIMARY}**; Joni diagnostics are expected only on the Joni arm.

`;
}

function main(): void {
  const args = parseArgs(process.argv);
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

  const rows: JoniMitchellEvalRow[] = [];

  for (const seed of args.seeds) {
    try {
      rows.push(
        runOne(buildRequest(seed, args.primarySongwriter), runsDir, 'joni_mitchell', args.primarySongwriter)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rows.push({
        arm: 'joni_mitchell',
        seed,
        songwriterId: args.primarySongwriter,
        success: false,
        engineDeclaredSuccess: false,
        errorMessage: msg,
        musicXmlPath: '',
        manifestPath: '',
        manifestRaw: null,
        barsConsidered: '—',
        modalFieldLockLenBars: '—',
        suspensionHitRate: '—',
        nonRootBassHitRate: '—',
        antiGuardTotal: '—',
        sliceReceiptPresent: false,
        sliceReceiptPreview: '—',
        device1: 0,
        device2: 0,
        device3: 0,
        device4: 0,
        device5: 0,
      });
      console.warn(`[eval] Joni Mitchell seed ${seed} threw: ${msg}`);
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
          modalFieldLockLenBars: '—',
          suspensionHitRate: '—',
          nonRootBassHitRate: '—',
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

  fs.writeFileSync(path.join(args.outDir, 'joni-mitchell-songmode-eval.csv'), csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'joni-mitchell-songmode-eval-report.md'), md, 'utf-8');

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'joni-mitchell-songmode-eval.csv')}\n  ${path.join(args.outDir, 'joni-mitchell-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);
}

main();
