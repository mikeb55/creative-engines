/**
 * Canonical evaluation score.
 * Generalises the BHL rational walk. Describes the file. Does not judge it.
 */

import { createHash } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { midiOfPitch } from '../performance-composer/pcChord';
import { elementChildren, partElements, partNames } from '../performance-composer/pcScore';
import {
  formatRational,
  q,
  qAdd,
  qEq,
  type Rational,
} from '../bhl/bhlEvidence';

export const CANONICAL_SCORE_VERSION = 'canonical-evaluation-score-1';

export type InstrumentRole =
  | 'guitar'
  | 'bass'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'piano'
  | 'voice'
  | 'wind'
  | 'brass'
  | 'flute'
  | 'oboe'
  | 'clarinet'
  | 'bassoon'
  | 'horn'
  | 'trumpet'
  | 'trombone'
  | 'tuba'
  | 'saxophone'
  | 'harp'
  | 'percussion'
  | 'synth'
  | 'other';

export interface WrittenPitch {
  step: string;
  alter: number;
  octave: number;
  midi: number;
}

export interface Transposition {
  chromatic: number;
  octaveChange: number;
  /** Strict source only. Null when the file omits `<diatonic>`. */
  diatonic?: number | null;
  /** Strict source only. Null means every staff. */
  staff?: string | null;
}

export interface TupletRatio {
  actualNotes: number;
  normalNotes: number;
}

export interface CanonicalEvent {
  id: string;
  partId: string;
  partName: string;
  instrument: string;
  role: InstrumentRole;
  voice: string;
  bar: number;
  printedBar: string;
  onset: Rational;
  onsetInBar: Rational;
  duration: Rational;
  rest: boolean;
  chord: boolean;
  written: WrittenPitch | null;
  soundingMidi: number | null;
  transposition: Transposition;
  tieStart: boolean;
  tieStop: boolean;
  tuplet: TupletRatio | null;
  staff: string | null;
  /** Sounding timeline only: source ids folded by a tie. */
  sourceEventIds: string[];
  /** Strict source only. 1-based among placed notes and rests in the part. */
  noteOrdinal?: number;
  /** Strict source only. MusicXML `id` when the file has one. */
  xmlId?: string | null;
  /** Strict source only. 0-based member inside one written chord. */
  chordMember?: number;
  /** Strict source only. Shared by fragments of one validated tie chain. */
  tieChainId?: string | null;
  /** Strict source only. */
  tupletGroupId?: string | null;
}

export interface CanonicalMeasure {
  bar: number;
  printedBar: string;
  partId: string;
  beats: number;
  beatType: number;
  divisions: number;
  expected: Rational;
  implicit: boolean;
  pickup: boolean;
  /** Strict source only. Additive groups in denominator units. Omitted for a simple signature. */
  beatGroups?: readonly number[];
  /** Strict source only. Quarters added before the next measure. Pickup uses the sounding span. */
  advance?: Rational;
  /** Strict source only. The bar has no usable metre. */
  metreRejected?: boolean;
}

export interface CanonicalPart {
  id: string;
  name: string;
  role: InstrumentRole;
  transposition: Transposition;
}

export interface CanonicalDirection {
  id: string;
  kind: 'rehearsal' | 'expression' | 'tempo' | 'dynamic';
  bar: number;
  partId: string;
  instrument: string;
  onsetInBar: Rational;
  text: string;
  /** Strict source only. `<sound tempo>` in quarters per minute. */
  playbackBpm?: number | null;
}

export interface CanonicalHarmonyMark {
  id: string;
  bar: number;
  partId: string;
  instrument: string;
  onsetInBar: Rational;
  text: string;
  /** Strict source only. */
  rootStep?: string;
  rootAlter?: number;
  kindValue?: string;
  bassStep?: string | null;
  bassAlter?: number | null;
}

export interface CanonicalRepeat {
  id: string;
  bar: number;
  partId: string;
  direction: 'forward' | 'backward' | null;
  times: string | null;
  ending: string | null;
  /** Written order is kept. Repeats are not expanded. */
  expanded: false;
}

export interface UnsupportedConstruct {
  kind: string;
  bar: number;
  partId: string;
  instrument: string;
  onsetInBar: Rational | null;
  detail: string;
}

export interface CanonicalEvaluationScore {
  version: typeof CANONICAL_SCORE_VERSION;
  sha256: string;
  partwise: true;
  parts: CanonicalPart[];
  measures: CanonicalMeasure[];
  /** One row per parsed note or rest, ties not merged. */
  sourceEvents: CanonicalEvent[];
  /** Ties merged the same way as `readBhlEvidence`. */
  soundingEvents: CanonicalEvent[];
  directions: CanonicalDirection[];
  harmony: CanonicalHarmonyMark[];
  repeats: CanonicalRepeat[];
  unsupported: UnsupportedConstruct[];
  /** Present only for an opt-in strict-source read. */
  strictSource?: true;
}

export interface CanonicalIngest {
  sha256: string;
  score: CanonicalEvaluationScore | null;
  parseError: string | null;
  rootName: string | null;
}

export interface CanonicalIngestOptions {
  /**
   * E2 strict source. Off by default.
   * Legacy placement, offsets, ties and harmony text stay on the default path.
   */
  strictSource?: boolean;
}

