/**
 * MusicXML → {@link ParsedChart} (Phase 1): metadata + per-measure `<harmony>` chords.
 * Uses {@link DOMParser}; Node loads `@xmldom/xmldom` via {@link ensureMusicXmlDomParserPolyfill}.
 */

/// <reference lib="dom" />

import { musicXmlKindContentFromKindText } from '../../core/chordSymbolMusicXmlCore';
import { harmoniesFromMeasures, type ParsedChart, type ParsedChord } from './irealpro/parsedChart';
import type { LeadSheet } from './lead-sheet/leadSheetTypes';
import { ensureMusicXmlDomParserPolyfill } from './musicXmlImportDomPolyfill';

function getDomParserClass(): typeof DOMParser {
  ensureMusicXmlDomParserPolyfill();
  const g = globalThis as unknown as { DOMParser?: typeof DOMParser };
  if (!g.DOMParser) {
    throw new Error('parseMusicXml requires DOMParser (browser or a DOMParser polyfill in Node).');
  }
  return g.DOMParser;
}

function childElementsByLocalName(parent: Element, localName: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i]!;
    if (c.localName === localName) out.push(c);
  }
  return out;
}

function firstChildText(parent: Element | null, localName: string): string | undefined {
  if (!parent) return undefined;
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i]!;
    if (c.localName === localName) return c.textContent?.trim();
  }
  return undefined;
}

function parseIntMaybe(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

const MAJOR_KEY_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};

const MINOR_KEY_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Ab',
  [-6]: 'Eb',
  [-5]: 'Bb',
  [-4]: 'F',
  [-3]: 'C',
  [-2]: 'G',
  [-1]: 'D',
  0: 'A',
  1: 'E',
  2: 'B',
  3: 'F#',
  4: 'C#',
  5: 'G#',
  6: 'D#',
  7: 'A#',
};

function keyStringFromFifthsAndMode(fifths: number, modeRaw: string | undefined): string | null {
  const mode = (modeRaw ?? 'major').trim().toLowerCase();
  if (mode === 'minor') {
    return MINOR_KEY_BY_FIFTHS[fifths] ?? null;
  }
  return MAJOR_KEY_BY_FIFTHS[fifths] ?? null;
}

function splitChordSymbolForParsedChord(symbol: string): { rootNote: string; chordQuality: string } {
  const s = symbol.trim();
  if (!s || /^n\.?c\.?$/i.test(s)) {
    return { rootNote: '', chordQuality: '' };
  }
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(s);
  if (!m) return { rootNote: '', chordQuality: s };
  return {
    rootNote: (m[1]! + (m[2] ?? '')).toLowerCase(),
    chordQuality: (m[3] ?? '').trim(),
  };
}

function reconstructOtherKindSuffixFromDegrees(harmonyEl: Element): string {
  const degrees = childElementsByLocalName(harmonyEl, 'degree');
  const parts: string[] = [];
  for (const dEl of degrees) {
    const type = (firstChildText(dEl, 'degree-type') ?? '').trim().toLowerCase();
    const valueRaw = firstChildText(dEl, 'degree-value');
    const alterRaw = firstChildText(dEl, 'degree-alter');
    const value = valueRaw ? parseInt(valueRaw, 10) : NaN;
    const alter =
      alterRaw !== undefined && alterRaw !== '' && Number.isFinite(parseInt(alterRaw, 10))
        ? parseInt(alterRaw, 10)
        : 0;
    if (type === 'subtract') continue;
    if (!Number.isFinite(value)) continue;
    if (type === 'add' && value === 9 && alter === 0) parts.push('add9');
    else if (type === 'alter' && value === 11 && alter === 1) parts.push('#11');
    else if (type === 'alter' && value === 5 && alter === -1) parts.push('b5');
    else if (type === 'add') parts.push(`add${value}`);
    else if (type === 'alter') {
      if (alter === 1) parts.push(`#${value}`);
      else if (alter === -1) parts.push(`b${value}`);
      else if (alter !== 0) parts.push(`${alter > 0 ? '#' : 'b'}${value}`);
      else parts.push(String(value));
    }
  }
  return parts.join('');
}

function kindAttributeText(harmonyEl: Element): string | undefined {
  const kinds = childElementsByLocalName(harmonyEl, 'kind');
  const k0 = kinds[0];
  if (!k0) return undefined;
  const t = k0.getAttribute('text');
  return t?.trim() || undefined;
}

function kindBodyText(harmonyEl: Element): string {
  const kinds = childElementsByLocalName(harmonyEl, 'kind');
  const k0 = kinds[0];
  return (k0?.textContent ?? '').trim();
}

