/**
 * BHL iteration 2 — replace guitar notes inside a span.
 * Bytes outside those measures stay untouched. Attributes, directions,
 * rehearsal marks and barlines inside the measure stay in place.
 */

import { notateTicks } from '../performance-composer/pcLane';
import { parseChordLabel, spellForChord } from '../performance-composer/pcChord';
import { elementChildren, measureViews, parseScoreDocument, partById } from '../performance-composer/pcScore';
import type { BhlGuitarEvent } from './bhlPhrase';

export interface BhlHarmonyChange {
  bar: number;
  label: string;
  action: 'kept' | 'removed';
  reason: string;
}

export interface BhlGuitarWrite {
  xml: string;
  harmony: BhlHarmonyChange[];
  outsideIdentical: boolean;
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

const ACCIDENTAL: Record<number, string> = { [-2]: 'flat-flat', [-1]: 'flat', 1: 'sharp', 2: 'double-sharp' };

function noteXml(
  midi: number | null,
  piece: { ticks: number; type: string; dots: number },
  fifths: number,
  chord: boolean,
  voice: '1' | '2' | null,
): string {
  const lines = ['<note>'];
  if (chord) lines.push('<chord/>');
  let accidental = '';
  if (midi === null) {
    lines.push('<rest/>');
  } else {
    const spelling = spellForChord(midi, null, fifths);
    lines.push('<pitch>');
    lines.push(`<step>${spelling.step}</step>`);
    if (spelling.alter) lines.push(`<alter>${spelling.alter}</alter>`);
    lines.push(`<octave>${spelling.octave}</octave>`);
    lines.push('</pitch>');
    accidental = ACCIDENTAL[spelling.alter] ?? '';
  }
  lines.push(`<duration>${piece.ticks}</duration>`);
  if (voice) lines.push(`<voice>${voice}</voice>`);
  lines.push(`<type>${piece.type}</type>`);
  if (piece.dots) lines.push('<dot/>');
  if (accidental) lines.push(`<accidental>${accidental}</accidental>`);
  lines.push('</note>');
  return lines.join('');
}

function layVoice(
  mine: readonly BhlGuitarEvent[],
  bar: number,
  quarters: number,
  divisions: number,
  fifths: number,
  voice: '1' | '2' | null,
): string {
  const length = quarters * divisions;
  let cursor = 0;
  const chunks: string[] = [];
  const pushRest = (ticks: number) => {
    if (ticks <= 0) return;
    for (const piece of notateTicks(ticks, divisions)) chunks.push(noteXml(null, piece, fifths, false, voice));
  };
  const ordered = mine.slice().sort((a, b) => a.onsetQuarters - b.onsetQuarters);
  for (const event of ordered) {
    const start = event.onsetQuarters * divisions;
    const ticks = event.quarters * divisions;
    if (!Number.isInteger(start) || !Number.isInteger(ticks)) {
      throw new Error(`bar ${bar} event ${event.onsetQuarters}+${event.quarters} misses the division grid`);
    }
    if (start < cursor) throw new Error(`bar ${bar} guitar events overlap at ${event.onsetQuarters}`);
    if (start > cursor) pushRest(start - cursor);
    const midis = [...event.midis].sort((a, b) => a - b);
    for (const piece of notateTicks(ticks, divisions)) {
      midis.forEach((midi, index) => chunks.push(noteXml(midi, piece, fifths, index > 0, voice)));
    }
    cursor = start + ticks;
  }
  if (cursor < length) pushRest(length - cursor);
  if (cursor > length) throw new Error(`bar ${bar} guitar runs past the bar`);
  return chunks.join('');
}

function eventsToNotes(events: readonly BhlGuitarEvent[], bar: number, quarters: number, divisions: number, fifths: number): string {
  const mine = events.filter((event) => event.bar === bar);
  const length = quarters * divisions;
  if (!Number.isInteger(length)) throw new Error(`bar ${bar} length is not an integer tick count`);
  const counter = mine.filter((event) => event.voice === '2');
  if (!counter.length) return layVoice(mine, bar, quarters, divisions, fifths, null);
  const lead = layVoice(
    mine.filter((event) => event.voice !== '2'),
    bar,
    quarters,
    divisions,
    fifths,
    '1',
  );
  const answer = layVoice(counter, bar, quarters, divisions, fifths, '2');
  return `${lead}<backup><duration>${length}</duration></backup>${answer}`;
}

function harmonyLabels(measureXml: string): string[] {
  const labels: string[] = [];
  const pattern = /<harmony\b[\s\S]*?<\/harmony>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(measureXml))) {
    const root = /<root-step>([^<]*)<\/root-step>/.exec(match[0]);
    const alter = /<root-alter>(-?\d+)<\/root-alter>/.exec(match[0]);
    const text = /<kind\b[^>]*text="([^"]*)"/.exec(match[0]);
    const kind = /<kind\b[^>]*>([^<]*)<\/kind>/.exec(match[0]);
    if (!root) continue;
    const accidental = alter?.[1] === '1' ? '#' : alter?.[1] === '-1' ? 'b' : '';
    const quality = text?.[1] ?? (kind?.[1] === 'major' ? '' : kind?.[1] ?? '');
    labels.push(`${root[1]}${accidental}${quality}`);
  }
  return labels;
}

