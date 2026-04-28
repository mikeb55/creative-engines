/**
 * Batch-evaluate Sonic Youth Song Mode — `sy:` device receipt families per seed (read-only).
 *
 * Usage (from repo root):
 *   npm run eval:sonic_youth -- [--out DIR] [--seeds a,b,c] [--count N --seed-start S]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const EVAL_CLI_FLAGS = new Set(['--out', '--seeds', '--count', '--seed-start']);

function getEvalArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => EVAL_CLI_FLAGS.has(a));
  return idx >= 0 ? argv.slice(idx) : [];
}

function parseArgs(argv: string[]): { outDir: string; seeds: number[] } {
  let outDir = path.join(REPO_ROOT, 'output', 'sonic-youth-eval');
  const seeds: number[] = [];
  let count = 3;
  let seedStart = 50300;

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
      count = parseInt(tail[++i], 10) || 3;
    } else if (a === '--seed-start' && tail[i + 1]) {
      seedStart = parseInt(tail[++i], 10) || seedStart;
    }
  }

  if (seeds.length === 0) {
    for (let k = 0; k < count; k++) seeds.push(seedStart + k);
  }

  return { outDir, seeds };
}

function buildRequest(seed: number): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `Sonic Youth eval ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    primarySongwriterStyle: 'sonic_youth',
  };
}

function deviceFamilies(receipts: string[]): Set<string> {
  const s = new Set<string>();
  for (const r of receipts) {
    const m = /^sy:([^@]+)@/.exec(r);
    if (m?.[1]) s.add(m[1]);
  }
  return s;
}

function readManifestJson(manifestPath: string | undefined): Record<string, unknown> | null {
  if (!manifestPath || !fs.existsSync(manifestPath)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
  } catch {
    return null;
  }
}

function main(): void {
  const { outDir, seeds } = parseArgs(process.argv);
  fs.mkdirSync(outDir, { recursive: true });

  const lines: string[] = [
    '# Sonic Youth Song Mode eval',
    '',
    '| seed | success | sy_receipt_count | device_families |',
    '| --- | --- | --- | --- |',
  ];

  for (const seed of seeds) {
    const sub = path.join(outDir, `seed-${seed}`);
    fs.mkdirSync(sub, { recursive: true });
    const res = runAppGeneration(buildRequest(seed), sub);
    const j = readManifestJson(res.manifestPath);
    const rec = (j?.sonicYouthDeviceReceipts as string[] | undefined) ?? [];
    const fam = deviceFamilies(rec);
    lines.push(`| ${seed} | ${res.success} | ${rec.length} | ${[...fam].sort().join(', ')} |`);
  }

  const md = path.join(outDir, 'sonic-youth-eval-summary.md');
  fs.writeFileSync(md, `${lines.join('\n')}\n`, 'utf-8');
  console.log(`Wrote ${md}`);
}

main();
