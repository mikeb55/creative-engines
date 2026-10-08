/**
 * MusicXML 3.1 partwise writer for WWH duo sketches.
 * No tablature. Guitar and bass keep the source octave-down transpose when requested.
 */

import type { Element as XmlElement } from '@xmldom/xmldom';
import { XMLSerializer } from '@xmldom/xmldom';
import type { WwhAtom, WwhHarmonySpec } from './wwhPerformanceTypes';
import { WWH_DIVISIONS } from './wwhPerformanceTypes';

export interface WwhWrittenBar {
  guitar: WwhAtom[];
  bass: WwhAtom[];
  beats?: number;
  beatType?: number;
  rehearsal?: string;
  words?: string[];
  harmony?: WwhHarmonySpec;
  /** Full source measure clones. When set, atoms are ignored for that part. */
  guitarClone?: Element;
  bassClone?: Element;
  newSystem?: boolean;
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

function atomXml(atom: WwhAtom): string {
  const dots = atom.dots ? '<dot/>'.repeat(atom.dots) : '';
  const head = atom.rest
    ? '<rest/>'
    : `<pitch><step>${esc(atom.step || 'C')}</step>${
        atom.alter ? `<alter>${atom.alter}</alter>` : ''
      }<octave>${atom.octave ?? 4}</octave></pitch>`;
  const fermata = atom.fermata ? '<notations><fermata>normal</fermata></notations>' : '';
  return `<note>${atom.chord ? '<chord/>' : ''}${head}<duration>${atom.divisions}</duration><voice>1</voice><type>${atom.type}</type>${dots}${
    atom.rest ? '' : accidental(atom.alter)
  }${fermata}</note>`;
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

function directions(bar: WwhWrittenBar, tempo: number | undefined, isFirst: boolean): string {
  const chunks: string[] = [];
  if (isFirst && tempo) {
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

function attributes(clef: 'G' | 'F', beats: number, beatType: number, transposeOctave: number): string {
  const line = clef === 'G' ? 2 : 4;
  const transpose =
    transposeOctave === 0
      ? ''
      : `<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>${transposeOctave}</octave-change></transpose>`;
  return `<attributes><divisions>${WWH_DIVISIONS}</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>1</staves><clef><sign>${clef}</sign><line>${line}</line></clef>${transpose}</attributes>`;
}

function localName(el: Element): string {
  return el.localName || el.tagName || '';
}

export function cleanSourceMeasure(source: Element, number: number, newSystem: boolean): string {
  const clone = source.cloneNode(true) as XmlElement;
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

function freshMeasure(
  clef: 'G' | 'F',
  number: number,
  bar: WwhWrittenBar,
  header: WwhScoreHeader,
  attributeMode: 'full' | 'time' | 'none'
): string {
  const beats = bar.beats ?? 4;
  const beatType = bar.beatType ?? 4;
  const atoms = clef === 'G' ? bar.guitar : bar.bass;
  const attrBlock =
    attributeMode === 'full'
      ? attributes(clef, beats, beatType, header.transposeOctave ?? -1)
      : attributeMode === 'time'
        ? `<attributes><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time></attributes>`
        : '';
  const print = bar.newSystem && clef === 'G' ? '<print new-system="yes"/>' : '';
  const dirs = clef === 'G' ? directions(bar, header.tempo, attributeMode === 'full') : '';
  const harmony = clef === 'G' && bar.harmony ? harmonyXml(bar.harmony) : '';
  return `<measure number="${number}">${print}${attrBlock}${dirs}${harmony}${atoms.map(atomXml).join('')}</measure>`;
}

function ensureOpening(xml: string, clef: 'G' | 'F', beats: number, beatType: number, transposeOctave: number): string {
  if (xml.includes('<divisions')) return xml;
  const block = attributes(clef, beats, beatType, transposeOctave);
  if (xml.includes('<note')) return xml.replace('<note', `${block}<note`);
  return xml.replace(/<\/measure>\s*$/, `${block}</measure>`);
}

function partXml(id: string, clef: 'G' | 'F', bars: readonly WwhWrittenBar[], header: WwhScoreHeader): string {
  let prevBeats: number | null = null;
  let prevType: number | null = null;
  const measures = bars.map((bar, index) => {
    const beats = bar.beats ?? 4;
    const beatType = bar.beatType ?? 4;
    const meterChanged = prevBeats !== null && (beats !== prevBeats || beatType !== prevType);
    const clone = clef === 'G' ? bar.guitarClone : bar.bassClone;
    let xml: string;
    if (clone) {
      xml = cleanSourceMeasure(clone, index + 1, Boolean(bar.newSystem) && clef === 'G');
      if (clef === 'G' && bar.words?.length) xml = addWordsToMeasureXml(xml, bar.words);
      if (clef === 'G' && bar.rehearsal && !xml.includes(`>${esc(bar.rehearsal)}</rehearsal>`)) {
        xml = xml.replace(
          '<note',
          `<direction placement="above"><direction-type><rehearsal>${esc(bar.rehearsal)}</rehearsal></direction-type></direction><note`
        );
      }
      if (index === 0) xml = ensureOpening(xml, clef, beats, beatType, header.transposeOctave ?? -1);
      if (meterChanged && !xml.includes('<beat-type')) {
        xml = xml.replace(
          '<note',
          `<attributes><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time></attributes><note`
        );
      }
    } else {
      const mode = index === 0 ? 'full' : meterChanged ? 'time' : 'none';
      xml = freshMeasure(clef, index + 1, bar, header, mode);
    }
    prevBeats = beats;
    prevType = beatType;
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
