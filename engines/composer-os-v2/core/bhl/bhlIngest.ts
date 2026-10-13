/**
 * BHL iteration 1 — read a partwise MusicXML source into lockable events.
 * Parsing is `parseScoreDocument` / `measureViews` / `absTimeline` only.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { absTimeline } from '../performance-composer/pcRespond';
import {
  elementChildren,
  measureViews,
  parseScoreDocument,
  partById,
  partElements,
  partNames,
  resolveSpan,
  type PcTimedNote,
} from '../performance-composer/pcScore';
import type {
  BhlLockMap,
  BhlLockSpec,
  BhlMetreLock,
  BhlSoundingBass,
  BhlSourceEvent,
  BhlSpan,
  BhlTempoLock,
  BhlTextLock,
} from './bhlTypes';

export interface BhlIngestRequest {
  sourcePath: string;
  span: BhlSpan;
  protectedGuitarBars?: readonly number[];
  bassPartId?: string;
  guitarPartId?: string;
}

export function sha256Buffer(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function sha256File(filePath: string): string {
  return sha256Buffer(fs.readFileSync(filePath));
}

function textOf(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

function statedTime(measure: Element): { beats: number; beatType: number } | null {
  for (const attributes of elementChildren(measure, 'attributes')) {
    const time = elementChildren(attributes, 'time')[0];
    if (!time) continue;
    const beats = Number(textOf(time, 'beats'));
    const beatType = Number(textOf(time, 'beat-type'));
    if (beats > 0 && beatType > 0) return { beats, beatType };
  }
  return null;
}

function statedTempo(measure: Element): Pick<BhlTempoLock, 'beatUnit' | 'perMinute' | 'soundTempo'> | null {
  const metro = measure.getElementsByTagName('metronome')[0] as Element | undefined;
  const beatUnit = metro ? textOf(metro, 'beat-unit') || null : null;
  const perMinute = metro ? textOf(metro, 'per-minute') || null : null;
  let soundTempo: string | null = null;
  for (const sound of measure.getElementsByTagName('sound')) {
    const tempo = (sound as Element).getAttribute('tempo');
    if (tempo) soundTempo = tempo;
  }
  if (!beatUnit && !perMinute && !soundTempo) return null;
  return { beatUnit, perMinute, soundTempo };
}

/** Attack-aligned tie flags, including `<tied>`, which `measureViews` does not read. */
function attackTies(measure: Element): Array<{ tieStart: boolean; tieStop: boolean }> {
  const out: Array<{ tieStart: boolean; tieStop: boolean }> = [];
  for (const node of elementChildren(measure)) {
    if (node.nodeName !== 'note') continue;
    if (elementChildren(node, 'grace').length) continue;
    if (elementChildren(node, 'chord').length) continue;
    const tags = [...node.getElementsByTagName('tie'), ...node.getElementsByTagName('tied')] as Element[];
    out.push({
      tieStart: tags.some((tag) => tag.getAttribute('type') === 'start'),
      tieStop: tags.some((tag) => tag.getAttribute('type') === 'stop'),
    });
  }
  return out;
}

function eventsForPart(partId: string, part: Element, span: BhlSpan, onlyBars: ReadonlySet<number> | null): BhlSourceEvent[] {
  const views = measureViews(part);
  const out: BhlSourceEvent[] = [];
  for (const view of views) {
    if (view.order < span.from || view.order > span.to) continue;
    if (onlyBars && !onlyBars.has(view.order)) continue;
    const ties = attackTies(view.element);
    if (ties.length !== view.notes.length) {
      throw new Error(`part ${partId} bar ${view.order}: tie walk ${ties.length} != ${view.notes.length} attacks`);
    }
    view.notes.forEach((note: PcTimedNote, index) => {
      const tie = ties[index]!;
      out.push({
        partId,
        bar: view.order,
        voice: note.voice,
        onsetTicks: note.onset,
        ticks: note.ticks,
        divisions: view.divisions,
        onsetQuarters: note.onset / view.divisions,
        quarters: note.ticks / view.divisions,
        rest: note.rest,
        midis: [...note.midis],
        tieStart: tie.tieStart,
        tieStop: tie.tieStop,
      });
    });
  }
  return out;
}

function metresFor(partId: string, part: Element, span: BhlSpan): BhlMetreLock[] {
  let beats = 4;
  let beatType = 4;
  const out: BhlMetreLock[] = [];
  const measures = elementChildren(part, 'measure');
  for (let index = 0; index < measures.length; index++) {
    const stated = statedTime(measures[index]!);
    if (stated) {
      beats = stated.beats;
      beatType = stated.beatType;
    }
    const bar = index + 1;
    if (bar < span.from || bar > span.to) continue;
    out.push({ partId, bar, beats, beatType, stated: stated !== null });
  }
  return out;
}

function temposFor(doc: Document, span: BhlSpan): BhlTempoLock[] {
  const parts = partElements(doc);
  const measures = parts.map((part) => elementChildren(part, 'measure'));
  const count = measures[0]?.length ?? 0;
  let current: BhlTempoLock = {
    bar: 0,
    beatUnit: null,
    perMinute: null,
    soundTempo: null,
    statedAtBar: null,
    statedOnPartId: null,
  };
  const out: BhlTempoLock[] = [];
  for (let index = 0; index < count; index++) {
    const bar = index + 1;
    for (let pi = 0; pi < parts.length; pi++) {
      const stated = statedTempo(measures[pi]![index]!);
      if (!stated) continue;
      current = {
        bar,
        beatUnit: stated.beatUnit ?? current.beatUnit,
        perMinute: stated.perMinute ?? current.perMinute,
        soundTempo: stated.soundTempo ?? current.soundTempo,
        statedAtBar: bar,
        statedOnPartId: parts[pi]!.getAttribute('id') ?? '',
      };
    }
    if (bar < span.from || bar > span.to) continue;
    out.push({ ...current, bar });
  }
  return out;
}

