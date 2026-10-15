/**
 * Hexatonic Phase H3 — duo MusicXML.
 * Standard notation. No TAB. No chord symbols.
 */

import { ensureMusicXmlDomParserPolyfill } from '../musicXmlImportDomPolyfill';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import { parseNoteToken } from '../pentatonic/pitch';
import type { HexatonicAttack, HexatonicPhrase } from './phraseTypes';

export interface HexatonicScoreAttack {
  part: 'guitar' | 'bass';
  measure: number;
  startBeat: number;
  duration: number;
  pitches: number[];
}

export interface HexatonicScoreReading {
  attacks: HexatonicScoreAttack[];
  words: string[];
  harmonyCount: number;
  tabStaff: boolean;
}

function spellingOf(token: string): { step: string; alter: number } | null {
  const parsed = parseNoteToken(token);
  if (!parsed) return null;
  let alter = 0;
  if (parsed.spelling.endsWith('bb')) alter = -2;
  else if (parsed.spelling.endsWith('b')) alter = -1;
  else if (parsed.spelling.endsWith('##')) alter = 2;
  else if (parsed.spelling.endsWith('#')) alter = 1;
  return { step: parsed.letter, alter };
}

export function hexatonicPhraseToMusicXml(phrase: Pick<HexatonicPhrase, 'centreName' | 'homeId' | 'family' | 'bars'> & { title?: string }): string {
  const barCount = phrase.bars.length;
  const guitar = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    barCount,
    () => undefined,
    () => undefined
  );
  const bass = createPart(
    'bass',
    'Upright Bass',
    ACOUSTIC_UPRIGHT_BASS.instrumentIdentity,
    ACOUSTIC_UPRIGHT_BASS.midiProgram,
    'bass',
    barCount,
    () => undefined,
    () => undefined
  );
  const words: Record<number, string> = {};
  let identity = '';
  phrase.bars.forEach((bar, index) => {
    const measureNumber = index + 1;
    if (index === phrase.bars.length - 1 && bar.direction.length > 24) identity = bar.direction;
    else if (bar.direction) words[measureNumber] = bar.direction;
    for (const part of [guitar, bass]) {
      const measure = part.measures[index]!;
      measure.measureBeatSpanQuarters = 4;
      const attacks = bar.attacks.filter((attack) => attack.part === (part.id === 'guitar' ? 'guitar' : 'bass'));
      measure.events = attacks.flatMap((attack) => eventsOf(attack));
    }
  });
  const title = phrase.title ?? `Hexatonic ${phrase.homeId}`;
  const score = createScore(title, [guitar, bass], { tempo: 92 });
  score.timeSignature = { beats: 4, beatType: 4 };
  score.barMeterMap = {};
  for (let bar = 1; bar <= barCount; bar += 1) score.barMeterMap[bar] = { numerator: 4, denominator: 4 };
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  score.measureWordsMarkings = words;
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    throw new Error(exported.errors.join(' ') || 'hexatonic MusicXML export failed');
  }
  const xml = identity ? placeIdentityAtStart(exported.xml, identity) : exported.xml;
  if (/<harmony[\s>]/i.test(xml)) throw new Error('hexatonic MusicXML wrote a chord symbol');
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(xml)) throw new Error('hexatonic MusicXML wrote a TAB staff');
  return xml;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Long collection text sits above bar 1, where the system has width. Bar 6 stays clear of the right margin. */
function placeIdentityAtStart(xml: string, identity: string): string {
  const lines = identity.split(' · ').map((line) => line.trim()).filter(Boolean);
  const block = lines
    .map((line, index) => {
      const y = 78 - index * 14;
      return `    <direction placement="above"><direction-type><words default-y="${y}" justify="left">${escapeXml(line)}</words></direction-type></direction>`;
    })
    .join('\n');
  const marker = '</attributes>';
  const at = xml.indexOf(marker);
  if (at < 0 || !block) return xml;
  const close = at + marker.length;
  return `${xml.slice(0, close)}\n${block}${xml.slice(close)}`;
}

function eventsOf(attack: HexatonicAttack) {
  if (attack.pitches.length === 0) return [createRest(attack.startBeat, attack.duration, 1)];
  const ordered = attack.pitches.map((pitch, index) => ({ pitch, spelling: attack.spellings[index] ?? '' }));
  ordered.sort((left, right) => left.pitch - right.pitch);
  return ordered.map((note) => {
    const event = createNote(note.pitch, attack.startBeat, attack.duration, 1);
    const spelling = spellingOf(note.spelling);
    if (spelling) event.spelling = spelling;
    return event;
  });
}

