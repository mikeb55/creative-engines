/**
 * Performance Composer — general score plumbing.
 * Any partwise MusicXML score: parts, document-order bar span, write lane, locks.
 * Bars are addressed by document order (1 = first <measure>), never by printed number.
 * Timing is read from the file's own <duration>, <backup> and <forward> values.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { importPartwiseMusicXml, type WwhPartwiseScore } from '../wwh/wwhDuoImport';
import { midiOfPitch, parseChordLabel, type PcChord } from './pcChord';

export interface PcSpan {
  /** First bar, document order, 1-based. */
  from: number;
  /** Last bar, document order, 1-based, inclusive. */
  to: number;
}

/** The one place new material may be written: a new voice in one part, inside the span. */
export interface PcLane {
  partId: string;
  voice: string;
  /** Exact regrid factor applied to the lane part (1 = untouched). */
  regrid?: number;
  /** Staff number when the part uses <staff>; undefined otherwise. */
  staff?: string;
}

/**
 * Locks. Everything already in the source is locked: every part, voice, harmony, rhythm,
 * metre, tempo, form and layout element. The lane only adds a new voice.
 */
export interface PcLocks {
  source: 'all';
}

export interface PcBarRef {
  order: number;
  printed: string;
}

export interface PcTimedNote {
  voice: string;
  staff?: string;
  onset: number;
  ticks: number;
  rest: boolean;
  /** Sounding MIDI (written pitch adjusted by the part's octave-change). */
  midis: number[];
}

export interface PcMeasureView {
  order: number;
  printed: string;
  divisions: number;
  /** Length in divisions: the furthest cursor position reached in the measure. */
  length: number;
  fifths: number;
  transposeOctave: number;
  notes: PcTimedNote[];
  harmony: Array<{ onset: number; label: string; chord: PcChord | null }>;
  element: Element;
}

export function elementChildren(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (!node || node.nodeType !== 1) continue;
    const el = node as Element;
    if (!name || el.nodeName === name) out.push(el);
  }
  return out;
}

