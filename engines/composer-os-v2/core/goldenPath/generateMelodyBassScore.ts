/**
 * Melody–bass lead-sheet format: strip duo guitar to single-voice melody,
 * bass to lowest note, section-boundary chord symbols.
 */

import type {
  MosaicModeSectionPlanEntry,
  MosaicTonicMap,
} from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type {
  ChordEvent,
  MeasureModel,
  NoteEvent,
  PartModel,
  RestEvent,
  ScoreEvent,
  ScoreModel,
} from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function isVoice2(voice: number | string | undefined): boolean {
  return voice === 2 || voice === '2';
}

function measureBeatSpan(measure: MeasureModel): number {
  return measure.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}

function eventInterval(e: ScoreEvent): { start: number; end: number } {
  return { start: e.startBeat, end: e.startBeat + e.duration };
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function subtractInterval(
  start: number,
  end: number,
  cover: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  const merged = mergeIntervals(cover);
  let gaps: Array<{ start: number; end: number }> = [{ start, end }];
  for (const c of merged) {
    const next: Array<{ start: number; end: number }> = [];
    for (const g of gaps) {
      if (c.end <= g.start || c.start >= g.end) {
        next.push(g);
        continue;
      }
      if (c.start > g.start) next.push({ start: g.start, end: c.start });
      if (c.end < g.end) next.push({ start: c.end, end: g.end });
    }
    gaps = next;
  }
  return gaps.filter((g) => g.end > g.start);
}

function chordToNote(event: ChordEvent, pickMidi: (pitches: number[]) => number): NoteEvent {
  const midi = pickMidi(event.pitches);
  return {
    kind: 'note',
    pitch: midi,
    startBeat: event.startBeat,
    duration: event.duration,
    voice: typeof event.voice === 'number' ? event.voice : 1,
    ...(event.motifRef ? { motifRef: event.motifRef } : {}),
  };
}

function toRest(event: ScoreEvent): RestEvent {
  return {
    kind: 'rest',
    startBeat: event.startBeat,
    duration: event.duration,
    voice: event.voice,
  };
}

function occupiedIntervals(events: ScoreEvent[]): Array<{ start: number; end: number }> {
  return events
    .filter((e) => e.kind === 'note' || e.kind === 'chord' || e.kind === 'rest')
    .map(eventInterval);
}

function stripMelodyMeasure(measure: MeasureModel): void {
  const span = measureBeatSpan(measure);
  const voice1 = measure.events.filter((e) => !isVoice2(e.voice));
  const voice2 = measure.events.filter((e) => isVoice2(e.voice));
  const v1Cover = occupiedIntervals(voice1);
  const gapRests: RestEvent[] = [];
  for (const v2 of voice2) {
    const { start, end } = eventInterval(v2);
    const gaps = subtractInterval(start, Math.min(end, span), v1Cover);
    for (const g of gaps) {
      gapRests.push({ kind: 'rest', startBeat: g.start, duration: g.end - g.start, voice: 1 });
    }
  }
  const processed: ScoreEvent[] = [];
  for (const event of voice1) {
    if (event.kind === 'chord') {
      const sorted = [...event.pitches].sort((a, b) => b - a);
      processed.push(chordToNote(event, () => sorted[0]!));
      continue;
    }
    if (event.kind === 'note') {
      const stacked =
        event.pitches && event.pitches.length > 0
          ? [...event.pitches].sort((a, b) => b - a)[0]!
          : event.pitch;
      if (stacked < 60) {
        processed.push(toRest(event));
      } else {
        processed.push({ ...event, pitch: stacked, pitches: undefined });
      }
      continue;
    }
    processed.push(event);
  }
  measure.events = collapseSimultaneousTopMelodyNotes([...processed, ...gapRests]);
}

/** Same attack time: keep highest MIDI note only (drops exporter `<chord/>` stacks). */
function collapseSimultaneousTopMelodyNotes(events: ScoreEvent[]): ScoreEvent[] {
  const nonNotes: ScoreEvent[] = [];
  const notesByBeat = new Map<number, NoteEvent[]>();
  for (const e of events) {
    if (e.kind !== 'note') {
      nonNotes.push(e);
      continue;
    }
    const list = notesByBeat.get(e.startBeat) ?? [];
    list.push(e);
    notesByBeat.set(e.startBeat, list);
  }
  const collapsed: NoteEvent[] = [];
  for (const notes of notesByBeat.values()) {
    notes.sort((a, b) => b.pitch - a.pitch);
    collapsed.push(notes[0]!);
  }
  return [...nonNotes, ...collapsed].sort((a, b) => a.startBeat - b.startBeat);
}

function stripBassMeasure(measure: MeasureModel): void {
  const processed: ScoreEvent[] = [];
  for (const event of measure.events) {
    if (event.kind === 'chord') {
      const sorted = [...event.pitches].sort((a, b) => a - b);
      processed.push(chordToNote(event, () => sorted[0]!));
      continue;
    }
    if (event.kind === 'note') {
      if (event.pitch > 55) {
        processed.push(toRest(event));
      } else {
        processed.push({ ...event, pitches: undefined });
      }
      continue;
    }
    processed.push(event);
  }
  measure.events = processed;
}

function chordSuffixForStyle(songwriterStyleId: string): string {
  if (songwriterStyleId === 'fripp' || songwriterStyleId === 'robert_fripp') return 'sus2';
  if (songwriterStyleId === 'wayne_shorter') return 'maj7';
  if (songwriterStyleId === 'jack_white') return '5';
  return 'm';
}

function assignSectionChordSymbol(measure: MeasureModel, chordSymbolStr: string): void {
  // MeasureModel has chord (exporter reads m.chord); chordSymbol added for lead-sheet metadata.
  measure.chordSymbol = chordSymbolStr;
  measure.chord = chordSymbolStr;
}

function addSectionChordSymbols(
  part: PartModel,
  sectionPlan: MosaicModeSectionPlanEntry[],
  tonicMap: MosaicTonicMap
): void {
  for (const entry of sectionPlan) {
    const measure = part.measures.find((m) => m.index === entry.startBar);
    if (!measure) continue;
    const spineChord = measure.chord?.trim();
    if (spineChord) {
      assignSectionChordSymbol(measure, spineChord);
      continue;
    }
    const tonicPc =
      tonicMap[entry.sectionLabel] ??
      (entry as MosaicModeSectionPlanEntry & { tonicPitchClass?: number }).tonicPitchClass ??
      0;
    const rootName = PITCH_CLASS_NAMES[((tonicPc % 12) + 12) % 12]!;
    const chordSymbolStr = rootName + chordSuffixForStyle(entry.songwriterStyleId);
    assignSectionChordSymbol(measure, chordSymbolStr);
  }
}

export function applyMelodyBassFormat(
  score: ScoreModel,
  sectionPlan: MosaicModeSectionPlanEntry[],
  tonicMap: MosaicTonicMap = {}
): ScoreModel {
  const melodyPart = score.parts.find(
    (p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar'
  );
  const bassPart = score.parts.find(
    (p) => p.instrumentIdentity === 'acoustic_upright_bass' || p.id === 'bass'
  );
  if (!melodyPart || !bassPart) {
    console.warn('[melody-bass] part not found, returning original');
    return score;
  }

  const melodyClone = structuredClone(melodyPart);
  const bassClone = structuredClone(bassPart);

  for (const measure of melodyClone.measures) {
    stripMelodyMeasure(measure);
  }
  for (const measure of bassClone.measures) {
    stripBassMeasure(measure);
  }
  addSectionChordSymbols(melodyClone, sectionPlan, tonicMap);

  return { ...score, parts: [melodyClone, bassClone] };
}
