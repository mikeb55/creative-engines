/**
 * MusicXML 3.1 partwise writer for WWH duo sketches.
 * No tablature. Guitar and bass keep the source octave-down transpose when requested.
 */

import type { Element as XmlElement } from '@xmldom/xmldom';
import { XMLSerializer } from '@xmldom/xmldom';
import { timingRepairFor } from './wwhDuoImport';
import type { WwhAtom, WwhHarmonySpec } from './wwhPerformanceTypes';
import { WWH_DIVISIONS } from './wwhPerformanceTypes';
import { tempoDirectionXml, tempoKey, type WwhTempoMark } from './wwhTiming';

export interface WwhWrittenBar {
  guitar: WwhAtom[];
  bass: WwhAtom[];
  beats?: number;
  beatType?: number;
  rehearsal?: string;
  words?: string[];
  bassWords?: string[];
  harmony?: WwhHarmonySpec;
  /** Full source measure clones. When set, atoms are ignored for that part. */
  guitarClone?: Element;
  bassClone?: Element;
  newSystem?: boolean;
  divisions?: number;
  fifths?: number;
  mode?: string;
  guitarTranspose?: number;
  bassTranspose?: number;
  tempoMark?: WwhTempoMark | null;
  guitarNotation?: 'open' | 'tacet';
  bassNotation?: 'open' | 'tacet';
  /** Second guitar voice. Rewound with backup so the two lines stay independent. */
  guitarVoice2?: WwhAtom[];
}

