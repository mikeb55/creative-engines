/**
 * Apply call-response rest windows to guitar melody (drop full hits, keep ghost 16ths).
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isInGuitarRestWindow } from './riffCallResponseEngine';
import type { GuitarRestWindow } from './riffMultiVoiceTypes';
import type { MelodyLine } from './riffMelody';
import type { RiffRhythmSegment } from './riffTypes';

const GHOST_VELOCITY = 42;

export type MelodyLineWithVel = MelodyLine & { velocity?: number };

export function applyGuitarRestWindowsToBar(
  notes: MelodyLine[],
  barRhythm: RiffRhythmSegment[],
  windows: GuitarRestWindow[] | undefined,
  barIndex: number,
  chord: string
): MelodyLineWithVel[] {
  if (!windows?.some((w) => w.bar === barIndex)) {
    return notes.map((n) => ({ ...n }));
  }
  const tones = chordTonesForChordSymbol(chord, { lockedHarmony: true });
  const kept: MelodyLineWithVel[] = notes
    .filter((n) => !isInGuitarRestWindow(windows, barIndex, n.startBeat))
    .map((n) => ({ ...n }));

  for (const s of barRhythm) {
    if (s.rest) continue;
    if (!isInGuitarRestWindow(windows, barIndex, s.startBeat)) continue;
    const offbeat = Math.abs(s.startBeat - Math.round(s.startBeat)) > 0.11;
    if (!offbeat) continue;
    const ghostPitch = Math.min(72, tones.root + 12);
    if (kept.some((k) => Math.abs(k.startBeat - s.startBeat) < 0.08)) continue;
    kept.push({
      startBeat: s.startBeat,
      duration: Math.min(s.duration, 0.25),
      pitch: ghostPitch,
      velocity: GHOST_VELOCITY,
    });
  }
  return kept.sort((a, b) => a.startBeat - b.startBeat);
}