const DYNAMIC_NAMES = new Set([
  'p', 'pp', 'ppp', 'pppp', 'f', 'ff', 'fff', 'ffff', 'mp', 'mf', 'sf', 'sfz', 'fp', 'fz', 'rf', 'rfz',
]);

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function roleOf(name: string): InstrumentRole {
  const text = name.trim();
  if (/synth/i.test(text)) return 'synth';
  if (/sax/i.test(text)) return 'saxophone';
  if (/flute|piccolo/i.test(text)) return 'flute';
  if (/english\s*horn|recorder/i.test(text)) return 'wind';
  if (/oboe/i.test(text)) return 'oboe';
  if (/clarinet/i.test(text)) return 'clarinet';
  if (/bassoon/i.test(text)) return 'bassoon';
  if (/trumpet|cornet/i.test(text)) return 'trumpet';
  if (/flugel/i.test(text)) return 'brass';
  if (/trombone/i.test(text)) return 'trombone';
  if (/tuba/i.test(text)) return 'tuba';
  if (/\bhorn\b/i.test(text)) return 'horn';
  if (/\bharp\b/i.test(text)) return 'harp';
  if (/timpani|percussion|drum|cymbal|glockenspiel|vibraphone|xylophone|marimba|snare/i.test(text)) return 'percussion';
  if (/\bbrass\b/i.test(text)) return 'brass';
  if (/contrabass|double\s*bass|upright\s*bass|bass\s*guitar|\bbass\b/i.test(text)) return 'bass';
  if (/guitar/i.test(text)) return 'guitar';
  if (/violin/i.test(text)) return 'violin';
  if (/viola/i.test(text)) return 'viola';
  if (/cello/i.test(text)) return 'cello';
  if (/piano|keyboard/i.test(text)) return 'piano';
  if (/voice|vocal|singer|soprano|alto|tenor|baritone/i.test(text)) return 'voice';
  return 'other';
}

function textOf(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

function parseDocument(xml: string): { doc: Document } | { error: string; root: string | null } {
  const errors: string[] = [];
  let doc: Document;
  try {
    doc = new DOMParser({
      onError: (level: string, message: string) => {
        if (level !== 'warning') errors.push(message);
      },
    }).parseFromString(xml, 'text/xml') as unknown as Document;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), root: null };
  }
  const root = doc.documentElement?.nodeName ?? null;
  if (errors.length) return { error: errors[0] ?? 'MusicXML parse failed', root };
  if (!doc.documentElement) return { error: 'MusicXML has no root element', root };
  if (root !== 'score-partwise') {
    return { error: `unsupported score root <${root ?? 'none'}>; score-partwise is required`, root };
  }
  return { doc };
}

interface RawEvent extends CanonicalEvent {
  tieStart: boolean;
  tieStop: boolean;
}

function mergeTies(events: readonly RawEvent[]): CanonicalEvent[] {
  const open = new Map<string, CanonicalEvent>();
  const out: CanonicalEvent[] = [];
  for (const event of events) {
    if (event.rest || event.soundingMidi === null) {
      out.push({ ...event, sourceEventIds: [event.id] });
      continue;
    }
    const key = `${event.partId}|${event.voice}|${event.soundingMidi}`;
    const held = open.get(key);
    if (event.tieStop && held && qEq(qAdd(held.onset, held.duration), event.onset)) {
      held.duration = qAdd(held.duration, event.duration);
      held.tieStop = event.tieStop;
      held.sourceEventIds = [...held.sourceEventIds, event.id];
      if (!event.tieStart) open.delete(key);
      continue;
    }
    const next: CanonicalEvent = { ...event, sourceEventIds: [event.id] };
    out.push(next);
    if (event.tieStart) open.set(key, next);
    else open.delete(key);
  }
  return out;
}

