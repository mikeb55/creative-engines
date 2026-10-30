/**
 * Production-path verify: runAppGeneration song_mode + songFormTemplate full_song.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/verifyFullSongProductionPath.ts
 */

import fs from 'fs';
import path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';

const SEED = 334032;
const OUT_DIR = path.join(__dirname, '..', '..', '..', '.tmp-full-song-proof');

/** Known full_song 32-bar ranges from planFromTemplate weights. */
const RANGES = [
  { label: 'intro', start: 1, end: 4 },
  { label: 'verse', start: 5, end: 11 },
  { label: 'pre_chorus', start: 12, end: 14 },
  { label: 'chorus_0', start: 15, end: 20 },
  { label: 'bridge', start: 21, end: 23 },
  { label: 'chorus_1', start: 24, end: 29 },
  { label: 'outro', start: 30, end: 32 },
] as const;

function guitarPartBody(xml: string): string {
  const partBlocks = xml.split(/<part\b/);
  return (
    partBlocks.find((b) => /id="guitar"/.test(b) && b.includes('<measure')) ??
    partBlocks[1] ??
    ''
  );
}

function guitarPitchSeq(xml: string, barIndex0: number): number[] {
  const measures = guitarPartBody(xml).split(/<measure\b/).slice(1);
  const m = measures[barIndex0] ?? '';
  const out: number[] = [];
  const re =
    /<step>([A-G])<\/step>(?:\s*<alter>(-?\d+)<\/alter>)?\s*<octave>(\d+)<\/octave>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(m))) {
    const step = match[1]!;
    const alter = Number(match[2] ?? 0);
    const oct = Number(match[3]!);
    const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step]! + alter;
    out.push(pc + oct * 12);
  }
  return out;
}

function harmonyTokens(xml: string): string[] {
  const measures = guitarPartBody(xml).split(/<measure\b/).slice(1);
  return measures.map((m) => {
    const step = m.match(/<root-step>([A-G])<\/root-step>/)?.[1] ?? '?';
    const alterRaw = m.match(/<root-alter>(-?\d+)<\/root-alter>/)?.[1];
    const alter = alterRaw ? Number(alterRaw) : 0;
    const kind =
      m.match(/<kind[^>]*\stext="([^"]+)"/)?.[1] ??
      m.match(/<kind[^>]*>([^<]*)<\/kind>/)?.[1] ??
      '';
    const a = alter === 0 ? '' : alter < 0 ? 'b' : '#';
    return `${step}${a}${kind}`;
  });
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const req: GenerateRequest = {
    presetId: 'song_mode',
    seed: SEED,
    totalBars: 32,
    longFormEnabled: true,
    songFormTemplate: 'full_song',
    primarySongwriterStyle: 'beatles',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    scoreTitle: 'Full Song Production Path (32 bars)',
    outputLabel: `full-song-prod-32-seed${SEED}`,
  };
  const result = runAppGeneration(req, OUT_DIR);
  if (!result.success || !result.xml || !result.filepath) {
    throw new Error(`production generate failed: ${result.error ?? 'no xml'}`);
  }

  const xml = fs.readFileSync(result.filepath, 'utf8');
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('invalid MusicXML root');
  }

  const harms = harmonyTokens(xml);
  if (harms.length < 32) throw new Error(`expected ≥32 harmony bars, got ${harms.length}`);

  const ch0 = harms.slice(14, 20).join('|');
  const ch1 = harms.slice(23, 29).join('|');
  if (ch0 !== ch1) throw new Error(`chorus harmony mismatch: ${ch0} vs ${ch1}`);

  const open0 = guitarPitchSeq(xml, 14);
  const open1 = guitarPitchSeq(xml, 23);
  if (!open0.length || open0.join(',') !== open1.join(',')) {
    throw new Error(`opening motif mismatch ${open0} vs ${open1}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: result.filepath,
        sections: RANGES.length,
        ranges: RANGES.map((r) => `${r.label}:${r.start}-${r.end}`),
        chorusHarmony: ch0,
        openingMotif: open0,
        bytes: Buffer.byteLength(xml, 'utf8'),
      },
      null,
      2
    )
  );
}

main();
