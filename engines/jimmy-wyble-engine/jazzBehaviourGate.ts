/**
 * Jazz Behaviour Gate — validates strong-beat dissonance handling only.
 * Does not alter pitches; callers reject the phrase and regenerate when false.
 */

import { melodyAllowedPitchClassesForCanonical } from '../core/canonicalChord';
import type { HarmonicContext } from './wybleTypes';

const ROOT_MIDI: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

function parseChord(chord: string): { root: string; quality: string } {
  const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
  if (!match) return { root: 'C', quality: 'maj' };
  let q = (match[2] ?? 'maj').toLowerCase();
  if (q === 'm7' || q === 'min7') q = 'min';
  if (q === '7' || q === 'dom7') q = 'dom';
  if (q === 'maj7') q = 'maj';
  return { root: match[1], quality: q };
}

function normalizeQuality(q: string): string {
  const s = q.toLowerCase();
  if (s === 'm7' || s === 'min7') return 'min';
  if (s === '7' || s === 'dom7') return 'dom';
  if (s === 'maj7') return 'maj';
  return s;
}

/** Same bar→chord resolution as wybleGenerator.getChordForBeat (kept local to avoid circular imports). */
function getChordForBeat(
  ctx: HarmonicContext,
  beatIndex: number,
  beatsPerBar: number
): { root: string; quality: string } {
  const bar = Math.floor(beatIndex / beatsPerBar);
  const canon = ctx.canonicalChords;
  if (canon && canon.length > 0) {
    const c = canon[Math.min(bar, canon.length - 1)];
    if (c) return { root: c.root, quality: c.quality };
  }
  const chords = ctx.chords;
  let chordIndex = 0;
  let acc = 0;
  for (let i = 0; i < chords.length; i++) {
    const ch = chords[i];
    const bars =
      typeof ch === 'object' && 'bars' in ch
        ? (ch as { bars: number }).bars
        : Math.max(1, Math.ceil(32 / chords.length));
    if (bar < acc + bars) {
      chordIndex = i;
      break;
    }
    acc += bars;
  }
  const chord = chords[Math.min(chordIndex, chords.length - 1)] ?? chords[0];
  return typeof chord === 'string'
    ? parseChord(chord)
    : {
        root: (chord as { root: string }).root,
        quality: normalizeQuality((chord as { quality: string }).quality),
      };
}

function pitchClassRelativeToRoot(pitchMidi: number, root: string): number {
  const rootMidi = ROOT_MIDI[root] ?? 60;
  return ((pitchMidi - rootMidi) % 12 + 12) % 12;
}

/** Chord tones + common tensions when canonical harmony is absent. */
function allowedRelativePcsFallback(quality: string): number[] {
  const q = normalizeQuality(quality);
  const deg =
    q === 'maj' ? [0, 4, 7, 11] : q === 'min' ? [0, 3, 7, 10] : [0, 4, 7, 10];
  const tensions = [2, 5, 9];
  return [...new Set([...deg, ...tensions])].sort((a, b) => a - b);
}

function allowedRelativePcsForBar(
  ctx: HarmonicContext,
  bar: number,
  beatsPerBar: number
): { root: string; allowedRel: number[] } {
  const { root, quality } = getChordForBeat(ctx, bar * beatsPerBar, beatsPerBar);
  const canon = ctx.canonicalChords;
  if (canon && canon.length > 0) {
    const c = canon[Math.min(bar, canon.length - 1)];
    if (c) {
      return { root, allowedRel: melodyAllowedPitchClassesForCanonical(c) };
    }
  }
  return { root, allowedRel: allowedRelativePcsFallback(quality) };
}

/** Beats 1 and 3 in 4/4 (0- and 2-indexed within bar); conservative defaults for other meters. */
function isStrongBeatInBar(beatInBar: number, beatsPerBar: number): boolean {
  const b = Math.floor(beatInBar) % beatsPerBar;
  if (beatsPerBar === 4) return b === 0 || b === 2;
  if (beatsPerBar === 2) return b === 0;
  return b === 0;
}

/**
 * Strong-beat dissonance must resolve by step within 1–2 notes, show directional motion,
 * or satisfy a short “gesture” (Monk-style: small move, not sustained).
 */
function strongBeatDissonanceAcceptable(
  pitch: number,
  i: number,
  pitches: number[]
): boolean {
  const n1 = i + 1 < pitches.length ? pitches[i + 1]! : undefined;
  const n2 = i + 2 < pitches.length ? pitches[i + 2]! : undefined;

  if (n1 !== undefined && Math.abs(n1 - pitch) <= 2) return true;
  if (n2 !== undefined && Math.abs(n2 - pitch) <= 2) return true;

  if (n1 !== undefined && n2 !== undefined && n1 !== pitch && n2 !== n1) {
    const s1 = Math.sign(n1 - pitch);
    const s2 = Math.sign(n2 - n1);
    if (s1 !== 0 && s1 === s2) return true;
  }

  if (n1 !== undefined && n1 !== pitch && Math.abs(n1 - pitch) <= 4) return true;

  return false;
}

/**
 * @returns true if phrase behaviour is valid; false → caller should regenerate (do not edit pitches).
 */
export function validateJazzPhrasePitches(
  pitches: number[],
  startBeat: number,
  harmonicContext: HarmonicContext,
  beatsPerBar: number
): boolean {
  const L = pitches.length;
  if (L === 0) return true;

  for (let i = 0; i < L; i++) {
    const globalBeat = startBeat + i;
    const bar = Math.floor(globalBeat / beatsPerBar);
    const beatInBar = globalBeat - bar * beatsPerBar;
    if (!isStrongBeatInBar(beatInBar, beatsPerBar)) continue;

    const pitch = pitches[i]!;
    const { root, allowedRel } = allowedRelativePcsForBar(harmonicContext, bar, beatsPerBar);
    const rel = pitchClassRelativeToRoot(pitch, root);
    if (allowedRel.includes(rel)) continue;

    if (!strongBeatDissonanceAcceptable(pitch, i, pitches)) return false;
  }

  return true;
}