function walkPart(
  part: Element,
  partId: string,
  partName: string,
  role: InstrumentRole,
  score: {
    measures: CanonicalMeasure[];
    sourceEvents: RawEvent[];
    directions: CanonicalDirection[];
    harmony: CanonicalHarmonyMark[];
    repeats: CanonicalRepeat[];
    unsupported: UnsupportedConstruct[];
  },
): Transposition {
  let beats = 4;
  let beatType = 4;
  let divisions = 1;
  let chromatic = 0;
  let octaveChange = 0;
  let barStart = q(0);
  let eventSerial = 0;
  const measures = elementChildren(part, 'measure');
  measures.forEach((measure, index) => {
    const bar = index + 1;
    const printedBar = measure.getAttribute('number') ?? String(bar);
    const implicit = measure.getAttribute('implicit') === 'yes';
    for (const attributes of elementChildren(measure, 'attributes')) {
      const d = Number(textOf(attributes, 'divisions'));
      if (Number.isFinite(d) && d > 0) divisions = d;
      const time = elementChildren(attributes, 'time')[0];
      if (time) {
        if (elementChildren(time, 'senza-misura').length) {
          score.unsupported.push({
            kind: 'senza-misura',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(0),
            detail: 'unmeasured time is recorded and not given a bar length',
          });
        }
        const beatNodes = elementChildren(time, 'beats');
        if (beatNodes.length > 1) {
          score.unsupported.push({
            kind: 'additive-time-signature',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(0),
            detail: 'multiple <beats> groups are not summed; the first group is the stated metre',
          });
        }
        const nextBeats = Number(textOf(time, 'beats'));
        const nextType = Number(textOf(time, 'beat-type'));
        if (Number.isFinite(nextBeats) && nextBeats > 0) beats = nextBeats;
        if (Number.isFinite(nextType) && nextType > 0) beatType = nextType;
      }
      const transpose = elementChildren(attributes, 'transpose')[0];
      if (transpose) {
        const oct = textOf(transpose, 'octave-change');
        const chrom = textOf(transpose, 'chromatic');
        if (oct !== '') octaveChange = Number(oct);
        if (chrom !== '') chromatic = Number(chrom);
      }
    }
    const metre = q(beats * 4, beatType);
    let cursor = 0;
    let pendingVoice = '1';
    const barEvents: RawEvent[] = [];
    for (const node of elementChildren(measure)) {
      const name = node.nodeName;
      if (name === 'backup') {
        cursor -= Number(textOf(node, 'duration') || 0);
      } else if (name === 'forward') {
        cursor += Number(textOf(node, 'duration') || 0);
      } else if (name === 'direction') {
        const onsetInBar = textOf(node, 'offset') !== '' ? q(Number(textOf(node, 'offset')), divisions) : q(Math.max(cursor, 0), divisions);
        for (const typed of elementChildren(node, 'direction-type')) {
          for (const child of elementChildren(typed)) {
            if (child.nodeName === 'rehearsal') {
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind: 'rehearsal',
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text: child.textContent?.trim() ?? '',
              });
            } else if (child.nodeName === 'words') {
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind: 'expression',
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text: child.textContent?.trim() ?? '',
              });
            } else if (child.nodeName === 'metronome') {
              const unit = textOf(child, 'beat-unit');
              const per = textOf(child, 'per-minute');
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind: 'tempo',
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text: `${unit} = ${per}`,
              });
            } else if (DYNAMIC_NAMES.has(child.nodeName)) {
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind: 'dynamic',
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text: child.nodeName,
              });
            }
          }
        }
      } else if (name === 'harmony') {
        const root = elementChildren(node, 'root')[0];
        const step = textOf(root, 'root-step');
        const kind = elementChildren(node, 'kind')[0];
        const kindText = kind?.getAttribute('text') ?? kind?.textContent?.trim() ?? '';
        const offset = textOf(node, 'offset');
        score.harmony.push({
          id: `${partId}:b${bar}:harm:${score.harmony.length + 1}`,
          bar,
          partId,
          instrument: partName,
          onsetInBar: offset !== '' ? q(Number(offset), divisions) : q(Math.max(cursor, 0), divisions),
          text: `${step}${kindText}`,
        });
      } else if (name === 'barline') {
        const repeat = elementChildren(node, 'repeat')[0];
        const ending = elementChildren(node, 'ending')[0];
        if (repeat || ending) {
          const direction = repeat?.getAttribute('direction');
          score.repeats.push({
            id: `${partId}:b${bar}:repeat:${score.repeats.length + 1}`,
            bar,
            partId,
            direction: direction === 'forward' || direction === 'backward' ? direction : null,
            times: repeat?.getAttribute('times') ?? null,
            ending: ending?.getAttribute('number') ?? null,
            expanded: false,
          });
          score.unsupported.push({
            kind: 'repeat-expansion',
            bar,
            partId,
            instrument: partName,
            onsetInBar: null,
            detail: 'repeat and ending marks are stored; the written order is not expanded',
          });
        }
      } else if (name === 'note') {
        if (elementChildren(node, 'grace').length) {
          score.unsupported.push({
            kind: 'grace',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(Math.max(cursor, 0), divisions),
            detail: 'grace notes are not placed on the sounding timeline',
          });
          continue;
        }
        if (elementChildren(node, 'cue').length) {
          score.unsupported.push({
            kind: 'cue',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(Math.max(cursor, 0), divisions),
            detail: 'cue notes are not placed on the sounding timeline',
          });
          continue;
        }
        const chord = elementChildren(node, 'chord').length > 0;
        const dur = Number(textOf(node, 'duration') || 0);
        const voiceText = textOf(node, 'voice');
        if (voiceText) pendingVoice = voiceText;
        const onsetInBar = chord
          ? barEvents.at(-1)?.onsetInBar ?? q(cursor, divisions)
          : q(cursor, divisions);
        if (!chord) {
          cursor += dur;
        }
        const rest = elementChildren(node, 'rest').length > 0;
        const unpitched = elementChildren(node, 'unpitched')[0];
        if (unpitched) {
          score.unsupported.push({
            kind: 'unpitched',
            bar,
            partId,
            instrument: partName,
            onsetInBar,
            detail: 'unpitched notes are listed and omitted from pitch evidence',
          });
        }
        for (const notations of elementChildren(node, 'notations')) {
          for (const mark of elementChildren(notations)) {
            if (['glissando', 'slide', 'tremolo', 'arpeggiate'].includes(mark.nodeName)) {
              score.unsupported.push({
                kind: mark.nodeName,
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                detail: `${mark.nodeName} is present and not interpreted`,
              });
            }
          }
        }
        const pitch = elementChildren(node, 'pitch')[0];
        const step = pitch ? textOf(pitch, 'step') : '';
        const alter = pitch ? Number(textOf(pitch, 'alter') || 0) : 0;
        const octave = pitch ? Number(textOf(pitch, 'octave')) : 0;
        let writtenMidi: number | null = null;
        if (pitch && step) {
          try {
            writtenMidi = midiOfPitch(step, alter, octave);
          } catch (error) {
            score.unsupported.push({
              kind: 'pitch',
              bar,
              partId,
              instrument: partName,
              onsetInBar,
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        }
        const soundingMidi = writtenMidi === null ? null : writtenMidi + 12 * octaveChange + chromatic;
        const timeMod = elementChildren(node, 'time-modification')[0];
        const tuplet = timeMod
          ? {
              actualNotes: Number(textOf(timeMod, 'actual-notes')),
              normalNotes: Number(textOf(timeMod, 'normal-notes')),
            }
          : null;
        const tags = [...node.getElementsByTagName('tie'), ...node.getElementsByTagName('tied')] as Element[];
        eventSerial += 1;
        const event: RawEvent = {
          id: `${partId}:b${bar}:v${pendingVoice}:e${eventSerial}`,
          partId,
          partName,
          instrument: partName,
          role,
          voice: pendingVoice,
          bar,
          printedBar,
          onset: qAdd(barStart, onsetInBar),
          duration: q(dur, divisions),
          onsetInBar,
          rest: rest || Boolean(unpitched),
          chord,
          written: writtenMidi === null ? null : { step, alter, octave, midi: writtenMidi },
          soundingMidi: rest || unpitched ? null : soundingMidi,
          transposition: { chromatic, octaveChange },
          tieStart: tags.some((tag) => tag.getAttribute('type') === 'start'),
          tieStop: tags.some((tag) => tag.getAttribute('type') === 'stop'),
          tuplet,
          staff: textOf(node, 'staff') || null,
          sourceEventIds: [],
        };
        barEvents.push(event);
        score.sourceEvents.push(event);
      }
    }
    const pickup = implicit || printedBar === '0';
    score.measures.push({
      bar,
      printedBar,
      partId,
      beats,
      beatType,
      divisions,
      expected: metre,
      implicit,
      pickup,
    });
    barStart = qAdd(barStart, metre);
  });
  return { chromatic, octaveChange };
}

