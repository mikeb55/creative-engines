/**
 * Score-derived Orbit practice phrase.
 * Guitar is the existing phrase operator. Bass, chords, meter, tempo, and key
 * stay on the source. This file does not write the WWH leadsheet.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import type { ExplicitPitchSpelling } from '../export/musicXmlNoteFragment';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import type { BaseMotif } from '../motif/motifTypes';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import { DIVISIONS, type NoteEvent, type ScoreEvent } from '../score-model/scoreModelTypes';
import { analyzePentatonicScore } from './analyzeScore';
import { getPentatonicColourResource } from './colourRegistry';
import { assessPentatonicFormDuo, formDuoEventsFromAnalysis } from './formDuoIntelligence';
import { readWrittenStaffMeasure, type WrittenStaffEvent } from './motifAnnotationExtract';
import { manualCollection } from './dev4cWorkflow';
import type { PentatonicCollectionView, RhythmSlot } from './motifTransform';
import { explicitSpelling } from './practiceFacade';
import { realisePentatonicPhrase } from './phraseOperators';
import { mod12, pitchClassSpellingMap, spellFromReference } from './pitch';

export interface OrbitPhraseExport {
  xml: string;
  firstSourceLabel: string;
  lastSourceLabel: string;
  phraseFunction: string;
  sectionId: string;
  extended: boolean;
  bars: readonly {
    sourceLabel: string;
    chord: string;
    operator: string;
    field: string;
    fieldNotes: string;
    rhythm: 'source' | 'generated';
  }[];
  tempo: number;
  meter: { beats: number; beatType: number };
  fifths: number;
  mode: string;
}

const SOURCE_RHYTHM_CATEGORIES = new Set(['CELL_LINEAGE', 'RESEAT', 'RETAIN', 'HOLD_FIELD']);

export function exportOrbitPracticePhrase(xml: string): OrbitPhraseExport {
  const before = xml;
  const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1' });
  if (before !== xml) throw new Error('Orbit export modified the source MusicXML.');
  const form = assessPentatonicFormDuo({
    events: formDuoEventsFromAnalysis(analysis),
    endingDetected: analysis.score.endingDetected,
    homePitchClasses: analysis.identity.home?.pitchClasses ? [...analysis.identity.home.pitchClasses] : null,
  });
  const phrase = form.phrases[0];
  if (!phrase) throw new Error('Dev 6A found no Orbit phrase.');
  const sectionId = form.decisions.find((decision) => decision.phraseId === phrase.id)?.sectionId ?? '';
  let lastIndex = phrase.lastIndex;
  let extended = false;
  const span = () => lastIndex - phrase.firstIndex + 1;
  if (span() < 4) {
    for (const next of form.phrases.slice(1)) {
      const nextSection = form.decisions.find((decision) => decision.index === next.firstIndex)?.sectionId;
      if (nextSection !== sectionId) break;
      lastIndex = next.lastIndex;
      extended = true;
      if (span() >= 4) break;
    }
  }
  const events = formDuoEventsFromAnalysis(analysis).slice(phrase.firstIndex, lastIndex + 1);
  const firstRead = readWrittenStaffMeasure(xml, 'guitar', events[0]?.sourceLabel ?? phrase.firstSourceLabel);
  const beats = firstRead.meter.beats;
  const beatType = firstRead.meter.beatType;
  const tempo = firstRead.tempo ?? 120;
  const fifths = firstRead.fifths ?? 0;
  const mode = firstRead.mode ?? 'major';
  const barCount = events.length;
  const guitar = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', barCount, () => undefined, () => undefined);
  const bass = createPart('bass', 'Upright Bass', ACOUSTIC_UPRIGHT_BASS.instrumentIdentity, ACOUSTIC_UPRIGHT_BASS.midiProgram, 'bass', barCount, () => undefined, () => undefined);
  const words: Record<number, string> = {};
  let previousLabel = '';
  const rows: OrbitPhraseExport['bars'][number][] = [];

  events.forEach((event, index) => {
    const label = event.sourceLabel;
    const guitarRead = readWrittenStaffMeasure(xml, 'guitar', label);
    const bassRead = readWrittenStaffMeasure(xml, 'bass', label);
    const pathEvent = analysis.path.events.find((row) => row.sourceLabel === label);
    const fieldName = pathEvent?.chosenName && pathEvent.chosenName !== 'NONE' ? pathEvent.chosenName : 'F Minor Pentatonic';
    const resourceId = pathEvent?.archetypeId ?? 'minor_pentatonic';
    const reference = pathEvent?.referenceNote ?? 'F';
    const resource = getPentatonicColourResource(resourceId);
    const fieldNotes = resource ? spellFromReference(reference, resource.intervals, resource.letterSteps).join(' ') : reference;
    const home = collectionView(resourceId, reference, fieldName);
    const sourceNotes = guitarRead.events.filter((item) => item.kind === 'note' && item.pitch !== undefined);
    const useSource = sourceNotes.length >= 3;
    const motif: BaseMotif | null = useSource
      ? {
          id: `orbit-${label}`,
          barCount: 1,
          notes: sourceNotes.map((item) => ({ pitch: item.pitch!, startBeat: item.startBeat, duration: item.duration })),
        }
      : null;
    const sourceRhythm: RhythmSlot[] = guitarRead.events.map((item) => ({
      kind: item.kind,
      startBeat: item.startBeat,
      duration: item.duration,
    }));
    const realisation = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home,
      motif,
      method: 'M-DEG',
      operator: useSource ? 'CELL_LINEAGE' : undefined,
      harmonyBars: [guitarRead.chord || 'N.C.'],
      sourceRhythm: useSource ? sourceRhythm : undefined,
    });
    const operator = realisation.plan.operator;
    const applyCell = useSource && realisation.rhythm === 'source' && SOURCE_RHYTHM_CATEGORIES.has(operator);
    const rhythm = guitarRead.events.length > 0 || applyCell ? 'source' : 'generated';
    const fieldMap = pitchClassSpellingMap(fieldNotes.split(/\s+/).filter(Boolean));
    const writtenShift = -12 * guitarRead.octaveChange;
    const guitarEvents =
      guitarRead.events.length > 0
        ? overlaySourceRhythm(guitarRead.events, applyCell ? realisation.pitches : [], fieldMap, writtenShift)
        : evenFieldEvents(
            realisation.pitches.map((pitch) => pitch + writtenShift),
            beats * (4 / beatType),
            fieldMap
          );
    guitar.measures[index]!.chord = guitarRead.chord || event.chordSymbol || undefined;
    guitar.measures[index]!.measureBeatSpanQuarters = beats * (4 / beatType);
    guitar.measures[index]!.events = snapVoice(guitarEvents, beats * (4 / beatType));
    bass.measures[index]!.measureBeatSpanQuarters = beats * (4 / beatType);
    bass.measures[index]!.events = snapVoice(eventsFromWritten(bassRead.events), beats * (4 / beatType));
    const staffText = `${operator === 'CELL_LINEAGE' ? 'CELL' : operator} · ${shortField(fieldName)}`;
    if (staffText !== previousLabel) words[index + 1] = staffText;
    previousLabel = staffText;
    rows.push({
      sourceLabel: label,
      chord: guitarRead.chord || 'N.C.',
      operator,
      field: fieldName,
      fieldNotes,
      rhythm,
    });
  });

  const score = createScore('Orbit — practice phrase', [guitar, bass], { tempo });
  score.timeSignature = { beats, beatType };
  score.barMeterMap = {};
  for (let bar = 1; bar <= barCount; bar += 1) score.barMeterMap[bar] = { numerator: beats, denominator: beatType };
  score.keySignature = { fifths, mode: mode === 'minor' ? 'minor' : 'major', hideKeySignature: false };
  score.partMeasureWordsMarkings = { guitar: words };
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join(' ') || 'Orbit MusicXML export failed.');
  if (/<staff-type>tab<\/staff-type>/i.test(exported.xml)) throw new Error('Orbit export included a TAB staff.');
  const displayXml = exported.xml.replace(/<degree print-object="no">[\s\S]*?<\/degree>/g, '');
  return {
    xml: displayXml,
    firstSourceLabel: events[0]?.sourceLabel ?? phrase.firstSourceLabel,
    lastSourceLabel: events[events.length - 1]?.sourceLabel ?? phrase.lastSourceLabel,
    phraseFunction: phrase.function,
    sectionId,
    extended,
    bars: rows,
    tempo,
    meter: { beats, beatType },
    fifths,
    mode,
  };
}

function shortField(name: string): string {
  return name.replace(' Minor Pentatonic', ' min').replace(' Major Pentatonic', ' maj');
}

function collectionView(resourceId: string, reference: string, name: string): PentatonicCollectionView {
  if (resourceId === 'major_pentatonic' || resourceId === 'minor_pentatonic') return manualCollection(resourceId, reference);
  return { name, archetypeId: resourceId, referenceNote: reference, homeRelationshipLabel: null };
}

function eventsFromWritten(written: readonly WrittenStaffEvent[]): ScoreEvent[] {
  return written.map((event) => {
    if (event.kind === 'rest' || event.pitch === undefined || !event.step) return createRest(event.startBeat, event.duration, 1);
    const note = createNote(event.pitch, event.startBeat, event.duration, 1);
    note.spelling = { step: event.step, alter: event.alter ?? 0 };
    return note;
  });
}

function overlaySourceRhythm(
  written: readonly WrittenStaffEvent[],
  pitches: readonly number[],
  fieldMap: Record<number, string>,
  writtenShift: number
): ScoreEvent[] {
  let noteIndex = 0;
  return written.map((event) => {
    if (event.kind === 'rest' || event.pitch === undefined || !event.step) return createRest(event.startBeat, event.duration, 1);
    const generated = pitches[noteIndex];
    noteIndex += 1;
    const pitch = (generated ?? event.pitch) + writtenShift;
    const sourcePc = mod12(event.pitch);
    const keepSource = generated === undefined || mod12(generated) === sourcePc;
    const note = createNote(pitch, event.startBeat, event.duration, 1);
    const field = explicitSpelling(fieldMap[mod12(pitch)] ?? '');
    note.spelling = keepSource ? { step: event.step, alter: event.alter ?? 0 } : field ?? { step: event.step, alter: event.alter ?? 0 };
    return note;
  });
}

function evenFieldEvents(pitches: readonly number[], span: number, fieldMap: Record<number, string>): ScoreEvent[] {
  if (pitches.length === 0) return [createRest(0, span, 1)];
  const duration = Math.min(1, span / pitches.length);
  const events: ScoreEvent[] = pitches.map((pitch, index) => {
    const note = createNote(pitch, index * duration, duration, 1);
    const spelling = explicitSpelling(fieldMap[mod12(pitch)] ?? '');
    if (spelling) note.spelling = spelling;
    return note;
  });
  const used = duration * pitches.length;
  if (used < span - 1e-6) events.push(createRest(used, span - used, 1));
  return events;
}

function snapVoice(events: readonly ScoreEvent[], span: number): ScoreEvent[] {
  const target = Math.round(span * DIVISIONS);
  const grid = 120;
  const ticks = events.map((event) => Math.max(grid, Math.round((event.duration * DIVISIONS) / grid) * grid));
  let remain = target - ticks.reduce((sum, value) => sum + value, 0);
  while (remain !== 0) {
    const index = ticks.reduce((best, value, candidate) => (value > (ticks[best] ?? 0) ? candidate : best), 0);
    const step = remain > 0 ? grid : -grid;
    if ((ticks[index] ?? 0) + step <= 0) break;
    ticks[index] = (ticks[index] ?? 0) + step;
    remain -= step;
    if (Math.abs(remain) > target) break;
  }
  let start = 0;
  return events.map((event, index) => {
    const duration = (ticks[index] ?? 0) / DIVISIONS;
    const placed = event.kind === 'rest' ? createRest(start, duration, event.voice ?? 1) : placeNote(event, start, duration);
    start += duration;
    return placed;
  });
}

function placeNote(event: ScoreEvent, startBeat: number, duration: number): NoteEvent {
  if (event.kind !== 'note') return createNote(60, startBeat, duration, 1);
  const note = createNote(event.pitch, startBeat, duration, event.voice ?? 1);
  if (event.spelling) note.spelling = event.spelling;
  return note;
}