export interface WwhScoreHeader {
  title: string;
  movementTitle: string;
  composer: string;
  software: string;
  tempo?: number;
  transposeOctave?: number;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function accidental(alter: number | undefined): string {
  if (alter === 1) return '<accidental>sharp</accidental>';
  if (alter === -1) return '<accidental>flat</accidental>';
  if (alter === 0) return '<accidental>natural</accidental>';
  return '';
}

function tieElements(atom: WwhAtom): string {
  const tags: string[] = [];
  if (atom.tieStop) tags.push('<tie type="stop"/>');
  if (atom.tieStart) tags.push('<tie type="start"/>');
  return tags.join('');
}

function notations(atom: WwhAtom): string {
  const tied: string[] = [];
  if (atom.tieStop) tied.push('<tied type="stop"/>');
  if (atom.tieStart) tied.push('<tied type="start"/>');
  const fermata = atom.fermata ? '<fermata>normal</fermata>' : '';
  if (!tied.length && !fermata) return '';
  return `<notations>${tied.join('')}${fermata}</notations>`;
}

function atomXml(atom: WwhAtom, voice = '1', stem?: 'up' | 'down'): string {
  const dots = atom.dots ? '<dot/>'.repeat(atom.dots) : '';
  const head = atom.rest
    ? '<rest/>'
    : `<pitch><step>${esc(atom.step || 'C')}</step>${
        atom.alter ? `<alter>${atom.alter}</alter>` : ''
      }<octave>${atom.octave ?? 4}</octave></pitch>`;
  const timeMod = atom.timeModification
    ? `<time-modification><actual-notes>${atom.timeModification.actualNotes}</actual-notes><normal-notes>${atom.timeModification.normalNotes}</normal-notes><normal-type>${esc(
        atom.timeModification.normalType
      )}</normal-type></time-modification>`
    : '';
  const stemXml = stem ? `<stem>${stem}</stem>` : '';
  return `<note>${atom.chord ? '<chord/>' : ''}${head}<duration>${atom.divisions}</duration>${tieElements(atom)}<voice>${voice}</voice><type>${atom.type}</type>${dots}${timeMod}${stemXml}${
    atom.rest ? '' : accidental(atom.alter)
  }${notations(atom)}</note>`;
}

function harmonyXml(harmony: WwhHarmonySpec): string {
  const alter = harmony.alter ? `<root-alter>${harmony.alter}</root-alter>` : '';
  const text = harmony.text ? ` text="${esc(harmony.text)}"` : '';
  const bass =
    harmony.bass !== undefined
      ? `<bass><bass-step>${esc(harmony.bass)}</bass-step>${
          harmony.bassAlter ? `<bass-alter>${harmony.bassAlter}</bass-alter>` : ''
        }</bass>`
      : '';
  return `<harmony><root><root-step>${esc(harmony.root)}</root-step>${alter}</root><kind${text}>${esc(
    harmony.kind
  )}</kind>${bass}</harmony>`;
}

function directions(bar: WwhWrittenBar, tempo: number | undefined, writeHeaderTempo: boolean, writeMark: boolean): string {
  const chunks: string[] = [];
  if (writeMark && bar.tempoMark) chunks.push(tempoDirectionXml(bar.tempoMark));
  else if (writeHeaderTempo && tempo) {
    chunks.push(
      `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`
    );
  }
  if (bar.rehearsal) {
    chunks.push(
      `<direction placement="above"><direction-type><rehearsal>${esc(bar.rehearsal)}</rehearsal></direction-type></direction>`
    );
  }
  for (const words of bar.words ?? []) {
    chunks.push(
      `<direction placement="above"><direction-type><words>${esc(words)}</words></direction-type></direction>`
    );
  }
  return chunks.join('');
}

interface WrittenState {
  divisions: number;
  beats: number;
  beatType: number;
  fifths: number;
  mode: string;
  transpose: number;
  tempo: string;
}

function barState(bar: WwhWrittenBar, clef: 'G' | 'F', header: WwhScoreHeader): WrittenState {
  const transposeFallback = header.transposeOctave ?? -1;
  const transpose = clef === 'G' ? (bar.guitarTranspose ?? transposeFallback) : (bar.bassTranspose ?? transposeFallback);
  return {
    divisions: bar.divisions ?? WWH_DIVISIONS,
    beats: bar.beats ?? 4,
    beatType: bar.beatType ?? 4,
    fifths: bar.fifths ?? 0,
    mode: bar.mode ?? 'major',
    transpose,
    tempo: bar.tempoMark ? tempoKey(bar.tempoMark) : '',
  };
}

function attributes(options: {
  clef: 'G' | 'F';
  beats: number;
  beatType: number;
  divisions: number;
  fifths: number;
  mode: string;
  transposeOctave: number;
  clefLine?: number;
  forceTranspose?: boolean;
}): string {
  const line = options.clefLine ?? (options.clef === 'G' ? 2 : 4);
  const transpose =
    options.transposeOctave === 0 && !options.forceTranspose
      ? ''
      : `<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>${options.transposeOctave}</octave-change></transpose>`;
  return `<attributes><divisions>${options.divisions}</divisions><key><fifths>${options.fifths}</fifths><mode>${esc(
    options.mode
  )}</mode></key><time><beats>${options.beats}</beats><beat-type>${options.beatType}</beat-type></time><staves>1</staves><clef><sign>${options.clef}</sign><line>${line}</line></clef>${transpose}</attributes>`;
}

function localName(el: Element): string {
  return el.localName || el.tagName || '';
}

function applyTimingRepair(clone: XmlElement, source: Element): void {
  const repair = timingRepairFor(source);
  if (!repair) return;
  if (repair.divisions !== null) {
    const walk = (el: Element): Element | null => {
      if (localName(el) === 'divisions') return el;
      for (const child of Array.from(el.childNodes)) {
        if (!child || child.nodeType !== 1) continue;
        const found = walk(child as Element);
        if (found) return found;
      }
      return null;
    };
    const divisions = walk(clone);
    if (divisions) divisions.textContent = String(repair.divisions);
  }
  const notes: Element[] = [];
  for (const child of Array.from(clone.childNodes)) {
    if (child && child.nodeType === 1 && localName(child as Element) === 'note') notes.push(child as Element);
  }
  repair.noteDurations.forEach((duration, index) => {
    if (duration === null) return;
    const note = notes[index];
    if (!note) return;
    for (const child of Array.from(note.childNodes)) {
      if (!child || child.nodeType !== 1) continue;
      if (localName(child as Element) !== 'duration') continue;
      (child as Element).textContent = String(duration);
      break;
    }
  });
}

export function cleanSourceMeasure(source: Element, number: number, newSystem: boolean): string {
  const clone = source.cloneNode(true) as XmlElement;
  applyTimingRepair(clone, source);
  clone.setAttribute('number', String(number));
  if (clone.hasAttribute('width')) clone.removeAttribute('width');
  const drop: Element[] = [];
  const walk = (el: Element) => {
    const kids = el.childNodes;
    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (!node || node.nodeType !== 1) continue;
      const child = node as Element;
      const style = localName(child) === 'barline' ? child.textContent || '' : '';
      if (localName(child) === 'print' || (localName(child) === 'barline' && style.includes('light-heavy'))) drop.push(child);
      else walk(child);
    }
  };
  walk(clone);
  for (const el of drop) el.parentNode?.removeChild(el);
  if (newSystem) {
    const print = clone.ownerDocument!.createElement('print');
    print.setAttribute('new-system', 'yes');
    const first = clone.firstChild;
    if (first) clone.insertBefore(print, first);
    else clone.appendChild(print);
  }
  return new XMLSerializer().serializeToString(clone);
}