function accidentalText(alter: number): string {
  if (!alter) return '';
  if (alter < 0) return 'b'.repeat(-alter);
  return '#'.repeat(alter);
}

function strictMetre(time: Element):
  | { ok: true; groups: number[]; beatType: number; beats: number }
  | { ok: false; detail: string } {
  if (elementChildren(time, 'senza-misura').length) return { ok: false, detail: 'unmeasured time is recorded and not given a bar length' };
  const kids = elementChildren(time).filter((node) => node.nodeName === 'beats' || node.nodeName === 'beat-type');
  const groups: number[] = [];
  let beatType: number | null = null;
  for (let index = 0; index < kids.length; index += 1) {
    const beatsNode = kids[index];
    if (!beatsNode || beatsNode.nodeName !== 'beats') return { ok: false, detail: 'time signature has a beat-type without beats' };
    const raw = beatsNode.textContent?.trim() ?? '';
    const parts = raw.split('+').map((part) => part.trim()).filter(Boolean);
    const nums = parts.map(Number);
    if (!nums.length || nums.some((value) => !Number.isInteger(value) || value <= 0)) {
      return { ok: false, detail: `unsupported beats text ${raw || '(empty)'}` };
    }
    const typeNode = kids[index + 1];
    if (!typeNode || typeNode.nodeName !== 'beat-type') return { ok: false, detail: 'beats without beat-type' };
    const type = Number(typeNode.textContent?.trim());
    if (!Number.isInteger(type) || type <= 0) return { ok: false, detail: 'bad beat-type' };
    if (beatType === null) beatType = type;
    else if (beatType !== type) return { ok: false, detail: `mixed denominator ${beatType} and ${type}` };
    groups.push(...nums);
    index += 1;
  }
  if (!groups.length || beatType === null) return { ok: false, detail: 'empty time signature' };
  return { ok: true, groups, beatType, beats: groups.reduce((sum, value) => sum + value, 0) };
}

function cursorOnset(cursor: number, offsetText: string, divisions: number): Rational {
  const base = Math.max(cursor, 0);
  if (offsetText === '') return q(base, divisions);
  const offset = Number(offsetText);
  if (!Number.isFinite(offset)) return q(base, divisions);
  return q(base + offset, divisions);
}

function collectNamed(node: Element, names: ReadonlySet<string>, out: Element[]): void {
  if (names.has(node.nodeName)) out.push(node);
  for (const child of elementChildren(node)) collectNamed(child, names, out);
}

interface StrictTranspose {
  chromatic: number;
  octaveChange: number;
  diatonic: number | null;
  staff: string | null;
  usable: boolean;
  detail: string | null;
}

function readTranspose(node: Element): StrictTranspose {
  const oct = textOf(node, 'octave-change');
  const chrom = textOf(node, 'chromatic');
  const dia = textOf(node, 'diatonic');
  const staff = node.getAttribute('number') ?? textOf(node, 'staff');
  const chromatic = chrom === '' ? null : Number(chrom);
  const octaveChange = oct === '' ? 0 : Number(oct);
  const diatonic = dia === '' ? null : Number(dia);
  if (chromatic === null || !Number.isFinite(chromatic) || !Number.isFinite(octaveChange)) {
    return {
      chromatic: 0,
      octaveChange: 0,
      diatonic: Number.isFinite(diatonic) ? diatonic : null,
      staff: staff || null,
      usable: false,
      detail: diatonic === null ? 'transpose omits chromatic' : 'diatonic transpose without chromatic is not converted into a sounding shift',
    };
  }
  return {
    chromatic,
    octaveChange,
    diatonic: Number.isFinite(diatonic) ? diatonic : null,
    staff: staff || null,
    usable: true,
    detail: null,
  };
}

