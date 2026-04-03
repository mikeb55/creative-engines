/**
 * Single-line duo: timing / grid alignment only (no new pitches, no random fill).
 * Post-phrase-first: timing alignment only (phrase material already chosen).
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { getChordForBar } from '../harmony/harmonyResolution';
import { computeDuoIdentityMomentScore } from '../score-integrity/duoLockQuality';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';

function sortVoiceEvents(m: MeasureModel): void {
  m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
}

function rhythmSigGuitar(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

function ensureMeasureChords(guitar: PartModel, bass: PartModel, context: CompositionContext): void {
  for (const m of guitar.measures) {
    m.chord = m.chord ?? getChordForBar(m.index, context);
  }
  for (const m of bass.measures) {
    m.chord = m.chord ?? getChordForBar(m.index, context);
  }
}

function ensureBar4Stagger(guitar: PartModel, bass: PartModel): void {
  const gm = guitar.measures.find((x) => x.index === 4);
  const bm = bass.measures.find((x) => x.index === 4);
  const g1 = gm?.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
  const b1 = bm?.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
  if (!gm || !g1 || !bm || !b1) return;
  if (Math.abs(g1.startBeat - b1.startBeat) >= 0.75) return;
  g1.startBeat = snapAttackBeatToGrid(Math.min(3, g1.startBeat + 0.5));
  sortVoiceEvents(gm);
  normalizeMeasureToEighthBeatGrid(gm);
}

function phraseHasSync(guitar: PartModel, phraseIndex: number): boolean {
  for (const bi of [phraseIndex * 2 + 1, phraseIndex * 2 + 2]) {
    const m = guitar.measures.find((x) => x.index === bi);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const sb = (e as NoteEvent).startBeat;
      const frac = ((sb % 1) + 1) % 1;
      if (frac > 0.07 && frac < 0.93) return true;
    }
  }
  return false;
}

function ensureSyncopation(guitar: PartModel): void {
  for (let k = 0; k < 4; k++) {
    if (phraseHasSync(guitar, k)) continue;
    const m = guitar.measures.find((x) => x.index === k * 2 + 1);
    const n = m?.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
    if (n && Math.abs((n.startBeat % 1) - 0) < 0.08) {
      n.startBeat = snapAttackBeatToGrid(n.startBeat + 0.5);
      sortVoiceEvents(m!);
      normalizeMeasureToEighthBeatGrid(m!);
    }
  }
}

function ensureStrongOnsetSeparation(guitar: PartModel, bass: PartModel): void {
  let maxGap = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = guitar.measures.find((x) => x.index === bar);
    const bm = bass.measures.find((x) => x.index === bar);
    const gn = gm?.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
    const bn = bm?.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
    if (gn && bn) maxGap = Math.max(maxGap, Math.abs(gn.startBeat - bn.startBeat));
  }
  if (maxGap >= 0.99) return;
  const mG = guitar.measures.find((x) => x.index === 2);
  const mB = bass.measures.find((x) => x.index === 2);
  const g = mG?.events.filter((e) => e.kind === 'note') as NoteEvent[] | undefined;
  const b = mB?.events.filter((e) => e.kind === 'note') as NoteEvent[] | undefined;
  if (!mG || !mB || !g?.[0] || !b?.[0]) return;
  g[0].startBeat = 0;
  b[0].startBeat = 1;
  sortVoiceEvents(mG);
  sortVoiceEvents(mB);
  normalizeMeasureToEighthBeatGrid(mG);
  normalizeMeasureToEighthBeatGrid(mB);
}

function boostBar7(guitar: PartModel, bass: PartModel, context: CompositionContext): void {
  const score = { title: '', parts: [guitar, bass] } as ScoreModel;
  if (computeDuoIdentityMomentScore(score) >= 8.5) return;
  const m6 = guitar.measures.find((x) => x.index === 6);
  const m7 = guitar.measures.find((x) => x.index === 7);
  const m8 = guitar.measures.find((x) => x.index === 8);
  if (!m7) return;
  if (m6 && rhythmSigGuitar(m7) === rhythmSigGuitar(m6)) {
    const notes = (m7.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, b) => a.startBeat - b.startBeat);
    if (notes[0] && notes[0].startBeat < 0.5) {
      notes[0].startBeat = snapAttackBeatToGrid(notes[0].startBeat + 0.5);
      sortVoiceEvents(m7);
      normalizeMeasureToEighthBeatGrid(m7);
    }
  }
  if (m8 && rhythmSigGuitar(m7) === rhythmSigGuitar(m8)) {
    const notes = (m7.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, b) => a.startBeat - b.startBeat);
    const last = notes[notes.length - 1];
    if (last && last.duration >= 1) last.duration = Math.min(2.5, last.duration + 0.5);
    sortVoiceEvents(m7);
    normalizeMeasureToEighthBeatGrid(m7);
  }
  const b7 = bass.measures.find((x) => x.index === 7);
  if (b7 && m7) {
    const gr = rhythmSigGuitar(m7);
    const br = rhythmSigGuitar(b7);
    if (gr.length > 0 && gr === br && gr.split('|').length >= 3) {
      const bn = (b7.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, b) => a.startBeat - b.startBeat)[0];
      if (bn) bn.startBeat = snapAttackBeatToGrid(bn.startBeat + 0.5);
      sortVoiceEvents(b7);
      normalizeMeasureToEighthBeatGrid(b7);
    }
  }
}

function forceBar7NotSameRhythmAsBar8(guitar: PartModel): void {
  const m7 = guitar.measures.find((x) => x.index === 7);
  const m8 = guitar.measures.find((x) => x.index === 8);
  if (!m7 || !m8) return;
  if (rhythmSigGuitar(m7) !== rhythmSigGuitar(m8)) return;
  const notes = (m7.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, b) => a.startBeat - b.startBeat);
  if (notes[0]) {
    notes[0].startBeat = snapAttackBeatToGrid(notes[0].startBeat + 0.5);
    sortVoiceEvents(m7);
    normalizeMeasureToEighthBeatGrid(m7);
  }
}

/** Timing + grid only — preserves motif-derived pitches. */
export function alignSingleLineMotifFirstScore(guitar: PartModel, bass: PartModel, context: CompositionContext): void {
  ensureMeasureChords(guitar, bass, context);

  for (const m of guitar.measures) {
    sortVoiceEvents(m);
    normalizeMeasureToEighthBeatGrid(m);
  }
  for (const m of bass.measures) {
    sortVoiceEvents(m);
    normalizeMeasureToEighthBeatGrid(m);
  }

  ensureBar4Stagger(guitar, bass);
  ensureSyncopation(guitar);
  ensureStrongOnsetSeparation(guitar, bass);

  boostBar7(guitar, bass, context);
  forceBar7NotSameRhythmAsBar8(guitar);

  for (const m of guitar.measures) {
    sortVoiceEvents(m);
    normalizeMeasureToEighthBeatGrid(m);
  }
  for (const m of bass.measures) {
    sortVoiceEvents(m);
    normalizeMeasureToEighthBeatGrid(m);
  }
}