export function addWordsToMeasureXml(measureXml: string, words: string[]): string {
  if (!words.length) return measureXml;
  const direction = words
    .map(
      (line) =>
        `<direction placement="above"><direction-type><words>${esc(line)}</words></direction-type></direction>`
    )
    .join('');
  if (measureXml.includes('<note')) return measureXml.replace('<note', `${direction}<note`);
  return measureXml.replace(/<\/measure>\s*$/, `${direction}</measure>`);
}

function insertBeforeNote(xml: string, block: string): string {
  if (!block) return xml;
  if (xml.includes('<note')) return xml.replace('<note', `${block}<note`);
  return xml.replace(/<\/measure>\s*$/, `${block}</measure>`);
}

function contextBlock(state: WrittenState, clef: 'G' | 'F', xml: string, prev: WrittenState | null): string {
  const full = (forceTranspose: boolean) =>
    attributes({
      clef,
      beats: state.beats,
      beatType: state.beatType,
      divisions: state.divisions,
      fifths: state.fifths,
      mode: state.mode,
      transposeOctave: state.transpose,
      forceTranspose,
    });
  if (!prev) {
    if (xml.includes('<divisions')) return '';
    return full(state.transpose !== 0);
  }
  const needDivisions = prev.divisions !== state.divisions && !xml.includes('<divisions');
  const needKey = (prev.fifths !== state.fifths || prev.mode !== state.mode) && !xml.includes('<fifths');
  const needTime = (prev.beats !== state.beats || prev.beatType !== state.beatType) && !xml.includes('<beat-type');
  const needTranspose = prev.transpose !== state.transpose && !xml.includes('<transpose');
  if (!needDivisions && !needKey && !needTime && !needTranspose) return '';
  if (needDivisions || needKey || needTranspose) return full(needTranspose);
  return `<attributes><time><beats>${state.beats}</beats><beat-type>${state.beatType}</beat-type></time></attributes>`;
}

function beatUnitName(beatType: number): string {
  if (beatType === 1) return 'whole';
  if (beatType === 2) return 'half';
  if (beatType === 8) return 'eighth';
  if (beatType === 16) return '16th';
  return 'quarter';
}

function barRestXml(beats: number, beatType: number, divisions: number): string {
  const duration = Math.round((beats * divisions * 4) / beatType);
  if (beatType === 8 && beats === 6) return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>half</type><dot/></note>`;
  if (beatType === 8 && beats === 12) return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>whole</type><dot/></note>`;
  if (beatType === 8 && beats === 7) return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>half</type><dot/><dot/></note>`;
  if (beatType === 4 && beats === 2) return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>half</type></note>`;
  if (beatType === 4 && beats === 3) return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>half</type><dot/></note>`;
  return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>whole</type></note>`;
}

function unrealizedBody(notation: 'open' | 'tacet', beats: number, beatType: number, divisions: number): { prefix: string; notes: string } {
  if (notation === 'tacet') return { prefix: '', notes: barRestXml(beats, beatType, divisions) };
  const unit = Math.round((divisions * 4) / beatType);
  const name = beatUnitName(beatType);
  const prefix = `<attributes><measure-style><slash type="start"><slash-type>${name}</slash-type></slash></measure-style></attributes>`;
  const notes = Array.from({ length: beats }, () => `<note><rest/><duration>${unit}</duration><voice>1</voice><type>${name}</type></note>`).join('');
  return { prefix, notes };
}

