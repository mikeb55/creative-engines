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
}

export interface CanonicalHarmonyMark {
  id: string;
  bar: number;
  partId: string;
  instrument: string;
  onsetInBar: Rational;
  text: string;
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
}

export interface CanonicalIngest {
  sha256: string;
  score: CanonicalEvaluationScore | null;
  parseError: string | null;
  rootName: string | null;
}

const DYNAMIC_NAMES = new Set([
  'p', 'pp', 'ppp', 'pppp', 'f', 'ff', 'fff', 'ffff', 'mp', 'mf', 'sf', 'sfz', 'fp', 'fz', 'rf', 'rfz',
]);

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function roleOf(name: string): InstrumentRole {
  const text = name.trim();
  if (/sax|flute|clarinet|oboe|bassoon|piccolo|english\s*horn|recorder/i.test(text)) return 'wind';
  if (/trumpet|trombone|tuba|cornet|flugel|brass|\bhorn\b/i.test(text)) return 'brass';
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

export function ingestCanonicalScore(xml: string): CanonicalIngest {
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
    const transposition = walkPart(part, id, name, role, {
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
  const score: CanonicalEvaluationScore = {
    version: CANONICAL_SCORE_VERSION,
    sha256,
    partwise: true,
    parts,
    measures,
    sourceEvents,
    soundingEvents: mergeTies(sourceEvents),
    directions,
    harmony,
    repeats,
    unsupported,
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
