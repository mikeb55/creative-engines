/**
 * Integration — phrase engine V2 pool + guitar/bass passes on a minimal 32-bar duo score (no generation pipeline).
 */

import type { NoteEvent, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  applyBassMotifEcho,
  applyPhraseEngineV2,
  buildMotifPool,
} from '../core/goldenPath/phraseEngineV2';
import { createPart, createScore, createNote, addEvent } from '../core/score-model/scoreEventBuilder';

function countNotes(part: PartModel): number {
  let n = 0;
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') n++;
    }
  }
  return n;
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

function buildMinimalDuo32(): { score: ScoreModel; guitar: PartModel; bass: PartModel } {
  const guitar = createPart(
    'guitar',
    'Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    32,
    () => undefined,
    () => undefined
  );
  const bass = createPart(
    'bass',
    'Upright Bass',
    'acoustic_upright_bass',
    32,
    'bass',
    32,
    () => undefined,
    () => undefined
  );

  const addPair = (part: PartModel, barIndex0: number, p0: number, p1: number): void => {
    const m = part.measures[barIndex0]!;
    addEvent(m, createNote(p0, 0, 0.5));
    addEvent(m, createNote(p1, 0.5, 0.5));
  };

  // Bars 1–16: two eighths per phrase anchor bar (≥4 notes total per part in 1–16).
  addPair(guitar, 0, 60, 62);
  addPair(guitar, 4, 64, 65);
  addPair(guitar, 8, 67, 68);
  addPair(guitar, 12, 69, 71);
  addPair(bass, 0, 36, 38);
  addPair(bass, 4, 35, 37);
  addPair(bass, 8, 34, 36);
  addPair(bass, 12, 33, 32);

  // Bars 17–32: figure for phrase V2 (0.5+0.5) + more notes (≥4 per part in 17–32).
  addPair(guitar, 16, 48, 50);
  addPair(guitar, 19, 52, 54);
  addPair(guitar, 23, 56, 58);
  addPair(guitar, 27, 59, 61);

  addEvent(bass.measures[16], createNote(40, 0, 0.5));
  addEvent(bass.measures[16], createNote(41, 0.5, 0.5));
  addPair(bass, 19, 42, 43);
  addPair(bass, 23, 44, 45);
  addPair(bass, 27, 46, 47);

  const score = createScore('phrase-engine-v2 integration', [guitar, bass]);
  return { score, guitar, bass };
}

export function runPhraseEngineV2IntegrationTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const { score, guitar, bass } = buildMinimalDuo32();

  const pool = buildMotifPool(score, { generationId: 'integration-pe2', seed: 9001 });
  const hasWeightedCell = pool.cells.some((c) => c.weight > 0);

  const gBefore17 = flattenPitchesInBars(guitar, 17, 32);
  const bBefore17 = flattenPitchesInBars(bass, 17, 32);
  const gNoteCount = countNotes(guitar);
  const bNoteCount = countNotes(bass);

  const guitarOut = applyPhraseEngineV2(guitar, pool);
  const bassOut = applyBassMotifEcho(bass, pool);

  const gAfter17 = flattenPitchesInBars(guitarOut, 17, 32);
  const bAfter17 = flattenPitchesInBars(bassOut, 17, 32);

  const guitarDevChanged = gBefore17 !== gAfter17;
  const bassDevChanged = bBefore17 !== bAfter17;
  const noDeletion =
    countNotes(guitarOut) >= gNoteCount && countNotes(bassOut) >= bNoteCount;

  const ok =
    hasWeightedCell &&
    guitarDevChanged &&
    bassDevChanged &&
    noDeletion &&
    countNotes(guitarOut) === gNoteCount &&
    countNotes(bassOut) === bNoteCount;

  out.push({
    ok,
    name: 'Phrase engine V2 integration: pool + guitar/bass bars 17–32 (no note loss)',
  });

  return out;
}