function freshMeasure(
  clef: 'G' | 'F',
  number: number,
  bar: WwhWrittenBar,
  header: WwhScoreHeader,
  state: WrittenState,
  prev: WrittenState | null,
  writeTempo: boolean
): string {
  const atoms = clef === 'G' ? bar.guitar : bar.bass;
  const attrBlock = contextBlock(state, clef, '', prev);
  const print = bar.newSystem && clef === 'G' ? '<print new-system="yes"/>' : '';
  const headerTempo = !prev && !bar.tempoMark && header.tempo !== undefined;
  const dirs =
    clef === 'G'
      ? directions(bar, header.tempo, headerTempo, writeTempo && Boolean(bar.tempoMark))
      : (bar.bassWords ?? [])
          .map((line) => `<direction placement="above"><direction-type><words>${esc(line)}</words></direction-type></direction>`)
          .join('');
  const harmony = clef === 'G' && bar.harmony ? harmonyXml(bar.harmony) : '';
  const notation = clef === 'G' ? bar.guitarNotation : bar.bassNotation;
  const unrealized = !atoms.length && notation ? unrealizedBody(notation, state.beats, state.beatType, state.divisions) : null;
  const voice2 = clef === 'G' ? (bar.guitarVoice2 ?? []) : [];
  const notes = unrealized ? unrealized.notes : atoms.map((atom) => atomXml(atom, '1', voice2.length ? 'up' : undefined)).join('');
  const lower = voice2.length
    ? `<backup><duration>${voice2.reduce((sum, atom) => (atom.chord ? sum : sum + atom.divisions), 0)}</duration></backup>${voice2
        .map((atom) => atomXml(atom, '2', 'down'))
        .join('')}`
    : '';
  const slash = unrealized?.prefix ?? '';
  return `<measure number="${number}">${print}${attrBlock}${slash}${dirs}${harmony}${notes}${lower}</measure>`;
}

function partXml(id: string, clef: 'G' | 'F', bars: readonly WwhWrittenBar[], header: WwhScoreHeader): string {
  let prev: WrittenState | null = null;
  const measures = bars.map((bar, index) => {
    const state = barState(bar, clef, header);
    const clone = clef === 'G' ? bar.guitarClone : bar.bassClone;
    const writeTempo = Boolean(state.tempo) && state.tempo !== prev?.tempo;
    let xml: string;
    if (clone) {
      xml = cleanSourceMeasure(clone, index + 1, Boolean(bar.newSystem) && clef === 'G');
      const staffWords = clef === 'G' ? bar.words : bar.bassWords;
      if (staffWords?.length) xml = addWordsToMeasureXml(xml, staffWords);
      if (clef === 'G' && bar.rehearsal && !xml.includes(`>${esc(bar.rehearsal)}</rehearsal>`)) {
        xml = insertBeforeNote(
          xml,
          `<direction placement="above"><direction-type><rehearsal>${esc(bar.rehearsal)}</rehearsal></direction-type></direction>`
        );
      }
      xml = insertBeforeNote(xml, contextBlock(state, clef, xml, prev));
      if (clef === 'G' && writeTempo && bar.tempoMark && !xml.includes('<metronome') && !xml.includes('<sound ')) {
        xml = insertBeforeNote(xml, tempoDirectionXml(bar.tempoMark));
      }
    } else {
      xml = freshMeasure(clef, index + 1, bar, header, state, prev, writeTempo);
    }
    prev = state;
    if (index === bars.length - 1 && !xml.includes('light-heavy')) {
      xml = xml.replace(/<\/measure>\s*$/, '<barline location="right"><bar-style>light-heavy</bar-style></barline></measure>');
    }
    return xml;
  });
  return `<part id="${id}">${measures.join('')}</part>`;
}

export function renderWwhDuoScore(bars: readonly WwhWrittenBar[], header: WwhScoreHeader): string {
  const transpose = header.transposeOctave ?? -1;
  void transpose;
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
 <work><work-title>${esc(header.title)}</work-title></work>
 <movement-title>${esc(header.movementTitle)}</movement-title>
 <identification>
  <creator type="composer">${esc(header.composer)}</creator>
  <encoding>
   <software>${esc(header.software)}</software>
   <encoding-description>${esc(header.software)} sketch. Rehearsal material, not a prescribed duo performance. Standard notation only.</encoding-description>
   <supports element="accidental" type="yes"/>
   <supports element="print" type="yes" value="yes" attribute="new-system"/>
  </encoding>
 </identification>
 <part-list>
  <score-part id="P1">
   <part-name>Electric Guitar</part-name>
   <part-abbreviation>E. Gtr.</part-abbreviation>
   <score-instrument id="P1-I1"><instrument-name>Electric Guitar</instrument-name></score-instrument>
   <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>27</midi-program></midi-instrument>
  </score-part>
  <score-part id="P2">
   <part-name>Upright Bass</part-name>
   <part-abbreviation>Bass</part-abbreviation>
   <score-instrument id="P2-I1"><instrument-name>Upright Bass</instrument-name></score-instrument>
   <midi-instrument id="P2-I1"><midi-channel>2</midi-channel><midi-program>33</midi-program></midi-instrument>
  </score-part>
 </part-list>
 ${partXml('P1', 'G', bars, header)}
 ${partXml('P2', 'F', bars, header)}
</score-partwise>
`;
}