/** MusicXML nests `root-step` under `<root>` (and bass under `<bass>`); support both shapes. */
function textFromHarmonyWrapper(harmonyEl: Element, wrapperLocal: string, fieldLocal: string): string | undefined {
  const direct = firstChildText(harmonyEl, fieldLocal);
  if (direct !== undefined) return direct;
  const wrap = childElementsByLocalName(harmonyEl, wrapperLocal)[0];
  return wrap ? firstChildText(wrap, fieldLocal) : undefined;
}

/** Best-effort jazz-style chord string from a `<harmony>` element (aligned with lead-sheet importer). */
function parseHarmonySymbolFromElement(harmonyEl: Element): string | null {
  const rootStep = textFromHarmonyWrapper(harmonyEl, 'root', 'root-step');
  if (!rootStep) return null;
  const rootAlterRaw = textFromHarmonyWrapper(harmonyEl, 'root', 'root-alter');
  const rootAlter = rootAlterRaw ? parseInt(rootAlterRaw, 10) : 0;
  const acc = rootAlter === 1 ? '#' : rootAlter === -1 ? 'b' : '';
  const root = `${rootStep.toUpperCase()}${acc}`;

  const kindTextAttr = kindAttributeText(harmonyEl);
  const kindBody = kindBodyText(harmonyEl);
  const kindBodyNorm = kindBody.toLowerCase();

  let suffix = '';
  if (kindBodyNorm === 'other') {
    const degSuffix = reconstructOtherKindSuffixFromDegrees(harmonyEl);
    suffix = `${kindTextAttr && kindTextAttr.length > 0 ? kindTextAttr : ''}${degSuffix}`;
    if (!suffix) suffix = musicXmlKindContentFromKindText(kindBody);
  } else if (kindTextAttr && kindTextAttr.length > 0) {
    suffix = kindTextAttr;
  } else if (kindBody.length > 0 && kindBodyNorm !== 'major') {
    if (kindBodyNorm === 'minor') suffix = 'm';
    else if (kindBodyNorm === 'dominant') suffix = '7';
    else if (kindBodyNorm === 'major-seventh') suffix = 'maj7';
    else if (kindBodyNorm === 'minor-seventh') suffix = 'm7';
    else if (kindBodyNorm === 'dominant-ninth') suffix = '9';
    else if (kindBodyNorm === 'half-diminished') suffix = 'm7b5';
    else suffix = musicXmlKindContentFromKindText(kindBody);
  }

  const bassStep = textFromHarmonyWrapper(harmonyEl, 'bass', 'bass-step');
  let slash = '';
  if (bassStep) {
    const bassAlterRaw = textFromHarmonyWrapper(harmonyEl, 'bass', 'bass-alter');
    const bassAlter = bassAlterRaw ? parseInt(bassAlterRaw, 10) : 0;
    const bassAcc = bassAlter === 1 ? '#' : bassAlter === -1 ? 'b' : '';
    slash = `/${bassStep.toUpperCase()}${bassAcc}`;
  }

  return `${root}${suffix}${slash}`;
}

function readTitle(doc: Document): string {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (el.localName === 'work-title') {
      const t = el.textContent?.trim();
      if (t) return t;
    }
  }
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (el.localName === 'movement-title') {
      const t = el.textContent?.trim();
      if (t) return t;
    }
  }
  const credits = Array.from(doc.getElementsByTagName('*')).filter((e) => e.localName === 'credit');
  for (const c of credits) {
    const typeEl = childElementsByLocalName(c, 'credit-type')[0];
    const wordsEl = childElementsByLocalName(c, 'credit-words')[0];
    const ty = typeEl?.textContent?.trim().toLowerCase();
    if (ty === 'title' && wordsEl?.textContent) {
      return wordsEl.textContent.trim();
    }
  }
  return '';
}

function readComposer(doc: Document): string {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (el.localName === 'creator' && el.getAttribute('type') === 'composer') {
      return el.textContent?.trim() ?? '';
    }
  }
  return '';
}

type ScanState = {
  divisions: number;
  beatsPerBar: number;
  beatType: number;
  fifths: number | null;
  mode: string | undefined;
};

