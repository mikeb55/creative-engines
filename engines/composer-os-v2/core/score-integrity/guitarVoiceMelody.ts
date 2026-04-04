/**
 * Melody (voice 1) extraction for duo validation — polyphonic guitar must not mix inner-voice
 * pitches into melodic contour / leap analysis.
 */

import type { MeasureModel, PartModel, ScoreEvent } from '../score-model/scoreModelTypes';

/** Voice 1 or legacy scores without `voice` (treated as melody). */
export function isGuitarMelodyVoiceNote(e: ScoreEvent): boolean {
  if (e.kind !== 'note') return false;
  const v = (e as { voice?: number }).voice ?? 1;
  return v === 1;
}

export function melodyNotesInBarSorted(m: MeasureModel): { pitch: number; startBeat: number }[] {
  return [...m.events]
    .filter(isGuitarMelodyVoiceNote)
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    ) as { pitch: number; startBeat: number }[];
}

/** Chronological melody pitches (optionally limited to [1, maxBarIndex]). */
export function collectMelodyMidiChronological(guitar: PartModel, maxBarIndex?: number): number[] {
  const pitches: number[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    if (maxBarIndex !== undefined && m.index > maxBarIndex) break;
    for (const e of [...m.events].sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    )) {
      if (isGuitarMelodyVoiceNote(e)) pitches.push((e as { pitch: number }).pitch);
    }
  }
  return pitches;
}

export function collectMelodyMidiBarRangeInclusive(
  guitar: PartModel,
  startBar: number,
  endBar: number
): number[] {
  const pitches: number[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    if (m.index < startBar || m.index > endBar) continue;
    for (const e of [...m.events].sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    )) {
      if (isGuitarMelodyVoiceNote(e)) pitches.push((e as { pitch: number }).pitch);
    }
  }
  return pitches;
}
