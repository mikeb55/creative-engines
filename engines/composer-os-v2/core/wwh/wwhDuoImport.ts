/**
 * Read both guitar and bass parts from a partwise MusicXML score.
 * Does not write the source file. Odd bar counts and meter changes stay intact.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { WWH_DIVISIONS } from './wwhPerformanceTypes';

export interface WwhImportedNote {
  rest: boolean;
  chord: boolean;
  duration: number;
  step?: string;
  alter?: number;
  octave?: number;
  voice: string;
}

export interface WwhImportedMeasure {
  order: number;
  number: string;
  beats: number;
  beatType: number;
  divisions: number;
  rehearsal: string[];
  words: string[];
  harmony: string[];
  notes: WwhImportedNote[];
  element: Element;
}

export interface WwhImportedPart {
  id: string;
  name: string;
  measures: WwhImportedMeasure[];
}

export interface WwhDuoScore {
  title: string;
  movementTitle: string;
  composer: string;
  guitar: WwhImportedPart;
  bass: WwhImportedPart;
}

function localName(el: Element): string {
  return el.localName || el.tagName || '';
}

function children(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  const list = parent.childNodes;
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    if (!node || node.nodeType !== 1) continue;
    const el = node as Element;
    if (!name || localName(el) === name) out.push(el);
  }
  return out;
}

function textOf(parent: Element | null, name: string): string {
  if (!parent) return '';
  for (const child of children(parent, name)) {
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function allByName(root: Element, name: string): Element[] {
  const out: Element[] = [];
  const walk = (el: Element) => {
    if (localName(el) === name) out.push(el);
    for (const child of children(el)) walk(child);
  };
  walk(root);
  return out;
}

function harmonyLabel(harmony: Element): string {
  const root = children(harmony, 'root')[0];
  const step = textOf(root ?? null, 'root-step');
  const alter = textOf(root ?? null, 'root-alter');
  const kind = children(harmony, 'kind')[0];
  const kindText = kind?.getAttribute('text') || kind?.textContent?.trim() || '';
  const alt = alter === '-1' ? 'b' : alter === '1' ? '#' : '';
  const bass = children(harmony, 'bass')[0];
  const bassStep = textOf(bass ?? null, 'bass-step');
  const bassAlter = textOf(bass ?? null, 'bass-alter');
  const bassBit = bassStep
    ? `/${bassAlter === '-1' ? 'b' : bassAlter === '1' ? '#' : ''}${bassStep}`
    : '';
  return `${step}${alt}${kindText}${bassBit}`.trim();
}

function parseNotes(measure: Element): WwhImportedNote[] {
  return children(measure, 'note').map((note) => {
    const pitch = children(note, 'pitch')[0];
    const alterRaw = textOf(pitch ?? null, 'alter');
    return {
      rest: children(note, 'rest').length > 0 || !pitch,
      chord: children(note, 'chord').length > 0,
      duration: Number(textOf(note, 'duration') || '0'),
      step: textOf(pitch ?? null, 'step') || undefined,
      alter: alterRaw === '' ? 0 : Number(alterRaw),
      octave: textOf(pitch ?? null, 'octave') ? Number(textOf(pitch ?? null, 'octave')) : undefined,
      voice: textOf(note, 'voice') || '1',
    };
  });
}

function partRole(name: string, id: string, index: number, count: number): 'guitar' | 'bass' | 'other' {
  const blob = `${name} ${id}`.toLowerCase();
  if (/bass/.test(blob)) return 'bass';
  if (/guitar|gtr/.test(blob)) return 'guitar';
  if (count === 2 && index === 0) return 'guitar';
  if (count === 2 && index === 1) return 'bass';
  return 'other';
}

export function importWwhDuoMusicXml(xml: string): WwhDuoScore {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  if (!root || localName(root) !== 'score-partwise') {
    throw new Error('WWH import expects score-partwise MusicXML');
  }
  const parserError = allByName(root, 'parsererror');
  if (parserError.length) throw new Error('MusicXML parse failed');

  const names = new Map<string, string>();
  for (const scorePart of children(root, 'part-list').flatMap((list) => children(list, 'score-part'))) {
    names.set(scorePart.getAttribute('id') || '', textOf(scorePart, 'part-name'));
  }

  const parts: WwhImportedPart[] = children(root, 'part').map((part) => {
    let divisions = WWH_DIVISIONS;
    let beats = 4;
    let beatType = 4;
    const measures = children(part, 'measure').map((measure, order) => {
      const attributes = children(measure, 'attributes')[0];
      if (attributes) {
        const nextDiv = Number(textOf(attributes, 'divisions'));
        if (Number.isFinite(nextDiv) && nextDiv > 0) divisions = nextDiv;
        const time = children(attributes, 'time')[0];
        if (time) {
          const nextBeats = Number(textOf(time, 'beats'));
          const nextType = Number(textOf(time, 'beat-type'));
          if (nextBeats > 0) beats = nextBeats;
          if (nextType > 0) beatType = nextType;
        }
      }
      return {
        order,
        number: measure.getAttribute('number') || String(order + 1),
        beats,
        beatType,
        divisions,
        rehearsal: allByName(measure, 'rehearsal')
          .map((el) => el.textContent?.trim() || '')
          .filter(Boolean),
        words: allByName(measure, 'words')
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean),
        harmony: allByName(measure, 'harmony').map(harmonyLabel),
        notes: parseNotes(measure),
        element: measure,
      };
    });
    const id = part.getAttribute('id') || '';
    return { id, name: names.get(id) || id, measures };
  });

  if (parts.length < 2) throw new Error(`WWH duo import needs two parts, found ${parts.length}`);
  const guitar = parts.find((part, index) => partRole(part.name, part.id, index, parts.length) === 'guitar');
  const bass = parts.find((part, index) => partRole(part.name, part.id, index, parts.length) === 'bass');
  if (!guitar || !bass) throw new Error('WWH duo import could not assign guitar and bass parts');
  if (guitar.measures.length !== bass.measures.length) {
    throw new Error(
      `guitar/bass bar count mismatch ${guitar.measures.length} vs ${bass.measures.length}`
    );
  }
  return {
    title: textOf(children(root, 'work')[0] ?? null, 'work-title') || 'Untitled',
    movementTitle: textOf(root, 'movement-title'),
    composer: (() => {
      const creators = allByName(root, 'creator');
      return creators.map((el) => el.textContent?.trim() || '').find(Boolean) || '';
    })(),
    guitar,
    bass,
  };
}

export function serializeMeasure(measure: Element): string {
  return new XMLSerializer().serializeToString(measure);
}

export function pitchFingerprint(measures: readonly WwhImportedMeasure[]): string {
  return measures
    .map((measure) =>
      measure.notes
        .filter((note) => !note.rest)
        .map((note) => `${note.step}${note.alter ?? 0}${note.octave}`)
        .join('.')
    )
    .join('|');
}
