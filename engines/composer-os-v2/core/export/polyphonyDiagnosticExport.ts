/**
 * Roadmap 18.2A — deterministic single-staff two-voice MusicXML proof (export / notation only).
 *
 * Diagnostic score is built voice-major (all voice-1 events, then voice-2), not chronological-interleaved.
 * `eventsToXml` still buckets by voice; this ordering documents intent and satisfies strict diagnostic rules.
 *
 * Rhythmic fixture: voice 1 = four quarters; voice 2 = one whole note (guaranteed overlap for Sibelius visibility).
 */

import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';
import { createMeasure, createNote, createScore, addEvent } from '../score-model/scoreEventBuilder';
import { beatSpanToTicks } from './musicXmlTickEncoding';
import { computeVoiceExportDivisionSum, exportScoreModelToMusicXml } from './musicxmlExporter';
import type { MusicXmlExportResult, MusicXmlExportOptions } from './exportTypes';

/** Part id for grep / tests. */
export const PHASE_182A_DIAGNOSTIC_GUITAR_PART_ID = 'phase182a-guitar-polyphony-diagnostic';

/** Title shown in exported MusicXML. */
export const PHASE_182A_DIAGNOSTIC_TITLE = 'Phase 18.2A Polyphony Diagnostic (export proof)';

/** Half note length in divisions (4/4 @ 480/quarter). */
const HALF_NOTE_DIVISIONS = MEASURE_DIVISIONS / 2;

/**
 * Hard checks before MusicXML write — diagnostic export only.
 * Ensures full-bar voice sums, whole-note lower voice, beat-1 start, and overlap with upper quarters.
 */
export function assertPhase182ADiagnosticRhythm(score: ScoreModel): void {
  const guitar = score.parts.find((p) => p.id === PHASE_182A_DIAGNOSTIC_GUITAR_PART_ID);
  if (!guitar || guitar.measures.length !== 1) {
    throw new Error('Phase 18.2A diagnostic: expected one guitar part with exactly one measure');
  }
  const m = guitar.measures[0]!;
  const measureDuration = MEASURE_DIVISIONS;
  const voice1Total = computeVoiceExportDivisionSum(m, 1);
  const voice2Total = computeVoiceExportDivisionSum(m, 2);
  if (voice1Total !== measureDuration) {
    throw new Error(`Phase 18.2A diagnostic: voice1_total_duration ${voice1Total} !== measure_duration ${measureDuration}`);
  }
  if (voice2Total !== measureDuration) {
    throw new Error(`Phase 18.2A diagnostic: voice2_total_duration ${voice2Total} !== measure_duration ${measureDuration}`);
  }

  const v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
  if (v2notes.length === 0) {
    throw new Error('Phase 18.2A diagnostic: voice 2 must have at least one note');
  }
  const v2long = v2notes.filter((n) => {
    const { start: s, end: e } = beatSpanToTicks(n.startBeat, n.startBeat + n.duration);
    return e - s >= HALF_NOTE_DIVISIONS;
  });
  if (v2long.length === 0) {
    throw new Error('Phase 18.2A diagnostic: voice 2 must contain a note with duration >= half note');
  }
  const primary = v2notes[0]!;
  if (primary.startBeat !== 0) {
    throw new Error('Phase 18.2A diagnostic: voice 2 must begin on beat 1 (startBeat 0)');
  }
  if (primary.duration !== BEATS_PER_MEASURE) {
    throw new Error('Phase 18.2A diagnostic: expected one whole-note layer (duration 4 beats)');
  }
  const v1count = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1).length;
  if (v1count !== 4) {
    throw new Error('Phase 18.2A diagnostic: expected four voice-1 quarter notes');
  }
  const wholeEnd = primary.startBeat + primary.duration;
  const v1beats = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1);
  let overlapCount = 0;
  for (const q of v1beats) {
    if (primary.startBeat < q.startBeat + q.duration && wholeEnd > q.startBeat) overlapCount++;
  }
  if (overlapCount < 2) {
    throw new Error('Phase 18.2A diagnostic: voice-2 whole must span across two or more voice-1 notes');
  }
}

/**
 * One guitar staff, one 4/4 measure (voice-major event order — not chronological interleave):
 * - Voice 1: C5 D5 E5 F5 — four quarter notes (beats 0–3).
 * - Voice 2: G3 — one whole note (beats 0–4), simultaneous with all upper quarters.
 */
export function buildPhase182AGuitarPolyphonyDiagnosticScore(): ScoreModel {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(72, 0, 1, 1)); // C5
  addEvent(m, createNote(74, 1, 1, 1)); // D5
  addEvent(m, createNote(76, 2, 1, 1)); // E5
  addEvent(m, createNote(77, 3, 1, 1)); // F5
  addEvent(m, createNote(55, 0, 4, 2)); // G3 whole — beat 1, full bar

  const guitar: PartModel = {
    id: PHASE_182A_DIAGNOSTIC_GUITAR_PART_ID,
    name: 'Guitar (diagnostic)',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };

  return createScore(PHASE_182A_DIAGNOSTIC_TITLE, [guitar], { tempo: 100 });
}

/** Same as `exportScoreModelToMusicXml`; includes beat-1 harmony to verify Sibelius measure order. */
export function exportPhase182AGuitarPolyphonyDiagnosticMusicXml(
  options?: MusicXmlExportOptions
): MusicXmlExportResult {
  const score = buildPhase182AGuitarPolyphonyDiagnosticScore();
  assertPhase182ADiagnosticRhythm(score);
  return exportScoreModelToMusicXml(score, {
    ...options,
  });
}