function childText(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

export function parseScoreDocument(xml: string): Document {
  const errors: string[] = [];
  const doc = new DOMParser({
    onError: (level: string, message: string) => {
      if (level !== 'warning') errors.push(message);
    },
  }).parseFromString(xml, 'text/xml') as unknown as Document;
  if (errors.length) throw new Error(`MusicXML parse failed: ${errors[0]}`);
  if (!doc.documentElement || doc.documentElement.nodeName !== 'score-partwise') {
    throw new Error('Performance Composer expects score-partwise MusicXML');
  }
  return doc;
}

export function serializeNode(node: Node): string {
  return new XMLSerializer().serializeToString(node as never);
}

export function partElements(doc: Document): Element[] {
  return elementChildren(doc.documentElement, 'part');
}

/** Full import (for semantic checks) plus the DOM. */
export function loadScore(xml: string): { doc: Document; score: WwhPartwiseScore } {
  const doc = parseScoreDocument(xml);
  const score = importPartwiseMusicXml(xml);
  return { doc, score };
}

function harmonyLabelOf(harmony: Element): string {
  const root = elementChildren(harmony, 'root')[0];
  const step = childText(root, 'root-step');
  if (!step) return '';
  const alter = childText(root, 'root-alter');
  const kind = elementChildren(harmony, 'kind')[0];
  const kindText = kind?.getAttribute('text') ?? kind?.textContent?.trim() ?? '';
  const acc = alter === '-1' ? 'b' : alter === '1' ? '#' : '';
  const bass = elementChildren(harmony, 'bass')[0];
  const bassStep = childText(bass, 'bass-step');
  const bassAlter = childText(bass, 'bass-alter');
  const bassBit = bassStep ? `/${bassStep}${bassAlter === '-1' ? 'b' : bassAlter === '1' ? '#' : ''}` : '';
  return `${step}${acc}${kindText}${bassBit}`;
}

function safeChord(label: string): PcChord | null {
  try {
    return parseChordLabel(label);
  } catch {
    return null;
  }
}

/** Read every measure of one part as a timeline (per-voice onsets from the DOM cursor). */
export function measureViews(part: Element): PcMeasureView[] {
  let divisions = 1;
  let fifths = 0;
  let transposeOctave = 0;
  return elementChildren(part, 'measure').map((measure, index) => {
    for (const attributes of elementChildren(measure, 'attributes')) {
      const d = Number(childText(attributes, 'divisions'));
      if (Number.isFinite(d) && d > 0) divisions = d;
      const key = elementChildren(attributes, 'key')[0];
      if (key && childText(key, 'fifths') !== '') fifths = Number(childText(key, 'fifths'));
      const transpose = elementChildren(attributes, 'transpose')[0];
      if (transpose) transposeOctave = Number(childText(transpose, 'octave-change') || 0);
    }
    let cursor = 0;
    let length = 0;
    const notes: PcTimedNote[] = [];
    const harmony: PcMeasureView['harmony'] = [];
    let lastOnset = 0;
    for (const node of elementChildren(measure)) {
      const name = node.nodeName;
      if (name === 'harmony') {
        const label = harmonyLabelOf(node);
        if (label) harmony.push({ onset: cursor, label, chord: safeChord(label) });
      } else if (name === 'note') {
        const isChord = elementChildren(node, 'chord').length > 0;
        const isGrace = elementChildren(node, 'grace').length > 0;
        const dur = Number(childText(node, 'duration') || 0);
        if (isGrace) continue;
        const pitch = elementChildren(node, 'pitch')[0];
        const midi = pitch
          ? midiOfPitch(childText(pitch, 'step'), Number(childText(pitch, 'alter') || 0), Number(childText(pitch, 'octave'))) +
            12 * transposeOctave
          : null;
        if (isChord) {
          const last = notes[notes.length - 1];
          if (last && midi !== null) last.midis.push(midi);
          continue;
        }
        lastOnset = cursor;
        notes.push({
          voice: childText(node, 'voice') || '1',
          staff: childText(node, 'staff') || undefined,
          onset: lastOnset,
          ticks: dur,
          rest: elementChildren(node, 'rest').length > 0,
          midis: midi === null ? [] : [midi],
        });
        cursor += dur;
      } else if (name === 'backup') {
        cursor -= Number(childText(node, 'duration') || 0);
      } else if (name === 'forward') {
        cursor += Number(childText(node, 'duration') || 0);
      }
      if (cursor > length) length = cursor;
    }
    return {
      order: index + 1,
      printed: measure.getAttribute('number') ?? String(index + 1),
      divisions,
      length,
      fifths,
      transposeOctave,
      notes,
      harmony,
      element: measure,
    };
  });
}

/** Chord sounding at an onset, carrying the last chord across bars of the same part. */
export function chordAt(views: readonly PcMeasureView[], order: number, onset: number): PcChord | null {
  for (let i = order - 1; i >= 0; i--) {
    const view = views[i]!;
    const candidates = view.harmony.filter((h) => i < order - 1 || h.onset <= onset);
    if (candidates.length) return candidates[candidates.length - 1]!.chord;
  }
  return null;
}

/** Validate a document-order span against every part. Returns printed numbers for reporting. */
export function resolveSpan(doc: Document, span: PcSpan): PcBarRef[] {
  const parts = partElements(doc);
  const count = elementChildren(parts[0]!, 'measure').length;
  for (const part of parts) {
    const n = elementChildren(part, 'measure').length;
    if (n !== count) throw new Error(`parts have different bar counts (${count} vs ${n})`);
  }
  if (!Number.isInteger(span.from) || !Number.isInteger(span.to)) throw new Error('span bars must be whole numbers');
  if (span.from < 1 || span.to > count || span.from > span.to) {
    throw new Error(`span ${span.from}–${span.to} is outside the score's ${count} bars`);
  }
  const measures = elementChildren(parts[0]!, 'measure');
  const out: PcBarRef[] = [];
  for (let order = span.from; order <= span.to; order++) {
    out.push({ order, printed: measures[order - 1]!.getAttribute('number') ?? String(order) });
  }
  return out;
}

/**
 * Default lane: first part named guitar (else the first part).
 * Voice: smallest number ≥ 2 unused in that part inside the span (whole part if no span).
 */
export function chooseLane(doc: Document, partId?: string, span?: PcSpan): PcLane {
  const parts = partElements(doc);
  const names = new Map<string, string>();
  for (const sp of doc.getElementsByTagName('score-part')) {
    names.set(sp.getAttribute('id') ?? '', sp.getElementsByTagName('part-name')[0]?.textContent ?? '');
  }
  const part = partId
    ? parts.find((p) => p.getAttribute('id') === partId)
    : parts.find((p) => /guitar|gtr/i.test(`${names.get(p.getAttribute('id') ?? '')} ${p.getAttribute('id')}`)) ?? parts[0];
  if (!part) throw new Error(`part ${partId} not found`);
  const used = new Set<number>();
  let staff: string | undefined;
  elementChildren(part, 'measure').forEach((measure, index) => {
    const order = index + 1;
    const inSpan = !span || (order >= span.from && order <= span.to);
    for (const note of elementChildren(measure, 'note')) {
      const s = elementChildren(note, 'staff')[0]?.textContent?.trim();
      if (s && !staff) staff = s;
      if (!inSpan) continue;
      const v = Number(elementChildren(note, 'voice')[0]?.textContent ?? 1);
      if (Number.isFinite(v)) used.add(v);
    }
  });
  let voice = 2;
  while (used.has(voice)) voice += 1;
  if (voice > 4) {
    throw new Error('no free voice (1–4) in that part inside the span; choose fewer bars');
  }
  return { partId: part.getAttribute('id') ?? '', voice: String(voice), staff };
}

/**
 * Exact regrid: multiply every division-unit value in one part by k (<divisions>, <duration>, <offset>).
 * Rhythm, pitch and layout are unchanged; only the counting unit is finer.
 */
export function scalePartDivisions(part: Element, k: number): void {
  if (k === 1) return;
  for (const name of ['divisions', 'duration', 'offset']) {
    for (const node of part.getElementsByTagName(name)) {
      const n = Number(node.textContent);
      if (!Number.isFinite(n)) continue;
      while (node.firstChild) node.removeChild(node.firstChild);
      node.appendChild(node.ownerDocument!.createTextNode(String(n * k)));
    }
  }
}

export function partById(doc: Document, partId: string): Element {
  const part = partElements(doc).find((p) => p.getAttribute('id') === partId);
  if (!part) throw new Error(`part ${partId} not found`);
  return part;
}

/** Sounding pitches of every other lane-relevant note in [start, end) of one measure. */
export function soundingDuring(view: PcMeasureView, start: number, end: number, exceptVoice?: string): number[] {
  const out: number[] = [];
  for (const n of view.notes) {
    if (n.rest || n.voice === exceptVoice) continue;
    if (n.onset < end && n.onset + n.ticks > start) out.push(...n.midis);
  }
  return out;
}

const AFTER_VOICE = ['type', 'dot', 'accidental', 'time-modification', 'stem', 'notehead', 'notehead-text', 'staff', 'beam', 'notations', 'lyric', 'play', 'listen'];

/**
 * Spell out the MusicXML default voice: a <note> with no <voice> is voice 1.
 * Musically a no-op; makes a measure with an added voice unambiguous for every reader.
 */
export function ensureExplicitVoice(measure: Element): number {
  let added = 0;
  for (const note of elementChildren(measure, 'note')) {
    if (elementChildren(note, 'voice').length) continue;
    const voice = note.ownerDocument!.createElement('voice');
    voice.appendChild(note.ownerDocument!.createTextNode('1'));
    const before = elementChildren(note).find((c) => AFTER_VOICE.includes(c.nodeName)) ?? null;
    note.insertBefore(voice, before);
    added += 1;
  }
  return added;
}
