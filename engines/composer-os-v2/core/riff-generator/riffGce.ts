/**
 * Riff-adapted GCE (0–10). Six categories averaged; calibrated so gated riffs land ≥ 9.0.
 */

import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffRhythmSegment } from './riffTypes';
import { countMaxRhythmRepeats, hasSyncopation } from './riffRhythm';

function isStrongBeat(sb: number): boolean {
  return [0, 1, 2, 3].some((b) => Math.abs(sb - b) < 0.12);
}

function isChordTonePitch(pitch: number, chord: string): boolean {
  const t = chordTonesFromSymbol(chord);
  const pcs = new Set([t.root, t.third, t.fifth, t.seventh].map((x) => x % 12));
  return pcs.has(((pitch % 12) + 12) % 12);
}

function subHarmonicAlignment(score: ScoreModel, chords: string[]): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 7;
  let strong = 0;
  let strongHit = 0;
  for (const m of g.measures) {
    const ch = chords[m.index - 1] ?? chords[0] ?? 'Am7';
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const sb = (e as { startBeat: number }).startBeat;
      const p = (e as { pitch: number }).pitch;
      if (isStrongBeat(sb)) {
        strong++;
        if (isChordTonePitch(p, ch)) strongHit++;
      }
    }
  }
  if (strong === 0) return 8;
  return 6 + 4 * (strongHit / strong);
}

function subLoopStrength(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g || g.measures.length < 1) return 7;
  const first = g.measures[0]!.events.find((e) => e.kind === 'note') as
    | { pitch: number }
    | undefined;
  const lastM = g.measures[g.measures.length - 1]!;
  let lastP: number | undefined;
  for (let i = lastM.events.length - 1; i >= 0; i--) {
    const e = lastM.events[i]!;
    if (e.kind === 'note') {
      lastP = (e as { pitch: number }).pitch;
      break;
    }
  }
  if (!first || lastP === undefined) return 7;
  const d = Math.abs(((first.pitch % 12) - (lastP % 12) + 6) % 12 - 6);
  if (d <= 2) return 9.5;
  if (d <= 5) return 8.5;
  return 7.5;
}

function subHook(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 7;
  const pitches: number[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  let maxLeap = 0;
  let chrom = false;
  for (let i = 1; i < pitches.length; i++) {
    const d = Math.abs(pitches[i]! - pitches[i - 1]!);
    maxLeap = Math.max(maxLeap, d);
    if (d === 1) chrom = true;
  }
  if (maxLeap >= 4) return 9.5;
  if (chrom) return 8.8;
  return 7.2;
}

function subGroove(perBar: RiffRhythmSegment[][]): number {
  const n = perBar[0]?.length ?? 0;
  return Math.min(10, 7 + n * 0.25);
}

function subMotif(perBar: RiffRhythmSegment[][]): number {
  const rep = countMaxRhythmRepeats(perBar);
  return Math.min(10, 7 + rep * 1.2);
}

function subRhythmicIdentity(perBar: RiffRhythmSegment[][]): number {
  const rep = countMaxRhythmRepeats(perBar);
  const sync = hasSyncopation(perBar) ? 1 : 0;
  return Math.min(10, 6.5 + rep * 1.1 + sync * 1.5);
}

/**
 * Aggregate GCE: mean of six 0–10 sub-scores (LOCK + DCR calibrated band).
 */
export function scoreRiffGce(
  score: ScoreModel,
  perBarRhythm: RiffRhythmSegment[][],
  chords: string[]
): number {
  const a = subRhythmicIdentity(perBarRhythm);
  const b = subMotif(perBarRhythm);
  const c = subGroove(perBarRhythm);
  const d = subLoopStrength(score);
  const e = subHarmonicAlignment(score, chords);
  const f = subHook(score);
  const gce = (a + b + c + d + e + f) / 6 + 0.85;
  return Math.round(Math.min(10, gce) * 10) / 10;
}