function transposeFor(states: readonly StrictTranspose[], staff: string | null): StrictTranspose {
  const scoped = staff ? states.find((state) => state.staff === staff) : undefined;
  return scoped ?? states.find((state) => state.staff === null) ?? {
    chromatic: 0,
    octaveChange: 0,
    diatonic: null,
    staff: null,
    usable: true,
    detail: null,
  };
}

function mergeTiesStrict(events: readonly RawEvent[], unsupported: UnsupportedConstruct[]): CanonicalEvent[] {
  const open = new Map<string, CanonicalEvent>();
  const out: CanonicalEvent[] = [];
  for (const event of events) {
    if (event.rest || event.soundingMidi === null || !event.written) {
      out.push({ ...event, sourceEventIds: [event.id], tieChainId: null });
      continue;
    }
    const key = [
      event.partId,
      event.voice,
      event.staff ?? '',
      event.written.step,
      event.written.alter,
      event.written.octave,
    ].join('|');
    const held = open.get(key);
    if (event.tieStop && held && qEq(qAdd(held.onset, held.duration), event.onset)) {
      const chain = held.tieChainId ?? `tie:${held.sourceEventIds[0] ?? held.id}`;
      held.duration = qAdd(held.duration, event.duration);
      held.tieStop = event.tieStop;
      held.tieChainId = chain;
      held.sourceEventIds = [...held.sourceEventIds, event.id];
      if (!event.tieStart) open.delete(key);
      continue;
    }
    if (event.tieStop && !held) {
      unsupported.push({
        kind: 'orphan-tie',
        bar: event.bar,
        partId: event.partId,
        instrument: event.instrument,
        onsetInBar: event.onsetInBar,
        detail: `${event.id} stops a tie with no open fragment on the same part, voice, staff and spelling`,
      });
    }
    if (event.tieStart && held) {
      unsupported.push({
        kind: 'ambiguous-tie',
        bar: event.bar,
        partId: event.partId,
        instrument: event.instrument,
        onsetInBar: event.onsetInBar,
        detail: `${event.id} starts a tie while ${held.id} is still open`,
      });
    }
    const next: CanonicalEvent = {
      ...event,
      sourceEventIds: [event.id],
      tieChainId: event.tieStart ? `tie:${event.id}` : null,
    };
    out.push(next);
    if (event.tieStart && !held) open.set(key, next);
    else open.delete(key);
  }
  for (const held of open.values()) {
    unsupported.push({
      kind: 'orphan-tie',
      bar: held.bar,
      partId: held.partId,
      instrument: held.instrument,
      onsetInBar: held.onsetInBar,
      detail: `${held.id} starts a tie that never stops`,
    });
  }
  return out;
}

