/**
 * Read one stored M-token into a BaseMotif.
 * Measure span is the annotated measure. No similarity and no extra boundary.
 */

import type { BaseMotif, MotifNote } from '../motif/motifTypes';
import { ensureMusicXmlDomParserPolyfill } from '../musicXmlImportDomPolyfill';
import { analyzePentatonicScore, type PentatonicScoreAnalysis } from './analyzeScore';
import { importPentatonicScoreFromMusicXml, type PentatonicMotifMark } from './musicXmlScore';
import type { PentatonicCollectionView, RhythmSlot } from './motifTransform';
import { mod12 } from './pitch';

export interface AnnotatedMotif {
  motif: BaseMotif;
  rhythm: RhythmSlot[];
  meter: { beats: number; beatType: number };
  mark: PentatonicMotifMark;
  home: PentatonicCollectionView;
  colour: PentatonicCollectionView;
  colourRegion: string;
  analysis: PentatonicScoreAnalysis;
}

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function localName(el: Element): string {
  return el.localName || el.tagName;
}

function children(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  const list = parent.children;
  for (let index = 0; index < list.length; index += 1) {
    const child = list[index]!;
    if (!name || localName(child) === name) out.push(child);
  }
  return out;
}

function textOf(parent: Element | null, name: string): string | undefined {
  if (!parent) return undefined;
  for (const child of children(parent, name)) {
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

function motifToken(label: string): string {
  return label.trim().split(/\s+/)[0] ?? label.trim();
}

function midiOf(step: string, alter: number, octave: number, chromatic: number, octaveChange: number): number {
  const pc = mod12((STEP_PC[step.toUpperCase()] ?? 0) + alter + chromatic);
  return (octave + octaveChange + 1) * 12 + pc;
}

export function extractAnnotatedMotif(xml: string, token: string, sourceLabel: string, colourName: string): AnnotatedMotif {
  const imported = importPentatonicScoreFromMusicXml(xml);
  const marks = imported.motifs.filter((mark) => motifToken(mark.label) === token && mark.sourceLabel === sourceLabel);
  if (marks.length !== 1) {
    throw new Error(`Stored motif ${token}@${sourceLabel} matched ${marks.length} annotations.`);
  }
  const mark = marks[0]!;
  const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1' });
  const homeRegion = analysis.regions.find((region) => region.homeRelationshipLabel === 'HOME' && region.collectionName !== 'NONE');
  const colourRegion = analysis.regions.find((region) => region.collectionName === colourName && region.collectionName !== 'NONE');
  if (!analysis.identity.home || !homeRegion || !colourRegion) {
    throw new Error(`HOME or ${colourName} is missing from the Dev 3.7 path.`);
  }
  const homeEvent = analysis.path.events.find((event) => event.sourceLabel === homeRegion.firstSourceLabel);
  const colourEvent = analysis.path.events.find((event) => event.sourceLabel === colourRegion.firstSourceLabel);
  if (!homeEvent?.archetypeId || !homeEvent.referenceNote || !colourEvent?.archetypeId || !colourEvent.referenceNote) {
    throw new Error('Path collection is missing a registry reference pitch.');
  }
  if (colourEvent.chosenName === 'NONE' || homeEvent.chosenName === 'NONE') {
    throw new Error('NONE is not a motif target.');
  }
  ensureMusicXmlDomParserPolyfill();
  const Parser = (globalThis as unknown as { DOMParser?: typeof DOMParser }).DOMParser;
  if (!Parser) throw new Error('DOMParser is unavailable.');
  const doc = new Parser().parseFromString(xml, 'application/xml');
  const guitar = guitarPart(doc);
  if (!guitar) throw new Error('No guitar part.');
  const read = readGuitarMeasure(guitar, sourceLabel, mark.offsetDivisions);
  const motif: BaseMotif = {
    id: `${token}@${sourceLabel}`,
    notes: read.notes,
    barCount: 1,
  };
  return {
    motif,
    rhythm: read.rhythm,
    meter: read.meter,
    mark,
    home: {
      name: homeRegion.collectionName,
      archetypeId: homeEvent.archetypeId,
      referenceNote: homeEvent.referenceNote,
      homeRelationshipLabel: homeEvent.homeRelationshipLabel,
    },
    colour: {
      name: colourRegion.collectionName,
      archetypeId: colourEvent.archetypeId,
      referenceNote: colourEvent.referenceNote,
      homeRelationshipLabel: colourEvent.homeRelationshipLabel,
    },
    colourRegion: colourRegion.measureRangeLabel,
    analysis,
  };
}

function guitarPart(doc: Document): Element | null {
  const root = doc.documentElement;
  if (!root) return null;
  let guitarId: string | null = null;
  for (const list of children(root, 'part-list')) {
    for (const scorePart of children(list, 'score-part')) {
      const name = textOf(scorePart, 'part-name') ?? '';
      const instrument = textOf(scorePart, 'instrument-name') ?? '';
      if (`${name} ${instrument}`.toLowerCase().includes('guitar') && !guitarId) guitarId = scorePart.getAttribute('id');
    }
  }
  if (!guitarId) return null;
  return children(root, 'part').find((part) => part.getAttribute('id') === guitarId) ?? null;
}

function applyAttributes(measure: Element, state: { divisions: number; beats: number; beatType: number; chromatic: number; octaveChange: number }): void {
  for (const attributes of children(measure, 'attributes')) {
    const divisionText = textOf(attributes, 'divisions');
    if (divisionText) state.divisions = parseInt(divisionText, 10);
    const time = children(attributes, 'time')[0];
    if (time) {
      const beatText = textOf(time, 'beats');
      const typeText = textOf(time, 'beat-type');
      if (beatText) state.beats = parseInt(beatText, 10);
      if (typeText) state.beatType = parseInt(typeText, 10);
    }
    const transpose = children(attributes, 'transpose')[0];
    if (transpose) {
      const chromaticText = textOf(transpose, 'chromatic');
      const octaveText = textOf(transpose, 'octave-change');
      if (chromaticText) state.chromatic = parseInt(chromaticText, 10);
      if (octaveText) state.octaveChange = parseInt(octaveText, 10);
    }
  }
}

function readGuitarMeasure(part: Element, sourceLabel: string, offsetDivisions: number | null): {
  notes: MotifNote[];
  rhythm: RhythmSlot[];
  meter: { beats: number; beatType: number };
} {
  const state = { divisions: 1, beats: 4, beatType: 4, chromatic: 0, octaveChange: 0 };
  let measure: Element | null = null;
  for (const candidate of children(part, 'measure')) {
    applyAttributes(candidate, state);
    if (candidate.getAttribute('number') === sourceLabel) {
      measure = candidate;
      break;
    }
  }
  if (!measure) throw new Error(`Measure ${sourceLabel} is missing.`);
  const { divisions, beats, beatType, chromatic, octaveChange } = state;
  const raw: { kind: 'note' | 'rest'; duration: number; pitch?: number }[] = [];
  let cursor = 0;
  for (const note of children(measure, 'note')) {
    const voice = textOf(note, 'voice') ?? '1';
    if (voice !== '1') continue;
    if (children(note, 'grace').length > 0 || children(note, 'cue').length > 0) continue;
    if (children(note, 'chord').length > 0) continue;
    const duration = parseInt(textOf(note, 'duration') ?? '0', 10);
    const onset = cursor;
    cursor += Number.isFinite(duration) ? duration : 0;
    if (offsetDivisions !== null && onset < offsetDivisions) continue;
    if (children(note, 'rest').length > 0) {
      raw.push({ kind: 'rest', duration });
      continue;
    }
    const pitch = children(note, 'pitch')[0];
    const step = pitch ? textOf(pitch, 'step') : undefined;
    if (!pitch || !step) continue;
    const alter = parseInt(textOf(pitch, 'alter') ?? '0', 10);
    const octave = parseInt(textOf(pitch, 'octave') ?? '4', 10);
    const ties = children(note, 'tie').map((tie) => tie.getAttribute('type') ?? '');
    const continuation = ties.includes('stop') && !ties.includes('start');
    const midi = midiOf(step, alter, octave, chromatic, octaveChange);
    if (continuation && raw.length > 0 && raw[raw.length - 1]!.kind === 'note' && raw[raw.length - 1]!.pitch === midi) {
      raw[raw.length - 1]!.duration += duration;
      continue;
    }
    raw.push({ kind: 'note', duration, pitch: midi });
  }
  const expected = beats * (4 / beatType);
  const actual = raw.reduce((sum, item) => sum + item.duration / Math.max(1, divisions), 0);
  const scale = actual > 0 && Math.abs(actual - expected) > 0.01 ? expected / actual : 1;
  const quarter = (duration: number) => (duration / Math.max(1, divisions)) * scale;
  const notes: MotifNote[] = [];
  const rhythm: RhythmSlot[] = [];
  let start = 0;
  for (const item of raw) {
    const duration = quarter(item.duration);
    rhythm.push({ kind: item.kind, startBeat: start, duration });
    if (item.kind === 'note' && item.pitch !== undefined) {
      notes.push({ pitch: item.pitch, startBeat: start, duration });
    }
    start += duration;
  }
  return { notes, rhythm, meter: { beats, beatType } };
}