function localName(node: Node): string {
  const name = node.nodeName;
  const index = name.indexOf(':');
  return index >= 0 ? name.slice(index + 1) : name;
}

function elements(parent: Node, name: string): Element[] {
  const found: Element[] = [];
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes[index]!;
    if (child.nodeType === 1 && localName(child) === name) found.push(child as Element);
  }
  return found;
}

function textOf(parent: Node, name: string): string | undefined {
  const child = elements(parent, name)[0];
  const text = child?.textContent?.trim();
  return text || undefined;
}

function attackMidi(pitch: Element): number {
  const step = textOf(pitch, 'step') ?? 'C';
  const alter = Number(textOf(pitch, 'alter') ?? '0');
  const octave = Number(textOf(pitch, 'octave') ?? '4');
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (octave + 1) * 12 + (natural[step] ?? 0) + alter;
}

export function readHexatonicScore(xml: string): HexatonicScoreReading {
  ensureMusicXmlDomParserPolyfill();
  const Parser = (globalThis as unknown as { DOMParser?: typeof DOMParser }).DOMParser;
  if (!Parser) throw new Error('DOMParser is unavailable');
  const doc = new Parser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('MusicXML parser reported an error');
  const attacks: HexatonicScoreAttack[] = [];
  const words: string[] = [];
  for (const direction of Array.from(doc.getElementsByTagName('words'))) {
    const text = direction.textContent?.trim();
    if (text) words.push(text);
  }
  const parts = Array.from(doc.getElementsByTagName('part'));
  for (const part of parts) {
    const id = part.getAttribute('id') ?? '';
    const role: 'guitar' | 'bass' | null = id === 'guitar' ? 'guitar' : id === 'bass' ? 'bass' : null;
    if (!role) continue;
    let divisions = 1;
    const measures = elements(part, 'measure');
    measures.forEach((measure, measureIndex) => {
      const attributes = elements(measure, 'attributes')[0];
      const divisionText = attributes ? textOf(attributes, 'divisions') : undefined;
      if (divisionText) divisions = Number(divisionText) || divisions;
      let cursor = 0;
      let open: HexatonicScoreAttack | null = null;
      for (const note of elements(measure, 'note')) {
        if (elements(note, 'chord').length > 0) {
          const pitch = elements(note, 'pitch')[0];
          if (open && pitch) open.pitches.push(attackMidi(pitch));
          continue;
        }
        if (elements(note, 'grace').length > 0 || elements(note, 'cue').length > 0) continue;
        const duration = Number(textOf(note, 'duration') ?? '0');
        const beats = divisions > 0 ? duration / divisions : 0;
        const startBeat = divisions > 0 ? cursor / divisions : 0;
        cursor += duration;
        if (elements(note, 'rest').length > 0) {
          open = null;
          attacks.push({ part: role, measure: measureIndex, startBeat, duration: beats, pitches: [] });
          continue;
        }
        const pitch = elements(note, 'pitch')[0];
        open = {
          part: role,
          measure: measureIndex,
          startBeat,
          duration: beats,
          pitches: pitch ? [attackMidi(pitch)] : [],
        };
        attacks.push(open);
      }
    });
  }
  return {
    attacks,
    words,
    harmonyCount: doc.getElementsByTagName('harmony').length,
    tabStaff: /<staff-type>\s*tab\s*<\/staff-type>/i.test(xml),
  };
}

function eighths(beats: number): number {
  return Math.round(beats * 2);
}

export function hexatonicScoreMatchesPhrase(phrase: HexatonicPhrase, xml = phrase.musicXml): boolean {
  const reading = readHexatonicScore(xml);
  if (reading.harmonyCount !== 0 || reading.tabStaff) return false;
  const expected: string[] = [];
  phrase.bars.forEach((bar, measure) => {
    for (const attack of bar.attacks) {
      const pitches = [...attack.pitches].sort((left, right) => left - right).join(',');
      expected.push(`${measure}|${attack.part}|${eighths(attack.startBeat)}|${eighths(attack.duration)}|${pitches}`);
    }
  });
  const actual = reading.attacks.map((attack) => {
    const pitches = [...attack.pitches].sort((left, right) => left - right).join(',');
    return `${attack.measure}|${attack.part}|${eighths(attack.startBeat)}|${eighths(attack.duration)}|${pitches}`;
  });
  expected.sort();
  actual.sort();
  if (expected.length !== actual.length) return false;
  return expected.every((row, index) => row === actual[index]);
}