function textsFor(partId: string, part: Element, span: BhlSpan): { rehearsal: BhlTextLock[]; structural: BhlTextLock[] } {
  const rehearsal: BhlTextLock[] = [];
  const structural: BhlTextLock[] = [];
  const measures = elementChildren(part, 'measure');
  for (let index = 0; index < measures.length; index++) {
    const bar = index + 1;
    if (bar < span.from || bar > span.to) continue;
    const measure = measures[index]!;
    for (const el of measure.getElementsByTagName('rehearsal')) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text) rehearsal.push({ partId, bar, kind: 'rehearsal', text });
    }
    for (const el of measure.getElementsByTagName('words')) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text) structural.push({ partId, bar, kind: 'words', text });
    }
    if (measure.getElementsByTagName('segno').length) structural.push({ partId, bar, kind: 'segno', text: 'segno' });
    if (measure.getElementsByTagName('coda').length) structural.push({ partId, bar, kind: 'coda', text: 'coda' });
    for (const el of measure.getElementsByTagName('ending')) {
      structural.push({ partId, bar, kind: 'ending', text: (el as Element).getAttribute('number') ?? '' });
    }
    for (const el of measure.getElementsByTagName('repeat')) {
      structural.push({ partId, bar, kind: 'repeat', text: (el as Element).getAttribute('direction') ?? '' });
    }
  }
  return { rehearsal, structural };
}

function resolveRole(doc: Document, role: 'guitar' | 'bass', explicit?: string): string {
  if (explicit) return partById(doc, explicit).getAttribute('id') ?? explicit;
  const names = partNames(doc);
  const pattern = role === 'bass' ? /bass|cello|contrabass/i : /guitar|gtr/i;
  const part = partElements(doc).find((candidate) => {
    const id = candidate.getAttribute('id') ?? '';
    return pattern.test(`${names.get(id) ?? ''} ${id}`);
  });
  if (!part) throw new Error(`no ${role} part`);
  return part.getAttribute('id') ?? '';
}

export function extractBhlSnapshot(xml: string, request: Omit<BhlIngestRequest, 'sourcePath'>): Omit<BhlLockMap, 'sourcePath' | 'sourceSha256'> {
  const doc = parseScoreDocument(xml);
  const span = request.span;
  resolveSpan(doc, span);
  const bassPartId = resolveRole(doc, 'bass', request.bassPartId);
  const guitarPartId = resolveRole(doc, 'guitar', request.guitarPartId);
  const barCount = elementChildren(partById(doc, guitarPartId), 'measure').length;
  const protectedGuitarBars = [...(request.protectedGuitarBars ?? [])];
  for (const bar of protectedGuitarBars) {
    if (!Number.isInteger(bar) || bar < 1 || bar > barCount) throw new Error(`protected guitar bar ${bar} outside score`);
  }
  const guitarSet = new Set(protectedGuitarBars);
  const guitarSpan: BhlSpan =
    protectedGuitarBars.length === 0
      ? span
      : { from: Math.min(span.from, ...protectedGuitarBars), to: Math.max(span.to, ...protectedGuitarBars) };
  const rehearsal: BhlTextLock[] = [];
  const structural: BhlTextLock[] = [];
  const metres: BhlMetreLock[] = [];
  for (const part of partElements(doc)) {
    const id = part.getAttribute('id') ?? '';
    const texts = textsFor(id, part, span);
    rehearsal.push(...texts.rehearsal);
    structural.push(...texts.structural);
    metres.push(...metresFor(id, part, span));
  }
  const timeline = absTimeline(doc, guitarPartId, '1');
  const spanStart = timeline.barStart[span.from - 1];
  const spanEnd = timeline.barStart[span.to - 1]! + timeline.barLen[span.to - 1]!;
  if (spanStart === undefined) throw new Error(`span ${span.from}–${span.to} has no timeline`);
  const soundingBass: BhlSoundingBass[] = timeline.bass
    .filter((note) => note.start < spanEnd - 1e-9 && note.end > spanStart + 1e-9)
    .map((note) => ({ startQuarters: note.start, endQuarters: note.end, midi: note.midi }));
  return {
    span,
    bassPartId,
    guitarPartId,
    protectedGuitarBars,
    bass: eventsForPart(bassPartId, partById(doc, bassPartId), span, null),
    guitar: eventsForPart(guitarPartId, partById(doc, guitarPartId), guitarSpan, guitarSet),
    metres,
    tempos: temposFor(doc, span),
    rehearsal,
    structural,
    soundingBass,
  };
}

export function ingestBhlSource(request: BhlIngestRequest): BhlLockMap {
  const bytes = fs.readFileSync(request.sourcePath);
  const sourceSha256 = sha256Buffer(bytes);
  const snapshot = extractBhlSnapshot(bytes.toString('utf8'), request);
  return { ...snapshot, sourcePath: request.sourcePath, sourceSha256 };
}

export function lockSpecOf(lock: BhlLockSpec): BhlLockSpec {
  return {
    span: { from: lock.span.from, to: lock.span.to },
    bassPartId: lock.bassPartId,
    guitarPartId: lock.guitarPartId,
    protectedGuitarBars: [...lock.protectedGuitarBars],
  };
}