function parseAttributesIntoState(attributesEl: Element, state: ScanState): void {
  const divText = firstChildText(attributesEl, 'divisions');
  const divs = parseIntMaybe(divText);
  if (divs !== undefined && divs > 0) state.divisions = divs;

  const keyEl = childElementsByLocalName(attributesEl, 'key')[0];
  if (keyEl) {
    const fifthsT = firstChildText(keyEl, 'fifths');
    const fifths = fifthsT !== undefined ? parseInt(fifthsT, 10) : NaN;
    if (Number.isFinite(fifths)) state.fifths = fifths;
    const mode = firstChildText(keyEl, 'mode');
    if (mode) state.mode = mode;
  }

  const timeEl = childElementsByLocalName(attributesEl, 'time')[0];
  if (timeEl) {
    const beatsT = firstChildText(timeEl, 'beats');
    const btT = firstChildText(timeEl, 'beat-type');
    const beats = beatsT !== undefined ? parseInt(beatsT, 10) : NaN;
    const bt = btT !== undefined ? parseInt(btT, 10) : NaN;
    if (Number.isFinite(beats) && beats > 0) state.beatsPerBar = beats;
    if (Number.isFinite(bt) && bt > 0) state.beatType = bt;
  }
}

function firstPartElement(doc: Document): Element | null {
  const root = doc.documentElement;
  if (!root) return null;
  const children = Array.from(root.children).filter((c) => c.localName === 'part');
  return children[0] ?? null;
}

function measureChildrenSorted(partEl: Element): Element[] {
  const measures = Array.from(partEl.children).filter((c) => c.localName === 'measure');
  return measures.sort((a, b) => {
    const na = parseInt(a.getAttribute('number') ?? '0', 10);
    const nb = parseInt(b.getAttribute('number') ?? '0', 10);
    if (na !== nb) return na - nb;
    return 0;
  });
}

/**
 * Phase 1: title, composer, key (first key sig), first explicit time signature, and chords from `<harmony>`
 * on the **first** `<part>`. Sections and repeats are empty; `barMeterMap` / `tempo` / `style` are unused defaults.
 */
export function parseMusicXml(xmlString: string): ParsedChart {
  const DP = getDomParserClass();
  const doc = new DP().parseFromString(xmlString, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return {
      title: '',
      composer: '',
      key: null,
      meter: null,
      timeSignature: null,
      harmonies: [],
      barMeterMap: {},
      repeatMarkers: [],
      tempo: null,
      style: null,
      sections: [],
      measures: [],
      repeats: [],
    };
  }

  const title = readTitle(doc);
  const composer = readComposer(doc);

  const state: ScanState = {
    divisions: 1,
    beatsPerBar: 4,
    beatType: 4,
    fifths: null,
    mode: undefined,
  };

  const measuresOut: ParsedChord[][] = [];
  const part = firstPartElement(doc);
  if (part) {
    const measureEls = measureChildrenSorted(part);
    for (let measureIndex = 0; measureIndex < measureEls.length; measureIndex++) {
      const measureEl = measureEls[measureIndex]!;
      const row: ParsedChord[] = [];
      let harmonySlot = 0;

      for (let i = 0; i < measureEl.children.length; i++) {
        const child = measureEl.children[i]!;
        if (child.localName === 'attributes') {
          parseAttributesIntoState(child, state);
        } else if (child.localName === 'harmony') {
          const sym = parseHarmonySymbolFromElement(child);
          const symbol = sym ?? 'N.C.';
          const { rootNote, chordQuality } = splitChordSymbolForParsedChord(symbol);
          row.push({
            symbol,
            rootNote,
            chordQuality,
            duration: 1,
            barIndex: measureIndex,
            beatIndex: harmonySlot,
          });
          harmonySlot += 1;
        }
      }

      measuresOut.push(row);
    }
  }

  let key: string | null = null;
  if (state.fifths !== null) {
    key = keyStringFromFifthsAndMode(state.fifths, state.mode);
  }

  const timeSignature =
    Number.isFinite(state.beatsPerBar) &&
    state.beatsPerBar > 0 &&
    Number.isFinite(state.beatType) &&
    state.beatType > 0
      ? { num: state.beatsPerBar, den: state.beatType }
      : null;

  const meter = timeSignature;
  return {
    title,
    composer,
    key,
    meter,
    timeSignature,
    harmonies: harmoniesFromMeasures(measuresOut),
    barMeterMap: {},
    repeatMarkers: [],
    tempo: null,
    style: null,
    sections: [],
    measures: measuresOut,
    repeats: [],
  };
}

/**
 * Future path: unify {@link ParsedChart} (iReal / paste / MusicXML phase-1) with {@link LeadSheet}.
 * Not implemented yet — call sites should continue using slice-specific pipelines until this lands.
 */
export function parsedChartToLeadSheet(_chart: ParsedChart): LeadSheet {
  throw new Error('parsedChartToLeadSheet: not yet implemented');
}
