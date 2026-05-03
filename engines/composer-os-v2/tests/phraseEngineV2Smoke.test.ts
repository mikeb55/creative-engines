/**
 * Smoke — phrase engine V2 motif pool extraction (golden path hook; not wired to duo generation yet).
 */

import type { NoteEvent, PartModel } from '../core/score-model/scoreModelTypes';
import type { MotifPool } from '../core/goldenPath/phraseEngineV2';
import {
  applyBassMotifEcho,
  applyPhraseEngineV2,
  buildMotifPool,
  seedPoolFromHookIdentity,
} from '../core/goldenPath/phraseEngineV2';
import type { SongModeHookIdentity } from '../core/motif/motifEngineTypes';
import { createPart, createScore, createNote, addEvent } from '../core/score-model/scoreEventBuilder';

function flattenNotePitches(part: PartModel): string {
  const xs: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') xs.push((e as NoteEvent).pitch);
    }
  }
  return xs.join(',');
}

function flattenPitchesInBars(part: PartModel, lo: number, hi: number): string {
  const xs: number[] = [];
  for (const m of part.measures) {
    if (m.index < lo || m.index > hi) continue;
    const notes = m.events
      .filter((e) => e.kind === 'note')
      .sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat);
    for (const e of notes) xs.push((e as NoteEvent).pitch);
  }
  return xs.join(',');
}

export function runPhraseEngineV2SmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const guitar = createPart(
    'guitar',
    'Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    16,
    () => undefined,
    () => undefined
  );

  // One phrase = 4 bars; first two notes per phrase at bars 1, 5, 9, 13.
  addEvent(guitar.measures[0], createNote(60, 0, 0.5));
  addEvent(guitar.measures[0], createNote(64, 0.5, 0.5));
  addEvent(guitar.measures[4], createNote(65, 0, 0.5));
  addEvent(guitar.measures[4], createNote(69, 0.5, 0.5));
  addEvent(guitar.measures[8], createNote(70, 0, 0.5));
  addEvent(guitar.measures[8], createNote(73, 0.5, 0.5));
  addEvent(guitar.measures[12], createNote(72, 0, 0.5));
  addEvent(guitar.measures[12], createNote(76, 0.5, 0.5));

  const score = createScore('phrase-engine-v2 smoke', [guitar]);
  const pool = buildMotifPool(score, { generationId: 'smoke-pe2', seed: 4242 });

  const c = pool.cells;
  const poolOk =
    pool.generationId === 'smoke-pe2' &&
    c.length === 4 &&
    c[0]!.pitches[0] === 60 &&
    c[0]!.pitches[1] === 64 &&
    c[1]!.pitches[0] === 65 &&
    c[1]!.pitches[1] === 69 &&
    c[2]!.pitches[0] === 70 &&
    c[2]!.pitches[1] === 73 &&
    c[3]!.pitches[0] === 72 &&
    c[3]!.pitches[1] === 76;

  const afterApply = applyPhraseEngineV2(guitar, pool);
  const cloneOk = afterApply !== guitar && flattenNotePitches(guitar) === flattenNotePitches(afterApply);

  out.push({
    ok: poolOk && cloneOk,
    name: 'Phrase engine V2: buildMotifPool — first 2 notes × 4 phrases; applyPhraseEngineV2 clone (no bars 17–32)',
  });

  const hookMock: SongModeHookIdentity = {
    rootPitch: 62,
    rhythmicProfile: [
      { start: 0, dur: 0.5 },
      { start: 0.5, dur: 0.5 },
    ],
  };
  const before = pool.cells.length;
  const seeded = seedPoolFromHookIdentity(pool, hookMock);
  const seedOk = seeded.cells.length === before + 1 && pool.cells.length === before;

  out.push({
    ok: seedOk,
    name: 'Phrase engine V2: seedPoolFromHookIdentity appends one cell (immutable input pool)',
  });

  const g32 = createPart(
    'guitar',
    'Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    32,
    () => undefined,
    () => undefined
  );
  addEvent(g32.measures[16], createNote(48, 0, 0.5));
  addEvent(g32.measures[16], createNote(50, 0.5, 0.5));

  const pool32: MotifPool = {
    generationId: 'smoke-dev',
    cells: [{ pitches: [60, 62], durations: [0.5, 0.5], contour: 'flat', weight: 1 }],
  };
  const beforeDev = flattenPitchesInBars(g32, 17, 32);
  const after32 = applyPhraseEngineV2(g32, pool32);
  const afterDev = flattenPitchesInBars(after32, 17, 32);
  const devOk = beforeDev !== afterDev;

  out.push({
    ok: devOk,
    name: 'Phrase engine V2: applyPhraseEngineV2 nudges pitches in bars 17–32 when rhythm matches pool cell',
  });

  const bass32 = createPart(
    'bass',
    'Upright Bass',
    'acoustic_upright_bass',
    32,
    'bass',
    32,
    () => undefined,
    () => undefined
  );
  addEvent(bass32.measures[16], createNote(55, 0, 0.5));
  const poolBass: MotifPool = {
    generationId: 'smoke-bass',
    cells: [{ pitches: [48, 60], durations: [0.5], contour: 'flat', weight: 1 }],
  };
  const pb = flattenPitchesInBars(bass32, 17, 32)
    .split(',')
    .filter((s) => s.length > 0)
    .map(Number);
  const bassOut = applyBassMotifEcho(bass32, poolBass);
  const pa = flattenPitchesInBars(bassOut, 17, 32)
    .split(',')
    .filter((s) => s.length > 0)
    .map(Number);
  let bassEchoOk = pb.length === pa.length;
  if (bassEchoOk) {
    let sawOneSemitone = false;
    for (let i = 0; i < pb.length; i++) {
      if (Math.abs(pa[i]! - pb[i]!) === 1) sawOneSemitone = true;
      else if (pa[i] !== pb[i]) bassEchoOk = false;
    }
    bassEchoOk = bassEchoOk && sawOneSemitone;
  }

  out.push({
    ok: bassEchoOk,
    name: 'Phrase engine V2: applyBassMotifEcho shifts one bass pitch in bars 17–32 by 1 semitone',
  });

  return out;
}
