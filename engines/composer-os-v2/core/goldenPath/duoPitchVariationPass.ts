/**
 * Deterministic pitch-only variation for Guitar–Bass Duo / ECM golden-path scores.
 * Invoked when `variationEnabled` is true — mutates guitar melody pitches after generation, before key/export gates.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, NoteEvent } from '../score-model/scoreModelTypes';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';

const GUITAR_LOW = 55;
const GUITAR_HIGH = 79;

export type EligibleNoteRef = { barIndex: number; eventIndex: number };

function chordForBar(context: CompositionContext, barIndex: number, mChord?: string): string {
  if (mChord && mChord.trim()) return mChord.trim();
  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) return seg.chord;
  }
  throw new Error(`duoPitchVariation: no chord for bar ${barIndex}`);
}

/** Collect guitar melody note refs excluding first and last note in each bar (rhythm untouched). */
export function collectGuitarMiddleNoteRefs(guitar: PartModel): EligibleNoteRef[] {
  const out: EligibleNoteRef[] = [];
  const measures = [...guitar.measures].sort((a, b) => a.index - b.index);
  for (const m of measures) {
    const noteIdxs: number[] = [];
    m.events.forEach((e, i) => {
      if (e.kind === 'note') noteIdxs.push(i);
    });
    if (noteIdxs.length <= 2) continue;
    for (let j = 1; j < noteIdxs.length - 1; j++) {
      out.push({ barIndex: m.index, eventIndex: noteIdxs[j] });
    }
  }
  return out;
}

/**
 * Pick a different chord-safe pitch within a small interval of `pitch` (mostly stepwise / chord-tone swap).
 */
function alternatePitchChordSafe(pitch: number, chord: string, seed: number, salt: number): number {
  const tones = guitarChordTonesInRange(chord, GUITAR_LOW, GUITAR_HIGH);
  const pool = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => Math.round(p));
  const uniq = Array.from(new Set(pool));
  const candidates = uniq
    .filter((c) => c !== pitch)
    .map((c) => ({ c, d: Math.abs(c - pitch) }))
    .filter((x) => x.d <= 5)
    .sort((a, b) => a.d - b.d);
  if (candidates.length > 0) {
    const pickN = Math.min(3, candidates.length);
    const pick = Math.floor(seededUnit(seed, salt, 501) * pickN);
    return candidates[pick].c;
  }
  const anyOther = uniq.filter((c) => c !== pitch);
  if (anyOther.length === 0) return pitch;
  const ix = Math.floor(seededUnit(seed, salt, 502) * anyOther.length);
  return clampPitch(anyOther[ix], GUITAR_LOW, GUITAR_HIGH);
}

/**
 * In-place: mutate a deterministic subset of guitar melody pitches (middle notes per bar).
 */
export function applyDuoPitchVariationToGuitar(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'guitar_bass_duo' && context.presetId !== 'ecm_chamber') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return;

  let eligible = collectGuitarMiddleNoteRefs(guitar);
  if (context.generationMetadata?.songModeHookFirstIdentity) {
    eligible = eligible.filter(
      (r) => r.barIndex !== 1 && r.barIndex !== 2 && r.barIndex !== 9 && r.barIndex !== 17 && r.barIndex !== 25
    );
  }
  if (eligible.length === 0) return;

  const frac = 0.18 + seededUnit(seed, 0, 7001) * 0.07;
  let k = Math.max(1, Math.floor(eligible.length * frac));
  k = Math.min(k, eligible.length);

  const ranked = eligible
    .map((ref, i) => ({ ref, r: seededUnit(seed, i, 9901) }))
    .sort((a, b) => a.r - b.r);

  for (let j = 0; j < k; j++) {
    const ref = ranked[j].ref;
    const m = guitar.measures.find((x) => x.index === ref.barIndex);
    if (!m) continue;
    const ev = m.events[ref.eventIndex];
    if (!ev || ev.kind !== 'note') continue;
    const n = ev as NoteEvent;
    const chord = chordForBar(context, ref.barIndex, m.chord);
    const salt = ref.barIndex * 4093 + ref.eventIndex * 17 + j * 31;
    const np = alternatePitchChordSafe(n.pitch, chord, seed, salt);
    if (np !== n.pitch) {
      m.events[ref.eventIndex] = { ...n, pitch: np };
    }
  }
}

/** Ordered MIDI pitches for all guitar notes (for tests / diagnostics). */
export function extractGuitarPitchSequence(score: ScoreModel): number[] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return [];
  const out: number[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    for (const e of m.events) {
      if (e.kind === 'note') out.push((e as NoteEvent).pitch);
    }
  }
  return out;
}

/** Rhythm fingerprint: startBeat:duration per guitar note (pitch-independent). */
export function extractGuitarRhythmFingerprint(score: ScoreModel): string {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return '';
  const parts: string[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        const n = e as NoteEvent;
        parts.push(`${n.startBeat}:${n.duration}`);
      }
    }
  }
  return parts.join('|');
}
