/**
 * Read-only MusicXML → ordered pentatonic path events.
 * Reuses the existing DOMParser polyfill. Does not build a second MusicContext.
 * Written score order. Repeats are not expanded.
 * Displayed measure labels are the MusicXML `number` attribute, unchanged.
 */

/// <reference lib="dom" />

import { ensureMusicXmlDomParserPolyfill } from '../musicXmlImportDomPolyfill';
import { PENTATONIC_NOTE_CHOICES, mod12, parseNoteToken } from './pitch';

export const PENTATONIC_SCORE_ORDER_POLICY = 'written-score-order' as const;

export interface PentatonicScorePart {
  id: string;
  name: string;
  instrument: string;
  role: 'melody' | 'bass' | 'other';
}

export interface PentatonicHarmonyEvidence {
  symbol: string;
  offsetDivisions: number | null;
  displayText: string | null;
  richerThanEncoded: boolean;
}

export type PentatonicPitchPolicy = 'written-equals-concert' | 'concert-from-written-transpose' | 'written-only';

const NC_MARK = /^(n\.?\s*c\.?|nc)$/i;

/** Existing MusicXML direction words. Not a section letter and not a motif mark. */
export const COLLECTION_IDENTITY_MARK = /^collection ([a-z0-9_]+)@([A-G](?:#|b)?)$/;

export function formatCollectionIdentityMark(resourceId: string, centre: string): string {
  return `collection ${resourceId}@${centre}`;
}

export function parseCollectionIdentityMark(text: string): { resourceId: string; centre: string } | null {
  const match = text.trim().match(COLLECTION_IDENTITY_MARK);
  if (!match) return null;
  return { resourceId: match[1]!, centre: match[2]! };
}
const NAV_MARK = /\b(d\.s\.|d\.c\.|da capo|dal segno|to coda|coda|segno)\b/i;

export interface PentatonicSoundingAttack {
  role: 'melody' | 'bass';
  spelling: string;
  durationBeats: number;
}

/** Written MIDI for register checks. Path scoring still uses pitch class. */
export interface PentatonicRegisterAttack {
  role: 'melody' | 'bass';
  midi: number;
  durationBeats: number;
}

export interface PentatonicMotifMark {
  type: 'motif';
  label: string;
  sourceLabel: string;
  offsetDivisions: number | null;
}

export interface PentatonicKeySignature {
  sourceLabel: string;
  fifths: number;
  mode: string | null;
}

export interface PentatonicScoreEvent {
  id: string;
  orderIndex: number;
  sourceLabel: string;
  chordSymbol?: string;
  chordCarried: boolean;
  harmonyEvidence: readonly PentatonicHarmonyEvidence[];
  melodyNotes?: string[];
  bassNotes?: string[];
  heldNotes?: string[];
  soundingAttacks: readonly PentatonicSoundingAttack[];
  registerAttacks?: readonly PentatonicRegisterAttack[];
  melodyRest?: boolean;
  bassRest?: boolean;
  durationBeats?: number;
  sourceBoundary: boolean;
  sourceBoundaryReasons: string[];
  sectionMarks: string[];
  timeBeats: number | null;
  timeBeatType: number | null;
}

export interface PentatonicScoreImport {
  title: string;
  movementTitle: string;
  orderPolicy: typeof PENTATONIC_SCORE_ORDER_POLICY;
  parts: PentatonicScorePart[];
  melodyPartId: string | null;
  bassPartId: string | null;
  events: PentatonicScoreEvent[];
  motifs: PentatonicMotifMark[];
  keySignatures: PentatonicKeySignature[];
  diagnostics: string[];
  warnings: string[];
  repeatDetected: boolean;
  endingDetected: boolean;
  navigationLabels: readonly string[];
  pickupLabels: string[];
  pitchPolicy: PentatonicPitchPolicy;
  timingsMs: { parse: number; extract: number };
}

const KIND_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'minor-sixth': 'm6',
  'major-sixth': '6',
  power: '5',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  diminished: 'dim',
  'diminished-seventh': 'dim7',
  'half-diminished': 'm7b5',
  augmented: 'aug',
  other: '',
};

const LETTER_MARK = /^[A-Z][′'’]?$/;
const MOTIF_MARK = /^M\d+(?:\s+.+)?$/;

function localName(el: Element): string {
  return el.localName || el.tagName;
}

function childElements(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  const list = parent.children;
  for (let i = 0; i < list.length; i++) {
    const child = list[i]!;
    if (!name || localName(child) === name) out.push(child);
  }
  return out;
}

function firstText(parent: Element | null, name: string): string | undefined {
  if (!parent) return undefined;
  for (const child of childElements(parent, name)) {
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

function hasChild(parent: Element, name: string): boolean {
  return childElements(parent, name).length > 0;
}

function accidental(alter: string | undefined): string {
  if (alter === undefined || alter === '') return '';
  const n = parseInt(alter, 10);
  if (n === 1) return '#';
  if (n === -1) return 'b';
  if (n === 2) return '##';
  if (n === -2) return 'bb';
  return `?${alter}`;
}

function formatSpelling(step: string, alter: string | undefined): string {
  return `${step.toUpperCase()}${accidental(alter)}`;
}

function roleFor(name: string, instrument: string): PentatonicScorePart['role'] {
  const blob = `${name} ${instrument}`.toLowerCase();
  if (blob.includes('bass')) return 'bass';
  if (blob.includes('guitar')) return 'melody';
  return 'other';
}

function readPartList(doc: Document): PentatonicScorePart[] {
  const parts: PentatonicScorePart[] = [];
  const root = doc.documentElement;
  if (!root) return parts;
  for (const list of childElements(root, 'part-list')) {
    for (const scorePart of childElements(list, 'score-part')) {
      const id = scorePart.getAttribute('id') ?? '';
      const name = firstText(scorePart, 'part-name') ?? id;
      const instrument = firstText(scorePart, 'instrument-name') ?? '';
      parts.push({ id, name, instrument, role: roleFor(name, instrument) });
    }
  }
  return parts;
}

function partElements(doc: Document): Element[] {
  const root = doc.documentElement;
  if (!root) return [];
  return childElements(root, 'part');
}

function titleText(doc: Document, tag: string): string {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (localName(el) === tag) {
      const text = el.textContent?.trim();
      if (text) return text;
    }
  }
  return '';
}

interface NoteAttack {
  spelling: string;
  durationBeats: number;
}

interface NoteMidi {
  midi: number;
  durationBeats: number;
}

interface NoteScan {
  spellings: string[];
  attacks: NoteAttack[];
  midis: NoteMidi[];
  pitched: number;
  rests: number;
  grace: number;
  cue: number;
  durationBeats: number;
  voices: string[];
}

function emptyScan(): NoteScan {
  return { spellings: [], attacks: [], midis: [], pitched: 0, rests: 0, grace: 0, cue: 0, durationBeats: 0, voices: [] };
}

function attackMidi(step: string, alter: string | undefined, octaveText: string | undefined): number | null {
  const octave = parseInt(octaveText ?? '', 10);
  if (!Number.isFinite(octave)) return null;
  const parsed = parseNoteToken(formatSpelling(step, alter));
  if (!parsed) return null;
  return (octave + 1) * 12 + parsed.pc;
}

function scanNotes(measure: Element, mode: 'melody' | 'held' | 'all', divisions: number): NoteScan {
  const spellings: string[] = [];
  const attacks: NoteAttack[] = [];
  const midis: NoteMidi[] = [];
  const voices = new Set<string>();
  let pitched = 0;
  let rests = 0;
  let grace = 0;
  let cue = 0;
  let durationBeats = 0;
  for (const note of childElements(measure, 'note')) {
    const voice = firstText(note, 'voice') ?? '1';
    voices.add(voice);
    if (mode === 'melody' && voice !== '1') continue;
    if (mode === 'held' && voice === '1') continue;
    if (hasChild(note, 'grace')) {
      grace += 1;
      continue;
    }
    if (hasChild(note, 'cue')) {
      cue += 1;
      continue;
    }
    const duration = parseInt(firstText(note, 'duration') ?? '0', 10);
    const beats = divisions > 0 && Number.isFinite(duration) ? duration / divisions : 0;
    if (hasChild(note, 'rest')) {
      rests += 1;
      continue;
    }
    const pitch = childElements(note, 'pitch')[0];
    const step = pitch ? firstText(pitch, 'step') : undefined;
    if (!pitch || !step) continue;
    const spelling = formatSpelling(step, firstText(pitch, 'alter'));
    const midi = attackMidi(step, firstText(pitch, 'alter'), firstText(pitch, 'octave'));
    const ties = childElements(note, 'tie').map((tie) => tie.getAttribute('type') ?? '');
    const continuation = ties.includes('stop') && !ties.includes('start');
    if (continuation && spellings.includes(spelling)) {
      const existing = attacks.find((attack) => attack.spelling === spelling);
      if (existing) existing.durationBeats += beats;
      if (midi !== null) {
        const held = midis.find((attack) => attack.midi === midi);
        if (held) held.durationBeats += beats;
        else midis.push({ midi, durationBeats: beats });
      }
      durationBeats += beats;
      continue;
    }
    if (!spellings.includes(spelling)) spellings.push(spelling);
    const existing = attacks.find((attack) => attack.spelling === spelling);
    if (existing) existing.durationBeats += beats;
    else attacks.push({ spelling, durationBeats: beats });
    if (midi !== null) {
      const held = midis.find((attack) => attack.midi === midi);
      if (held) held.durationBeats += beats;
      else midis.push({ midi, durationBeats: beats });
    }
    pitched += 1;
    durationBeats += beats;
  }
  return { spellings, attacks, midis, pitched, rests, grace, cue, durationBeats, voices: [...voices] };
}

function degreeTokens(harmony: Element): string[] {
  const tokens: string[] = [];
  for (const degree of childElements(harmony, 'degree')) {
    const type = (firstText(degree, 'degree-type') ?? '').toLowerCase();
    const value = firstText(degree, 'degree-value') ?? '';
    const alter = parseInt(firstText(degree, 'degree-alter') ?? '0', 10);
    if (type === 'subtract' || !value) continue;
    const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : '';
    if (type === 'add' && alter === 0) tokens.push(`add${value}`);
    else if (accidental) tokens.push(`${accidental}${value}`);
    else if (type === 'alter') tokens.push(value);
  }
  return tokens;
}

function normalizeHarmonyText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9#]+/g, '');
}

function harmonySymbol(
  harmony: Element,
  diagnostics: string[],
  label: string
): { symbol: string; displayText: string | null; richerThanEncoded: boolean; offsetDivisions: number | null } | null {
  const kind = childElements(harmony, 'kind')[0];
  const kindBody = (kind?.textContent ?? '').trim().toLowerCase();
  const kindText = kind?.getAttribute('text')?.trim() || null;
  const offsetRawEarly = firstText(harmony, 'offset');
  const offsetEarly = offsetRawEarly ? parseInt(offsetRawEarly, 10) : NaN;
  if (kindBody === 'none') {
    diagnostics.push(`Measure ${label}: harmony kind none is N.C. Any residual root is ignored.`);
    return {
      symbol: 'N.C.',
      displayText: kindText,
      richerThanEncoded: false,
      offsetDivisions: Number.isFinite(offsetEarly) ? offsetEarly : null,
    };
  }
  const root = childElements(harmony, 'root')[0];
  const step = root ? firstText(root, 'root-step') : undefined;
  if (!step || !/^[A-Ga-g]$/.test(step)) {
    diagnostics.push(`Measure ${label}: harmony element has no readable root. Symbol omitted.`);
    return null;
  }
  const encodedParts = [...(KIND_SUFFIX[kindBody] ? [KIND_SUFFIX[kindBody]] : []), ...degreeTokens(harmony)].filter((part) => part.length > 0);
  const encodedNorm = normalizeHarmonyText(encodedParts.join(''));
  const displayNorm = kindText ? normalizeHarmonyText(kindText) : '';
  const richerThanEncoded = Boolean(displayNorm) && displayNorm !== encodedNorm;
  let suffix = '';
  if (kindText) suffix = kindText;
  else if (kindBody in KIND_SUFFIX) suffix = KIND_SUFFIX[kindBody] ?? '';
  else if (encodedParts.length > 0) suffix = encodedParts.join('');
  else if (kindBody) {
    diagnostics.push(`Measure ${label}: unsupported harmony kind "${kindBody}". Symbol omitted.`);
    return null;
  }
  const bass = childElements(harmony, 'bass')[0];
  const bassStep = bass ? firstText(bass, 'bass-step') : undefined;
  let slash = '';
  if (bassStep) {
    if (!/^[A-Ga-g]$/.test(bassStep)) {
      diagnostics.push(`Measure ${label}: slash bass "${bassStep}" is not a note name. Slash omitted.`);
    } else {
      slash = `/${formatSpelling(bassStep, bass ? firstText(bass, 'bass-alter') : undefined)}`;
    }
  }
  const offsetRaw = firstText(harmony, 'offset');
  const offset = offsetRaw ? parseInt(offsetRaw, 10) : NaN;
  return {
    symbol: `${formatSpelling(step, root ? firstText(root, 'root-alter') : undefined)}${suffix}${slash}`,
    displayText: kindText,
    richerThanEncoded,
    offsetDivisions: Number.isFinite(offset) ? offset : null,
  };
}

function shiftSpelling(spelling: string, semitones: number): string {
  const parsed = parseNoteToken(spelling);
  if (!parsed || semitones === 0) return spelling;
  return PENTATONIC_NOTE_CHOICES[mod12(parsed.pc + semitones)] ?? spelling;
}

function shiftList(notes: string[] | undefined, semitones: number): string[] | undefined {
  if (!notes || semitones === 0) return notes;
  const shifted: string[] = [];
  for (const note of notes) {
    const next = shiftSpelling(note, semitones);
    if (!shifted.includes(next)) shifted.push(next);
  }
  return shifted;
}

function directionOffset(direction: Element): number | null {
  const raw = firstText(direction, 'offset');
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function sourceBoundary(measure: Element): {
  boundary: boolean;
  reasons: string[];
  marks: string[];
  motifs: { label: string; offsetDivisions: number | null }[];
} {
  const reasons: string[] = [];
  const marks: string[] = [];
  const motifs: { label: string; offsetDivisions: number | null }[] = [];
  for (const direction of childElements(measure, 'direction')) {
    const offsetDivisions = directionOffset(direction);
    for (const node of direction.getElementsByTagName('*')) {
      const name = localName(node);
      if (name !== 'rehearsal' && name !== 'words') continue;
      const text = (node.textContent ?? '').trim();
      if (!text) continue;
      if (name === 'words' && MOTIF_MARK.test(text)) {
        motifs.push({ label: text, offsetDivisions });
        continue;
      }
      marks.push(text);
      if (name === 'rehearsal') reasons.push(`rehearsal "${text}"`);
      else if (LETTER_MARK.test(text)) reasons.push(`section letter "${text}"`);
    }
  }
  return { boundary: reasons.length > 0, reasons, marks, motifs };
}

function keySignaturesIn(measure: Element, sourceLabel: string): PentatonicKeySignature[] {
  const found: PentatonicKeySignature[] = [];
  for (const attributes of childElements(measure, 'attributes')) {
    for (const key of childElements(attributes, 'key')) {
      const fifths = parseInt(firstText(key, 'fifths') ?? '', 10);
      if (!Number.isFinite(fifths)) continue;
      found.push({ sourceLabel, fifths, mode: firstText(key, 'mode') ?? null });
    }
  }
  return found;
}

interface RunningState {
  divisions: number;
  beats: number | null;
  beatType: number | null;
  fifths: number | null;
  mode: string | null;
  chromatic: number | null;
  octaveChange: number | null;
}

function readAttributes(measure: Element, state: RunningState): void {
  for (const attributes of childElements(measure, 'attributes')) {
    const divisions = parseInt(firstText(attributes, 'divisions') ?? '', 10);
    if (Number.isFinite(divisions) && divisions > 0) state.divisions = divisions;
    const time = childElements(attributes, 'time')[0];
    if (time) {
      const beats = parseInt(firstText(time, 'beats') ?? '', 10);
      const beatType = parseInt(firstText(time, 'beat-type') ?? '', 10);
      if (Number.isFinite(beats) && beats > 0) state.beats = beats;
      if (Number.isFinite(beatType) && beatType > 0) state.beatType = beatType;
    }
    const key = childElements(attributes, 'key')[0];
    if (key) {
      const fifths = parseInt(firstText(key, 'fifths') ?? '', 10);
      if (Number.isFinite(fifths)) state.fifths = fifths;
      const mode = firstText(key, 'mode');
      if (mode) state.mode = mode;
    }
    const transpose = childElements(attributes, 'transpose')[0];
    if (transpose) {
      const chromatic = parseInt(firstText(transpose, 'chromatic') ?? '', 10);
      const octave = parseInt(firstText(transpose, 'octave-change') ?? '', 10);
      if (Number.isFinite(chromatic)) state.chromatic = chromatic;
      if (Number.isFinite(octave)) state.octaveChange = octave;
    }
  }
}

function measuresOf(part: Element | null): Element[] {
  if (!part) return [];
  return childElements(part, 'measure');
}

function emptyImport(diagnostics: string[], parse: number): PentatonicScoreImport {
  return {
    title: '',
    movementTitle: '',
    orderPolicy: PENTATONIC_SCORE_ORDER_POLICY,
    parts: [],
    melodyPartId: null,
    bassPartId: null,
    events: [],
    diagnostics,
    warnings: [],
    repeatDetected: false,
    endingDetected: false,
    navigationLabels: [],
    pickupLabels: [],
    pitchPolicy: 'written-only',
    timingsMs: { parse, extract: 0 },
  };
}

/**
 * Turn one complete partwise MusicXML score into ordered path events.
 * Source text is not modified. Pitch classes are written spellings.
 */
export function importPentatonicScoreFromMusicXml(xml: string): PentatonicScoreImport {
  const parseStart = performance.now();
  ensureMusicXmlDomParserPolyfill();
  const Parser = (globalThis as unknown as { DOMParser?: typeof DOMParser }).DOMParser;
  if (!Parser) return emptyImport(['DOMParser is unavailable.'], 0);
  const trimmed = xml.trim();
  if (!trimmed.includes('<score-partwise') && !trimmed.includes('<score-timewise')) {
    return emptyImport(['Not MusicXML partwise or timewise.'], performance.now() - parseStart);
  }
  if (trimmed.includes('<score-timewise') && !trimmed.includes('<score-partwise')) {
    return emptyImport(['Timewise MusicXML is not expanded. Export partwise.'], performance.now() - parseStart);
  }
  const doc = new Parser().parseFromString(xml, 'application/xml');
  const parseMs = performance.now() - parseStart;
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return emptyImport(['MusicXML parser reported an error. No events were guessed.'], parseMs);
  }

  const extractStart = performance.now();
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const parts = readPartList(doc);
  const melodyParts = parts.filter((part) => part.role === 'melody');
  const bassParts = parts.filter((part) => part.role === 'bass');
  if (melodyParts.length === 0) warnings.push('No guitar part identified from part or instrument names. Melody evidence left empty.');
  if (bassParts.length === 0) warnings.push('No upright-bass part identified from part or instrument names. Bass evidence left empty. Missing bass is not a rest.');
  const partEls = partElements(doc);
  const byId = new Map(partEls.map((part) => [part.getAttribute('id') ?? '', part]));
  let melodyEl = melodyParts[0] ? byId.get(melodyParts[0].id) ?? null : null;
  let bassEl = bassParts[0] ? byId.get(bassParts[0].id) ?? null : null;
  const staffSignature = (part: Element | null, mode: 'melody' | 'all'): string =>
    measuresOf(part)
      .map((measure) => scanNotes(measure, mode, 1).spellings.join(','))
      .join('|');
  if (melodyParts.length > 1) {
    const first = staffSignature(melodyEl, 'melody');
    const same = melodyParts.slice(1).every((part) => staffSignature(byId.get(part.id) ?? null, 'melody') === first);
    if (same) diagnostics.push('Duplicate guitar staff matches the first guitar. Duplicate melody evidence suppressed.');
    else {
      warnings.push('Multiple guitar parts disagree. Melody evidence omitted. No staff was guessed.');
      melodyEl = null;
    }
  }
  if (bassParts.length > 1) {
    const first = staffSignature(bassEl, 'all');
    const same = bassParts.slice(1).every((part) => staffSignature(byId.get(part.id) ?? null, 'all') === first);
    if (same) diagnostics.push('Duplicate bass staff matches the first bass. Duplicate bass evidence suppressed.');
    else {
      warnings.push('Multiple bass parts disagree. Bass evidence omitted. No staff was guessed.');
      bassEl = null;
    }
  }
  const melodyMeasures = measuresOf(melodyEl);
  const bassMeasures = measuresOf(bassEl);
  if (melodyEl && bassEl && melodyMeasures.length !== bassMeasures.length) {
    warnings.push(
      `Guitar has ${melodyMeasures.length} measures and bass has ${bassMeasures.length}. Alignment is written order, not invented bar numbers.`
    );
  }

  const repeatDetected = doc.getElementsByTagName('repeat').length > 0;
  const endingDetected = doc.getElementsByTagName('ending').length > 0;
  const navigationLabels: string[] = [];
  if (repeatDetected || endingDetected) {
    diagnostics.push('Repeats or endings are present. Order policy is written score order. Performed order was not expanded.');
  }
  for (const name of ['segno', 'coda']) {
    if (doc.getElementsByTagName(name).length > 0) {
      navigationLabels.push(name);
    }
  }

  const count = Math.max(melodyMeasures.length, bassMeasures.length);
  const guitarState: RunningState = {
    divisions: 1,
    beats: null,
    beatType: null,
    fifths: null,
    mode: null,
    chromatic: null,
    octaveChange: null,
  };
  const bassState: RunningState = { ...guitarState };
  let carried: string | undefined;
  let hiddenHarmony = 0;
  let multiHarmony = 0;
  let firstFifths: number | null = null;
  let firstMode: string | null = null;
  const pickupLabels: string[] = [];
  const events: PentatonicScoreEvent[] = [];
  const motifs: PentatonicMotifMark[] = [];
  const keySignatures: PentatonicKeySignature[] = [];
  const seenLabels = new Map<string, number>();

  for (let index = 0; index < count; index++) {
    const guitar = melodyMeasures[index] ?? null;
    const bass = bassMeasures[index] ?? null;
    const labelSource = guitar ?? bass;
    const rawLabel = labelSource?.getAttribute('number');
    const sourceLabel = rawLabel === null || rawLabel === undefined || rawLabel === '' ? '' : rawLabel;
    if (!sourceLabel) {
      diagnostics.push(`Order index ${index} has no measure number attribute. No displayed number was invented.`);
    } else {
      seenLabels.set(sourceLabel, (seenLabels.get(sourceLabel) ?? 0) + 1);
    }
    if (labelSource?.getAttribute('implicit') === 'yes' && sourceLabel) pickupLabels.push(sourceLabel);
    const bassLabel = bass?.getAttribute('number') ?? '';
    if (guitar && bass && sourceLabel && bassLabel && sourceLabel !== bassLabel) {
      diagnostics.push(`Order index ${index}: guitar measure label "${sourceLabel}" and bass measure label "${bassLabel}" differ.`);
    }

    if (guitar) readAttributes(guitar, guitarState);
    if (bass) readAttributes(bass, bassState);
    if (firstFifths === null && guitarState.fifths !== null) {
      firstFifths = guitarState.fifths;
      firstMode = guitarState.mode;
    }

    const boundary = guitar
      ? sourceBoundary(guitar)
      : { boundary: false, reasons: [] as string[], marks: [] as string[], motifs: [] as { label: string; offsetDivisions: number | null }[] };
    if (guitar) keySignatures.push(...keySignaturesIn(guitar, sourceLabel || String(index)));
    for (const motif of boundary.motifs) {
      motifs.push({ type: 'motif', label: motif.label, sourceLabel: sourceLabel || String(index), offsetDivisions: motif.offsetDivisions });
    }
    for (const mark of boundary.marks) {
      if (NAV_MARK.test(mark)) navigationLabels.push(`${sourceLabel || index}:${mark}`);
    }
    const noChordMark = boundary.marks.some((mark) => NC_MARK.test(mark));
    const harmonies = guitar ? childElements(guitar, 'harmony') : [];
    let chordSymbol: string | undefined;
    let chordCarried = false;
    const harmonyEvidence: PentatonicHarmonyEvidence[] = [];
    if (noChordMark) {
      carried = undefined;
      diagnostics.push(`Measure ${sourceLabel || index}: N.C. ends inherited harmony.`);
    }
    if (harmonies.length > 1) multiHarmony += 1;
    const seenHarmony = new Set<string>();
    for (const harmony of harmonies) {
      if (harmony.getAttribute('print-object') === 'no') hiddenHarmony += 1;
      const parsed = harmonySymbol(harmony, diagnostics, sourceLabel || `order ${index}`);
      if (!parsed) continue;
      const key = `${parsed.symbol}@${parsed.offsetDivisions ?? 0}`;
      if (seenHarmony.has(key)) continue;
      seenHarmony.add(key);
      harmonyEvidence.push(parsed);
      if (parsed.richerThanEncoded) {
        diagnostics.push(`Measure ${sourceLabel || index}: chord_text_richer_than_encoded_harmony ${parsed.displayText ?? ''}`);
      }
    }
    let endedOnNoChord = noChordMark;
    let printedSymbol: string | undefined;
    for (const item of harmonyEvidence) {
      if (NC_MARK.test(item.symbol)) {
        printedSymbol = undefined;
        carried = undefined;
        endedOnNoChord = true;
        diagnostics.push(`Measure ${sourceLabel || index}: N.C. ends inherited harmony.`);
      } else {
        printedSymbol = item.symbol;
        carried = item.symbol;
        endedOnNoChord = false;
      }
    }
    if (printedSymbol && !endedOnNoChord) {
      chordSymbol = printedSymbol;
      chordCarried = false;
    } else if (carried && !endedOnNoChord) {
      chordSymbol = carried;
      chordCarried = true;
    }

    const melodyScan = guitar ? scanNotes(guitar, 'melody', guitarState.divisions) : emptyScan();
    const heldScan = guitar ? scanNotes(guitar, 'held', guitarState.divisions) : emptyScan();
    const bassScan = bass ? scanNotes(bass, 'all', bassState.divisions || guitarState.divisions) : emptyScan();

    if (guitar && melodyScan.grace > 0) diagnostics.push(`Measure ${sourceLabel || index}: ${melodyScan.grace} grace notes omitted from melody evidence.`);
    if (guitar && melodyScan.cue > 0) diagnostics.push(`Measure ${sourceLabel || index}: ${melodyScan.cue} cue notes omitted.`);
    if (guitar && melodyScan.pitched === 0 && melodyScan.rests === 0 && heldScan.pitched === 0) {
      diagnostics.push(`Measure ${sourceLabel || index}: guitar measure has no note elements.`);
    }
    if (!bass) {
      diagnostics.push(`Measure ${sourceLabel || index}: no bass measure at this written position. Bass rest was not assumed.`);
    } else if (bassScan.pitched === 0 && bassScan.rests === 0) {
      diagnostics.push(`Measure ${sourceLabel || index}: bass measure has no note elements. Bass rest was not assumed.`);
    }

    const guitarShift = guitarState.chromatic ?? 0;
    const bassShift = bassState.chromatic ?? 0;
    const melodyNotes = shiftList(melodyScan.spellings, guitarShift);
    const heldNotes = shiftList(heldScan.spellings, guitarShift);
    const bassNotes = shiftList(bassScan.spellings, bassShift);
    const soundingAttacks: PentatonicSoundingAttack[] = [
      ...melodyScan.attacks.map((attack) => ({
        role: 'melody' as const,
        spelling: shiftSpelling(attack.spelling, guitarShift),
        durationBeats: Math.round(attack.durationBeats * 1000) / 1000,
      })),
      ...bassScan.attacks.map((attack) => ({
        role: 'bass' as const,
        spelling: shiftSpelling(attack.spelling, bassShift),
        durationBeats: Math.round(attack.durationBeats * 1000) / 1000,
      })),
    ];
    const registerAttacks: PentatonicRegisterAttack[] = [
      ...melodyScan.midis.map((attack) => ({
        role: 'melody' as const,
        midi: attack.midi + guitarShift,
        durationBeats: Math.round(attack.durationBeats * 1000) / 1000,
      })),
      ...bassScan.midis.map((attack) => ({
        role: 'bass' as const,
        midi: attack.midi + bassShift,
        durationBeats: Math.round(attack.durationBeats * 1000) / 1000,
      })),
    ];
    const melodyRest =
      Boolean(guitar) && (melodyNotes?.length ?? 0) === 0 && (melodyScan.rests > 0 || heldScan.pitched > 0);
    const bassRest = Boolean(bass) && bassScan.pitched === 0 && bassScan.rests > 0;
    const durationBeats =
      melodyScan.durationBeats > 0
        ? Math.round(melodyScan.durationBeats * 1000) / 1000
        : bassScan.durationBeats > 0
          ? Math.round(bassScan.durationBeats * 1000) / 1000
          : guitarState.beats ?? undefined;

    events.push({
      id: `score-${index + 1}`,
      orderIndex: index,
      sourceLabel: sourceLabel || `unlabelled-order-${index}`,
      ...(chordSymbol ? { chordSymbol } : {}),
      chordCarried,
      harmonyEvidence,
      soundingAttacks,
      ...(registerAttacks.length > 0 ? { registerAttacks } : {}),
      ...(melodyNotes && melodyNotes.length > 0 ? { melodyNotes } : {}),
      ...(bassNotes && bassNotes.length > 0 ? { bassNotes } : {}),
      ...(heldNotes && heldNotes.length > 0 ? { heldNotes } : {}),
      ...(melodyRest ? { melodyRest: true } : {}),
      ...(bassRest ? { bassRest: true } : {}),
      ...(durationBeats !== undefined ? { durationBeats } : {}),
      sourceBoundary: boundary.boundary,
      sourceBoundaryReasons: boundary.reasons,
      sectionMarks: boundary.marks,
      timeBeats: guitarState.beats,
      timeBeatType: guitarState.beatType,
    });
  }

  for (let index = 0; index < events.length; index++) {
    const event = events[index]!;
    if (event.sourceLabel.startsWith('unlabelled-order-')) continue;
    if ((seenLabels.get(event.sourceLabel) ?? 0) > 1) {
      diagnostics.push(`Measure label "${event.sourceLabel}" occurs more than once. Identity is written order index ${event.orderIndex}.`);
    }
  }
  if (multiHarmony > 0) {
    diagnostics.push(`${multiHarmony} measures contain more than one harmony element. The first in written order was used.`);
  }
  if (hiddenHarmony > 0) {
    diagnostics.push(`${hiddenHarmony} harmony elements have print-object="no" and were still read.`);
  }
  diagnostics.push('Motif labels such as M1 and M1 colour are annotations. They are not phrase boundaries.');
  diagnostics.push('Chord symbols carry forward until the next printed symbol or N.C. A chord change is not a phrase boundary.');
  diagnostics.push('Order policy: written score order. Repeats, endings, segno, coda, D.S., and D.C. are reported and not unfolded.');
  diagnostics.push('Guitar melody is voice 1, including chord stacks on that voice. Other guitar voices stay texture/held evidence. This matched the frozen Dev 2 fixtures.');
  if (navigationLabels.length > 0) {
    diagnostics.push(`Navigation left in written order: ${[...new Set(navigationLabels)].join(', ')}.`);
  }
  const pitchPolicy: PentatonicPitchPolicy =
    (guitarState.chromatic ?? 0) !== 0 || (bassState.chromatic ?? 0) !== 0
      ? 'concert-from-written-transpose'
      : guitarState.chromatic === 0
        ? 'written-equals-concert'
        : 'written-only';

  if (guitarState.chromatic === 0 && guitarState.octaveChange !== null && guitarState.octaveChange !== 0) {
    diagnostics.push(
      `Guitar transpose is octave-change ${guitarState.octaveChange} with chromatic 0. Written pitch classes match concert pitch classes. Spellings stay written.`
    );
  } else if (guitarState.chromatic !== null && guitarState.chromatic !== 0) {
    warnings.push(
      `Guitar chromatic transpose is ${guitarState.chromatic}. Written pitches were kept. Concert pitch was not applied.`
    );
  }
  if (bassState.chromatic !== null && bassState.chromatic !== 0) {
    warnings.push(`Bass chromatic transpose is ${bassState.chromatic}. Written pitches were kept. Concert pitch was not applied.`);
  }
  if (firstFifths !== null) {
    diagnostics.push(`First guitar key signature is fifths ${firstFifths}${firstMode ? ` ${firstMode}` : ''}.`);
  }

  const uniqueDiagnostics = [...new Set(diagnostics)];
  return {
    title: titleText(doc, 'work-title'),
    movementTitle: titleText(doc, 'movement-title'),
    orderPolicy: PENTATONIC_SCORE_ORDER_POLICY,
    parts,
    melodyPartId: melodyParts[0]?.id ?? null,
    bassPartId: bassParts[0]?.id ?? null,
    events,
    motifs,
    keySignatures,
    diagnostics: uniqueDiagnostics,
    warnings,
    repeatDetected,
    endingDetected,
    navigationLabels: [...new Set(navigationLabels)],
    pickupLabels,
    pitchPolicy,
    timingsMs: { parse: parseMs, extract: performance.now() - extractStart },
  };
}
