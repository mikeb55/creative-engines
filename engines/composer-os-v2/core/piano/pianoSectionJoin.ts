/**
 * Join two 24-bar general-piano scores into one 48-bar score before MusicXML export.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { parseGeneralPianoChord } from './generalPianoWriter';

const RH_LOW = 60;
const RH_HIGH = 84;

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function cloneEvent(event: ScoreEvent): ScoreEvent {
  if (event.kind === 'note') {
    return {
      ...event,
      pitches: event.pitches ? [...event.pitches] : undefined,
      notation: event.notation ? { ...event.notation } : undefined,
    };
  }
  return { ...event };
}

function cloneMeasure(measure: MeasureModel, index: number): MeasureModel {
  return {
    ...measure,
    index,
    events: measure.events.map(cloneEvent),
    pianoBeatGroups: measure.pianoBeatGroups ? [...measure.pianoBeatGroups] : undefined,
    pianoPolychord: measure.pianoPolychord
      ? {
        ...measure.pianoPolychord,
        upper: { ...measure.pianoPolychord.upper },
        lower: { ...measure.pianoPolychord.lower },
      }
      : undefined,
  };
}

function rhNotesInMeasure(measure: MeasureModel): NoteEvent[] {
  return measure.events
    .filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
}

function stepLeadInto(target: number, chordTones: readonly number[], low: number, high: number): number {
  const candidates = [target - 1, target + 1].filter((midi) => midi >= low && midi <= high);
  const inChord = candidates.find((midi) => chordTones.includes(mod12(midi)));
  return inChord ?? candidates[0] ?? target - 1;
}

function patchMeasureFirstRhStep(measure: MeasureModel, leadPitch: number): void {
  const notes = rhNotesInMeasure(measure);
  if (notes.length > 0) {
    notes[0]!.pitch = leadPitch;
  }
}

export function applyStepwiseSectionJoin(
  score: ScoreModel,
  leftBar: number,
  rightBar: number,
  leftBarChordSymbol: string,
): void {
  const part = score.parts[0];
  if (!part) return;
  const leftMeasure = part.measures[leftBar - 1];
  const rightMeasure = part.measures[rightBar - 1];
  if (!leftMeasure || !rightMeasure) return;
  const leftLast = rhNotesInMeasure(leftMeasure).at(-1);
  const rightFirst = rhNotesInMeasure(rightMeasure)[0];
  if (!leftLast || !rightFirst) return;
  const rightSymbol = rightMeasure.chordSymbol ?? rightMeasure.chord ?? '';
  const rightChord = parseGeneralPianoChord(rightSymbol);
  if (!rightChord) return;
  const lead = stepLeadInto(leftLast.pitch, rightChord.tones, RH_LOW, RH_HIGH);
  patchMeasureFirstRhStep(rightMeasure, lead);
}

/** 48-bar varied reprise: section 1 and 2 are the same 4E score (no join pitch edit). */
export function joinGeneralPianoVariedReprise(section24: ScoreModel): ScoreModel {
  return joinGeneralPianoSections(section24, section24, { stepwiseJoin: false });
}

export function joinGeneralPianoSections(
  section1: ScoreModel,
  section2: ScoreModel,
  options?: { stepwiseJoin?: boolean },
): ScoreModel {
  const stepwiseJoin = options?.stepwiseJoin !== false;
  const part1 = section1.parts[0];
  const part2 = section2.parts[0];
  if (!part1 || !part2) {
    throw new Error('joinGeneralPianoSections needs piano parts in both scores');
  }
  if (part1.measures.length < 24 || part2.measures.length < 24) {
    throw new Error('joinGeneralPianoSections needs 24 measures per section');
  }

  const measures1 = part1.measures.slice(0, 24).map((measure, index) => cloneMeasure(measure, index + 1));
  const measures2 = part2.measures.slice(0, 24).map((measure, index) => cloneMeasure(measure, index + 25));

  const joined: ScoreModel = {
    ...section1,
    title: section1.title?.includes('48')
      ? section1.title
      : `${section1.title ?? 'General Piano'} — 48 bars`,
    parts: [{
      ...part1,
      measures: [...measures1, ...measures2],
    }],
  };

  if (stepwiseJoin) {
    const bar24Chord = measures1[23]?.chordSymbol ?? measures1[23]?.chord ?? 'Cmaj7';
    applyStepwiseSectionJoin(joined, 24, 25, bar24Chord);
  }
  return joined;
}

export function exportJoinedGeneralPianoScore(
  score: ScoreModel,
): { ok: true; xml: string } | { ok: false; error: string } {
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    return { ok: false, error: exported.errors.join('; ') || 'piano export failed' };
  }
  return { ok: true, xml: exported.xml };
}