function symbolAgrees(label: string, events: readonly BhlGuitarEvent[], bar: number): { ok: boolean; reason: string } {
  let chord;
  try {
    chord = parseChordLabel(label);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unreadable symbol' };
  }
  if (!chord) return { ok: false, reason: 'empty symbol' };
  if (chord.label.toLowerCase().includes('maj7#11') || label.toLowerCase().includes('maj7#11')) {
    return { ok: false, reason: 'maj7#11 is outside the BHL plan' };
  }
  const pcs = new Set(events.filter((event) => event.bar === bar).flatMap((event) => event.pitchClasses));
  if (!pcs.size) return { ok: false, reason: 'no new guitar pitches under this symbol' };
  const allowed = new Set([...chord.chordPcs, ...chord.fieldPcs]);
  const outside = [...pcs].filter((pitchClass) => !allowed.has(pitchClass));
  const chordTones = [...pcs].filter((pitchClass) => chord.chordPcs.includes(pitchClass));
  if (outside.length || chordTones.length < 2) {
    return {
      ok: false,
      reason: `guitar pitch classes ${[...pcs].map(mod12).join(',')} disagree with ${label}`,
    };
  }
  return { ok: true, reason: `${label} still names the guitar pitches` };
}

export function replaceBhlGuitar(
  sourceXml: string,
  guitarPartId: string,
  writableBars: readonly number[],
  events: readonly BhlGuitarEvent[],
  barQuarters: ReadonlyMap<number, number>,
): BhlGuitarWrite {
  const doc = parseScoreDocument(sourceXml);
  const views = measureViews(partById(doc, guitarPartId));
  const open = `<part id="${guitarPartId}">`;
  const start = sourceXml.indexOf(open);
  if (start < 0) throw new Error(`missing ${open}`);
  const end = sourceXml.indexOf('</part>', start);
  const part = sourceXml.slice(start, end);
  const harmony: BhlHarmonyChange[] = [];
  let built = '';
  let cursor = 0;
  let order = 0;
  while (cursor < part.length) {
    const at = part.indexOf('<measure', cursor);
    if (at < 0) {
      built += part.slice(cursor);
      break;
    }
    built += part.slice(cursor, at);
    const close = part.indexOf('</measure>', at);
    if (close < 0) throw new Error('unclosed measure');
    const measure = part.slice(at, close + '</measure>'.length);
    order += 1;
    if (!writableBars.includes(order)) {
      built += measure;
      cursor = close + '</measure>'.length;
      continue;
    }
    const view = views[order - 1];
    if (!view) throw new Error(`bar ${order} missing from guitar part`);
    const quarters = barQuarters.get(order);
    if (!quarters) throw new Error(`bar ${order} has no metre length`);
    const labels = harmonyLabels(measure);
    let dropHarmony = false;
    if (!labels.length) {
      /* no symbol to keep */
    } else {
      for (const label of labels) {
        const decision = symbolAgrees(label, events, order);
        harmony.push({ bar: order, label, action: decision.ok ? 'kept' : 'removed', reason: decision.reason });
        if (!decision.ok) dropHarmony = true;
      }
    }
    let body = measure.replace(/<note\b[\s\S]*?<\/note>/g, '');
    if (dropHarmony) body = body.replace(/<harmony\b[\s\S]*?<\/harmony>/g, '');
    const notes = eventsToNotes(events, order, quarters, view.divisions, view.fifths);
    if (!body.includes('</measure>')) throw new Error(`bar ${order} lost its close tag`);
    built += body.replace('</measure>', `${notes}</measure>`);
    cursor = close + '</measure>'.length;
  }
  const xml = sourceXml.slice(0, start) + built + sourceXml.slice(end);
  return { xml, harmony, outsideIdentical: outsideSpanIdentical(sourceXml, xml, guitarPartId, writableBars) };
}

function measureList(xml: string, partId: string): string[] {
  const open = `<part id="${partId}">`;
  const start = xml.indexOf(open);
  const end = xml.indexOf('</part>', start);
  const part = xml.slice(start, end);
  const measures: string[] = [];
  let cursor = 0;
  while (cursor < part.length) {
    const at = part.indexOf('<measure', cursor);
    if (at < 0) break;
    const close = part.indexOf('</measure>', at);
    measures.push(part.slice(at, close + '</measure>'.length));
    cursor = close + '</measure>'.length;
  }
  return measures;
}

export function outsideSpanIdentical(
  sourceXml: string,
  candidateXml: string,
  guitarPartId: string,
  writableBars: readonly number[],
): boolean {
  const sourceDoc = parseScoreDocument(sourceXml);
  const candidateDoc = parseScoreDocument(candidateXml);
  const sourceParts = elementChildren(sourceDoc.documentElement, 'part');
  const candidateParts = elementChildren(candidateDoc.documentElement, 'part');
  if (sourceParts.length !== candidateParts.length) return false;
  for (let index = 0; index < sourceParts.length; index++) {
    const partId = sourceParts[index]!.getAttribute('id') ?? '';
    if ((candidateParts[index]!.getAttribute('id') ?? '') !== partId) return false;
    const left = measureList(sourceXml, partId);
    const right = measureList(candidateXml, partId);
    if (left.length !== right.length) return false;
    for (let bar = 0; bar < left.length; bar++) {
      const writable = partId === guitarPartId && writableBars.includes(bar + 1);
      if (writable) continue;
      if (left[bar] !== right[bar]) return false;
    }
  }
  const sourceHead = sourceXml.slice(0, sourceXml.indexOf('<part '));
  const candidateHead = candidateXml.slice(0, candidateXml.indexOf('<part '));
  return sourceHead === candidateHead;
}
