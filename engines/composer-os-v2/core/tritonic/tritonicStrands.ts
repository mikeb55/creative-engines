/**
 * V104p3 — Three tritonic strands: voicing top, projected strand, singer-safe motif.
 * Always-on — no feature flag.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { TritonicCell } from './tritonicCell';
import type { TritonicTimelineEvent } from './tritonicTimeline';
import { getVoiceLeadingCandidates, pitchClassMovement } from './tritonicVoiceLeading';

export type TritonicStrandNote = {
  midi: number;
  bar: number;
  beat: number;
  duration: number;
};

export type TritonicThreeStrands = {
  /** Harmonic float — top note of each cell voicing at timeline onset. */
  voicingTop: TritonicStrandNote[];
  /** Voice-led continuity across the cell chain. */
  projectedStrand: TritonicStrandNote[];
  /** Filtered export: stepwise bias, narrow tessitura, ≤4 semitone leaps. */
  singerSafeMotif: TritonicStrandNote[];
};

const PROJECTED_ANCHOR_MIDI = 67;
const SINGER_MIN_MIDI = 55;
const SINGER_MAX_MIDI = 72;
const SINGER_MAX_LEAP = 4;

export function pcToMidiNearAnchor(pc: PitchClass, anchorMidi: number): number {
  const anchorPc = ((anchorMidi % 12) + 12) % 12;
  let midi = anchorMidi - anchorPc + pc;
  while (midi < anchorMidi - 6) midi += 12;
  while (midi > anchorMidi + 6) midi -= 12;
  return midi;
}

function topPcOfCell(cell: TritonicCell): PitchClass {
  return [...cell.notes].sort((a, b) => a - b).pop()!;
}

/** Voice-led MIDI lane through ordered cells (one note per cell). */
export function projectedStrandMidisFromCells(cells: readonly TritonicCell[]): number[] {
  if (cells.length === 0) return [];

  const first = cells[0]!;
  const topPc = topPcOfCell(first);
  let melodyVoiceIdx = first.notes.indexOf(topPc);
  let currentMidi = pcToMidiNearAnchor(topPc, PROJECTED_ANCHOR_MIDI);
  const midis: number[] = [currentMidi];

  for (let i = 1; i < cells.length; i++) {
    const from = cells[i - 1]!;
    const to = cells[i]!;
    const candidates = getVoiceLeadingCandidates(from, [to]);
    const vl = candidates[0];
    const movement = vl?.voiceMovement[melodyVoiceIdx] ?? 0;
    currentMidi += movement;
    midis.push(currentMidi);

    const targetPc = ((currentMidi % 12) + 12) % 12;
    melodyVoiceIdx = to.notes.findIndex((n) => n === targetPc);
    if (melodyVoiceIdx < 0) {
      melodyVoiceIdx = to.notes.reduce<number>(
        (best, n, idx) =>
          Math.abs(pitchClassMovement(targetPc, n)) <
          Math.abs(pitchClassMovement(targetPc, to.notes[best]!))
            ? idx
            : best,
        0,
      );
    }
  }

  return midis;
}

/** Stepwise, narrow-tessitura filter of a projected MIDI line. */
export function filterSingerSafeMidis(projected: readonly number[]): number[] {
  if (projected.length === 0) return [];
  const out: number[] = [Math.min(SINGER_MAX_MIDI, Math.max(SINGER_MIN_MIDI, projected[0]!))];

  for (let i = 1; i < projected.length; i++) {
    let target = projected[i]!;
    while (target < SINGER_MIN_MIDI) target += 12;
    while (target > SINGER_MAX_MIDI) target -= 12;

    const prev = out[out.length - 1]!;
    const leap = target - prev;
    if (Math.abs(leap) > SINGER_MAX_LEAP) {
      target = prev + Math.sign(leap) * Math.min(Math.abs(leap), SINGER_MAX_LEAP);
      while (target < SINGER_MIN_MIDI) target += 12;
      while (target > SINGER_MAX_MIDI) target -= 12;
    }
    out.push(target);
  }

  return out;
}

function attachTimelineRhythm(
  midis: readonly number[],
  events: readonly TritonicTimelineEvent[],
): TritonicStrandNote[] {
  const len = Math.min(midis.length, events.length);
  const notes: TritonicStrandNote[] = [];
  for (let i = 0; i < len; i++) {
    const e = events[i]!;
    notes.push({
      midi: midis[i]!,
      bar: e.bar,
      beat: e.beat,
      duration: e.duration,
    });
  }
  return notes;
}

/**
 * Extract three strands from a scheduled timeline + cell chain.
 * Timeline supplies rhythm; cell chain supplies voice-leading for projected/singer paths.
 */
export function extractTritonicStrands(
  timeline: readonly TritonicTimelineEvent[],
  cells: readonly TritonicCell[],
): TritonicThreeStrands {
  const chain = cells.length > 0 ? cells : timeline.map((e) => e.cell);
  const projectedMidis = projectedStrandMidisFromCells(chain);
  const singerMidis = filterSingerSafeMidis(projectedMidis);

  const voicingTop: TritonicStrandNote[] = timeline.map((e) => ({
    midi: pcToMidiNearAnchor(topPcOfCell(e.cell), PROJECTED_ANCHOR_MIDI),
    bar: e.bar,
    beat: e.beat,
    duration: e.duration,
  }));

  return {
    voicingTop,
    projectedStrand: attachTimelineRhythm(projectedMidis, timeline),
    singerSafeMotif: attachTimelineRhythm(singerMidis, timeline),
  };
}

/** @deprecated Use projectedStrandMidisFromCells — kept for v1.4p2 callers/tests. */
export function extractSingableMelodyMidis(cells: readonly TritonicCell[]): number[] {
  return projectedStrandMidisFromCells(cells);
}
