/**
 * Composer OS V2 — Motif tests
 */

import { generateMotif } from '../core/motif/motifGenerator';
import { placeMotifsAcrossBars, varyMotif, transposeMotif } from '../core/motif/motifTracker';
import { validateMotifIntegrity } from '../core/motif/motifValidation';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testGenerateMotifReturns1To2Motifs(): boolean {
  const motifs = generateMotif(42, 55, 75);
  return motifs.length >= 1 && motifs.length <= 2;
}

function testMotifHas2To5Notes(): boolean {
  const motifs = generateMotif(123, 55, 75);
  return motifs.every((m) => m.notes.length >= 2 && m.notes.length <= 5);
}

function testPlaceMotifsAcrossBars(): boolean {
  const motifs = generateMotif(1, 55, 75);
  const placements = placeMotifsAcrossBars(motifs, 1);
  return placements.length >= 2 && placements.some((p) => p.startBar <= 4) && placements.some((p) => p.startBar >= 5);
}

function testVaryMotifTranspose(): boolean {
  const motifs = generateMotif(2, 55, 75);
  const varied = varyMotif(motifs[0], 'transposed', 2, 0);
  return varied[0].pitch === motifs[0].notes[0].pitch + 2;
}

function testTransposeMotif(): boolean {
  const notes = [{ pitch: 60, startBeat: 0, duration: 1 }];
  const t = transposeMotif(notes, 3);
  return t[0].pitch === 63;
}

function testMotifValidationWithPlacements(): boolean {
  const motifs = generateMotif(10, 55, 75);
  const placements = placeMotifsAcrossBars(motifs, 10);
  const state = { baseMotifs: motifs, placements };
  const m = createMeasure(1);
  addEvent(m, createNote(60, 0, 1));
  addEvent(m, createNote(62, 1, 1));
  addEvent(m, createNote(60, 2, 2));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = validateMotifIntegrity(state, score);
  return r.valid;
}

function testGoldenPathMotifsRecur(): boolean {
  const r = runGoldenPath(77);
  return r.plans?.motifState?.placements?.length >= 2;
}

export function runMotifTests(): { name: string; ok: boolean }[] {
  return [
    ['Generate returns 1-2 motifs', testGenerateMotifReturns1To2Motifs],
    ['Motif has 2-5 notes', testMotifHas2To5Notes],
    ['Place motifs across bars', testPlaceMotifsAcrossBars],
    ['Vary motif transpose', testVaryMotifTranspose],
    ['Transpose motif', testTransposeMotif],
    ['Motif validation with placements', testMotifValidationWithPlacements],
    ['Golden path motifs recur', testGoldenPathMotifsRecur],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