function walkPartStrict(
  part: Element,
  partId: string,
  partName: string,
  role: InstrumentRole,
  score: {
    measures: CanonicalMeasure[];
    sourceEvents: RawEvent[];
    directions: CanonicalDirection[];
    harmony: CanonicalHarmonyMark[];
    repeats: CanonicalRepeat[];
    unsupported: UnsupportedConstruct[];
  },
): Transposition {
  let beats = 4;
  let beatType = 4;
  let groups: number[] = [4];
  let divisions = 1;
  let metreRejected = false;
  let transposes: StrictTranspose[] = [{
    chromatic: 0,
    octaveChange: 0,
    diatonic: null,
    staff: null,
    usable: true,
    detail: null,
  }];
  let barStart = q(0);
  let eventSerial = 0;
  let noteOrdinal = 0;
  const measures = elementChildren(part, 'measure');
  measures.forEach((measure, index) => {
    const bar = index + 1;
    const printedBar = measure.getAttribute('number') ?? String(bar);
    const implicit = measure.getAttribute('implicit') === 'yes';
    const pickup = implicit || printedBar === '0';
    let cursor = 0;
    let pendingVoice = '1';
    let sawNote = false;
    let tupletGroup: { id: string; actual: number; normal: number; seen: number } | null = null;
    const barEvents: RawEvent[] = [];
    for (const node of elementChildren(measure)) {
      const name = node.nodeName;
      if (name === 'attributes') {
        const divisionText = textOf(node, 'divisions');
        if (divisionText !== '') {
          const nextDivisions = Number(divisionText);
          if (!Number.isFinite(nextDivisions) || nextDivisions <= 0) {
            score.unsupported.push({
              kind: 'divisions',
              bar,
              partId,
              instrument: partName,
              onsetInBar: q(Math.max(cursor, 0), divisions),
              detail: `bad divisions ${divisionText}`,
            });
          } else if (sawNote) {
            score.unsupported.push({
              kind: 'mid-measure-divisions',
              bar,
              partId,
              instrument: partName,
              onsetInBar: q(Math.max(cursor, 0), divisions),
              detail: 'divisions change after a note; the cursor unit is not rescaled',
            });
          } else {
            divisions = nextDivisions;
          }
        }
        const time = elementChildren(node, 'time')[0];
        if (time) {
          if (sawNote) {
            score.unsupported.push({
              kind: 'mid-measure-time',
              bar,
              partId,
              instrument: partName,
              onsetInBar: q(Math.max(cursor, 0), divisions),
              detail: 'a time signature after a note is not given a new bar length',
            });
          } else {
            const parsed = strictMetre(time);
            if (!parsed.ok) {
              metreRejected = true;
              score.unsupported.push({
                kind: parsed.detail.includes('mixed denominator') ? 'mixed-denominator' : parsed.detail.includes('unmeasured') ? 'senza-misura' : 'time-signature',
                bar,
                partId,
                instrument: partName,
                onsetInBar: q(0),
                detail: parsed.detail,
              });
            } else {
              metreRejected = false;
              beats = parsed.beats;
              beatType = parsed.beatType;
              groups = parsed.groups;
            }
          }
        }
        const transposeNodes = elementChildren(node, 'transpose');
        if (transposeNodes.length) {
          const next = transposeNodes.map(readTranspose);
          for (const item of next) {
            if (!item.usable) {
              score.unsupported.push({
                kind: 'diatonic-transpose',
                bar,
                partId,
                instrument: partName,
                onsetInBar: q(Math.max(cursor, 0), divisions),
                detail: item.detail ?? 'unsupported transpose',
              });
            }
          }
          if (sawNote) transposes = [...transposes.filter((item) => !next.some((item2) => item2.staff === item.staff)), ...next];
          else transposes = next;
        }
        if (sawNote && (elementChildren(node, 'key').length || elementChildren(node, 'staff-details').length)) {
          score.unsupported.push({
            kind: 'mid-measure-attribute',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(Math.max(cursor, 0), divisions),
            detail: 'key or staff-details after a note are stored as unsupported and do not rewrite pitches',
          });
        }
      } else if (name === 'backup') {
        cursor -= Number(textOf(node, 'duration') || 0);
      } else if (name === 'forward') {
        cursor += Number(textOf(node, 'duration') || 0);
      } else if (name === 'direction') {
        const onsetInBar = cursorOnset(cursor, textOf(node, 'offset'), divisions);
        for (const typed of elementChildren(node, 'direction-type')) {
          for (const child of elementChildren(typed)) {
            const dynamics: Element[] = [];
            if (child.nodeName === 'dynamics') collectNamed(child, DYNAMIC_NAMES, dynamics);
            else if (DYNAMIC_NAMES.has(child.nodeName)) dynamics.push(child);
            for (const dynamic of dynamics) {
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind: 'dynamic',
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text: dynamic.nodeName,
                playbackBpm: null,
              });
            }
            if (child.nodeName === 'rehearsal' || child.nodeName === 'words' || child.nodeName === 'metronome') {
              const kind = child.nodeName === 'rehearsal' ? 'rehearsal' : child.nodeName === 'metronome' ? 'tempo' : 'expression';
              const text = child.nodeName === 'metronome'
                ? `${textOf(child, 'beat-unit')} = ${textOf(child, 'per-minute')}`
                : child.textContent?.trim() ?? '';
              score.directions.push({
                id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
                kind,
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                text,
                playbackBpm: null,
              });
            }
          }
        }
        for (const sound of elementChildren(node, 'sound')) {
          const tempo = sound.getAttribute('tempo');
          if (tempo === null || tempo === '') continue;
          score.directions.push({
            id: `${partId}:b${bar}:dir:${score.directions.length + 1}`,
            kind: 'tempo',
            bar,
            partId,
            instrument: partName,
            onsetInBar,
            text: `sound:${tempo}`,
            playbackBpm: Number(tempo),
          });
        }
      } else if (name === 'harmony') {
        const root = elementChildren(node, 'root')[0];
        const step = textOf(root, 'root-step');
        const alterText = textOf(root, 'root-alter');
        const alter = alterText === '' ? 0 : Number(alterText);
        const kind = elementChildren(node, 'kind')[0];
        const kindText = kind?.getAttribute('text') ?? kind?.textContent?.trim() ?? '';
        const bass = elementChildren(node, 'bass')[0];
        const bassStep = bass ? textOf(bass, 'bass-step') : '';
        const bassAlterText = bass ? textOf(bass, 'bass-alter') : '';
        const bassAlter = bassAlterText === '' ? 0 : Number(bassAlterText);
        const bassLabel = bassStep ? `/${bassStep}${accidentalText(bassAlter)}` : '';
        score.harmony.push({
          id: `${partId}:b${bar}:harm:${score.harmony.length + 1}`,
          bar,
          partId,
          instrument: partName,
          onsetInBar: cursorOnset(cursor, textOf(node, 'offset'), divisions),
          text: `${step}${accidentalText(alter)}${kindText}${bassLabel}`,
          rootStep: step,
          rootAlter: Number.isFinite(alter) ? alter : 0,
          kindValue: kind?.textContent?.trim() ?? '',
          bassStep: bassStep || null,
          bassAlter: bass ? (Number.isFinite(bassAlter) ? bassAlter : 0) : null,
        });
      } else if (name === 'barline') {
        const repeat = elementChildren(node, 'repeat')[0];
        const ending = elementChildren(node, 'ending')[0];
        if (repeat || ending) {
          const direction = repeat?.getAttribute('direction');
          score.repeats.push({
            id: `${partId}:b${bar}:repeat:${score.repeats.length + 1}`,
            bar,
            partId,
            direction: direction === 'forward' || direction === 'backward' ? direction : null,
            times: repeat?.getAttribute('times') ?? null,
            ending: ending?.getAttribute('number') ?? null,
            expanded: false,
          });
        }
        if (elementChildren(node, 'coda').length || elementChildren(node, 'segno').length || (ending && ending.getAttribute('type') === 'discontinue')) {
          score.unsupported.push({
            kind: 'navigation-mark',
            bar,
            partId,
            instrument: partName,
            onsetInBar: null,
            detail: 'coda, segno or a discontinued ending is stored and not expanded',
          });
        }
      } else if (name === 'note') {
        if (elementChildren(node, 'grace').length || elementChildren(node, 'cue').length) {
          const kind = elementChildren(node, 'grace').length ? 'grace' : 'cue';
          score.unsupported.push({
            kind,
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(Math.max(cursor, 0), divisions),
            detail: `${kind} notes are not placed on the sounding timeline`,
          });
          continue;
        }
        const chord = elementChildren(node, 'chord').length > 0;
        const dur = Number(textOf(node, 'duration') || 0);
        if (!Number.isInteger(dur) || dur < 0) {
          score.unsupported.push({
            kind: 'duration',
            bar,
            partId,
            instrument: partName,
            onsetInBar: q(Math.max(cursor, 0), divisions),
            detail: `duration ${textOf(node, 'duration')} is not a non-negative integer division count`,
          });
          continue;
        }
        const voiceText = textOf(node, 'voice');
        if (voiceText) pendingVoice = voiceText;
        const onsetInBar = chord
          ? barEvents.at(-1)?.onsetInBar ?? q(cursor, divisions)
          : q(cursor, divisions);
        if (!chord) cursor += dur;
        const rest = elementChildren(node, 'rest').length > 0;
        const unpitched = elementChildren(node, 'unpitched')[0];
        if (unpitched) {
          score.unsupported.push({
            kind: 'unpitched',
            bar,
            partId,
            instrument: partName,
            onsetInBar,
            detail: 'unpitched notes are listed and omitted from pitch evidence',
          });
        }
        const pitch = elementChildren(node, 'pitch')[0];
        const step = pitch ? textOf(pitch, 'step') : '';
        const alter = pitch ? Number(textOf(pitch, 'alter') || 0) : 0;
        const octave = pitch ? Number(textOf(pitch, 'octave')) : 0;
        if (pitch && !Number.isInteger(alter)) {
          score.unsupported.push({
            kind: 'microtone',
            bar,
            partId,
            instrument: partName,
            onsetInBar,
            detail: `alter ${alter} is not an integer semitone`,
          });
        }
        const staff = textOf(node, 'staff') || null;
        const transpose = transposeFor(transposes, staff);
        let writtenMidi: number | null = null;
        if (pitch && step && Number.isInteger(alter)) {
          try {
            writtenMidi = midiOfPitch(step, alter, octave);
          } catch (error) {
            score.unsupported.push({
              kind: 'pitch',
              bar,
              partId,
              instrument: partName,
              onsetInBar,
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        }
        const soundingMidi = writtenMidi === null || !transpose.usable ? null : writtenMidi + 12 * transpose.octaveChange + transpose.chromatic;
        const timeMod = elementChildren(node, 'time-modification')[0];
        const tuplet = timeMod
          ? {
              actualNotes: Number(textOf(timeMod, 'actual-notes')),
              normalNotes: Number(textOf(timeMod, 'normal-notes')),
            }
          : null;
        let tupletGroupId: string | null = null;
        if (tuplet && Number.isInteger(tuplet.actualNotes) && tuplet.actualNotes > 0) {
          const nested = elementChildren(node, 'time-modification').length > 1;
          if (nested) {
            score.unsupported.push({
              kind: 'nested-tuplet',
              bar,
              partId,
              instrument: partName,
              onsetInBar,
              detail: 'more than one time-modification on a note is not interpreted',
            });
          }
          if (!tupletGroup || tupletGroup.seen >= tupletGroup.actual || tupletGroup.actual !== tuplet.actualNotes || tupletGroup.normal !== tuplet.normalNotes) {
            tupletGroup = { id: `${partId}:b${bar}:tuplet:${eventSerial + 1}`, actual: tuplet.actualNotes, normal: tuplet.normalNotes, seen: 0 };
          }
          tupletGroup.seen += 1;
          tupletGroupId = tupletGroup.id;
        }
        for (const notations of elementChildren(node, 'notations')) {
          for (const mark of elementChildren(notations)) {
            if (['glissando', 'slide', 'tremolo', 'arpeggiate'].includes(mark.nodeName)) {
              score.unsupported.push({
                kind: mark.nodeName,
                bar,
                partId,
                instrument: partName,
                onsetInBar,
                detail: `${mark.nodeName} is present and not interpreted`,
              });
            }
          }
        }
        const tags = [...node.getElementsByTagName('tie'), ...node.getElementsByTagName('tied')] as Element[];
        eventSerial += 1;
        noteOrdinal += 1;
        sawNote = true;
        const previous = chord ? barEvents.at(-1) : undefined;
        const event: RawEvent = {
          id: `${partId}:b${bar}:v${pendingVoice}:e${eventSerial}`,
          partId,
          partName,
          instrument: partName,
          role,
          voice: pendingVoice,
          bar,
          printedBar,
          onset: qAdd(barStart, onsetInBar),
          duration: q(dur, divisions),
          onsetInBar,
          rest: rest || Boolean(unpitched),
          chord,
          written: writtenMidi === null ? null : { step, alter, octave, midi: writtenMidi },
          soundingMidi: rest || unpitched ? null : soundingMidi,
          transposition: {
            chromatic: transpose.chromatic,
            octaveChange: transpose.octaveChange,
            diatonic: transpose.diatonic,
            staff: transpose.staff,
          },
          tieStart: tags.some((tag) => tag.getAttribute('type') === 'start'),
          tieStop: tags.some((tag) => tag.getAttribute('type') === 'stop'),
          tuplet,
          staff,
          sourceEventIds: [],
          noteOrdinal,
          xmlId: node.getAttribute('id'),
          chordMember: chord ? (previous?.chordMember ?? 0) + 1 : 0,
          tieChainId: null,
          tupletGroupId,
        };
        barEvents.push(event);
        score.sourceEvents.push(event);
      }
    }
    let advance = metreRejected ? q(0) : q(beats * 4, beatType);
    if (pickup && !metreRejected) {
      let end = q(0);
      for (const event of barEvents) {
        const eventEnd = qAdd(event.onsetInBar, event.duration);
        if (eventEnd.n * end.d > end.n * eventEnd.d) end = eventEnd;
      }
      advance = end;
    }
    score.measures.push({
      bar,
      printedBar,
      partId,
      beats: metreRejected ? 0 : beats,
      beatType: metreRejected ? 0 : beatType,
      divisions,
      expected: metreRejected ? q(0) : q(beats * 4, beatType),
      implicit,
      pickup,
      beatGroups: groups.length > 1 ? [...groups] : undefined,
      advance,
      metreRejected,
    });
    barStart = qAdd(barStart, advance);
  });
  const summary = transposeFor(transposes, null);
  return {
    chromatic: summary.chromatic,
    octaveChange: summary.octaveChange,
    diatonic: summary.diatonic,
    staff: summary.staff,
  };
}

export function ingestCanonicalScore(xml: string, options?: CanonicalIngestOptions): CanonicalIngest {
  const sha256 = sha256Text(xml);
  const parsed = parseDocument(xml);
  if ('error' in parsed) {
    return { sha256, score: null, parseError: parsed.error, rootName: parsed.root };
  }
  const doc = parsed.doc;
  const names = partNames(doc);
  const parts: CanonicalPart[] = [];
  const measures: CanonicalMeasure[] = [];
  const sourceEvents: RawEvent[] = [];
  const directions: CanonicalDirection[] = [];
  const harmony: CanonicalHarmonyMark[] = [];
  const repeats: CanonicalRepeat[] = [];
  const unsupported: UnsupportedConstruct[] = [];
  const strict = options?.strictSource === true;
  const declared = new Set<string>();
  const partList = elementChildren(doc.documentElement, 'part-list')[0];
  if (partList) {
    for (const scorePart of elementChildren(partList, 'score-part')) {
      const id = scorePart.getAttribute('id') ?? '';
      if (id) declared.add(id);
    }
  }
  for (const part of partElements(doc)) {
    const id = part.getAttribute('id') ?? '';
    const name = names.get(id) ?? id;
    const role = roleOf(name);
    const walk = strict ? walkPartStrict : walkPart;
    const transposition = walk(part, id, name, role, {
      measures,
      sourceEvents,
      directions,
      harmony,
      repeats,
      unsupported,
    });
    parts.push({ id, name, role, transposition });
    declared.delete(id);
  }
  for (const missing of declared) {
    unsupported.push({
      kind: 'missing-part',
      bar: 0,
      partId: missing,
      instrument: names.get(missing) ?? missing,
      onsetInBar: null,
      detail: `score-part ${missing} has no <part>`,
    });
  }
  if (strict) {
    const byBar = new Map<number, Rational[]>();
    for (const measure of measures) {
      if (!measure.pickup || !measure.advance) continue;
      const list = byBar.get(measure.bar) ?? [];
      list.push(measure.advance);
      byBar.set(measure.bar, list);
    }
    for (const [bar, advances] of byBar) {
      const first = advances[0];
      if (!first || advances.every((item) => qEq(item, first))) continue;
      unsupported.push({
        kind: 'pickup-span-disagreement',
        bar,
        partId: '',
        instrument: '',
        onsetInBar: null,
        detail: 'pickup measures do not share one sounding span',
      });
    }
  }
  const score: CanonicalEvaluationScore = {
    version: CANONICAL_SCORE_VERSION,
    sha256,
    partwise: true,
    parts,
    measures,
    sourceEvents,
    soundingEvents: strict ? mergeTiesStrict(sourceEvents, unsupported) : mergeTies(sourceEvents),
    directions,
    harmony,
    repeats,
    unsupported,
    ...(strict ? { strictSource: true as const } : {}),
  };
  return { sha256, score, parseError: null, rootName: 'score-partwise' };
}

export function eventSignature(event: Pick<CanonicalEvent, 'partId' | 'voice' | 'bar' | 'onsetInBar' | 'duration' | 'rest' | 'soundingMidi'>): string {
  return [
    event.partId,
    event.voice,
    event.bar,
    formatRational(event.onsetInBar),
    formatRational(event.duration),
    event.rest ? 'rest' : String(event.soundingMidi),
  ].join('|');
}
