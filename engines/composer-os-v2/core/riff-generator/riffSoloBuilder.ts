/**
 * Riff-path solo overlay — separate lead part from {@link RiffProfile.soloGeneratorProfile}.
 */

import type { RiffSoloGeneratorProfile } from '../composer/riffProfileTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { mulberry32 } from './riffRandom';

export type RiffSoloNote = {
  pitch: number;
  startBeat: number;
  duration: number;
};

function midiFromPc(pc: number, low: number, high: number): number {
  let m = low + ((pc % 12) + 12) % 12;
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return Math.max(low, Math.min(high, m));
}

function tonePool(chord: string, profile: RiffSoloGeneratorProfile, rng: () => number): number[] {
  const t = chordTonesForChordSymbol(chord, { lockedHarmony: true });
  const pcs = [t.root, t.third, t.fifth, t.seventh].map((m) => ((m % 12) + 12) % 12);
  const chromatic = profile.chromaticBudget > 0.35 && rng() < profile.chromaticBudget;
  if (chromatic) {
    const extra = Math.floor(rng() * 12);
    if (!pcs.includes(extra)) pcs.push(extra);
  }
  return pcs;
}

/**
 * One bar of solo attacks on rhythmic-cell boundaries (8th grid).
 */
export function buildSoloLineForBar(
  chord: string,
  barIndex: number,
  profile: RiffSoloGeneratorProfile,
  seed: number
): RiffSoloNote[] {
  const rng = mulberry32(seed + barIndex * 31337);
  const cell = profile.rhythmicCellEighths ?? [3, 3, 2];
  const low = profile.registerFloor;
  const high = profile.registerCeiling;
  const pool = tonePool(chord, profile, rng);
  const notes: RiffSoloNote[] = [];
  let beat = 0;
  let prevPitch = midiFromPc(pool[0]!, low, high);
  let cellIdx = 0;

  while (beat < 4 && cellIdx < cell.length) {
    const durEighths = cell[cellIdx % cell.length]!;
    const duration = durEighths * 0.5;
    if (beat + duration > 4.01) break;

    const pc = pool[Math.floor(rng() * pool.length)]!;
    let pitch = midiFromPc(pc, low, high);
    const leap = Math.abs(pitch - prevPitch);
    if (leap > profile.maxLeapSemitones) {
      const stepPc = pool.find((p) => Math.abs(midiFromPc(p, low, high) - prevPitch) <= profile.maxLeapSemitones);
      if (stepPc !== undefined) pitch = midiFromPc(stepPc, low, high);
    }
    notes.push({ pitch, startBeat: beat, duration: Math.min(duration, 4 - beat) });
    prevPitch = pitch;
    beat += duration;
    cellIdx++;
  }

  if (notes.length === 0) {
    notes.push({
      pitch: midiFromPc(pool[0]!, low, high),
      startBeat: 0,
      duration: 0.5,
    });
  }
  return notes;
}

export function buildSoloPartForScore(
  profile: RiffSoloGeneratorProfile | undefined,
  soloEnabled: boolean,
  bars: number,
  chords: string[],
  seed: number
): RiffSoloNote[][] | null {
  if (!soloEnabled || !profile?.enabled) return null;
  const out: RiffSoloNote[][] = [];
  for (let b = 0; b < bars; b++) {
    out.push(buildSoloLineForBar(chords[b] ?? chords[0] ?? 'Am7', b, profile, seed));
  }
  return out;
}
