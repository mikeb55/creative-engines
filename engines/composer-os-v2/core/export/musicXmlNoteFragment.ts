import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';

/**
 * Canonical MusicXML 3.1 partwise <note> serialization for Composer OS ScoreModel export.
 *
 * Child order matches the MusicXML "full-note" group: pitch|rest, duration, tie*,
 * then voice before type/dot, then stem (multi-voice), then notations.
 * Sibelius DTD: voice before type; stem after type/dot (before notations).
 *
 * For multi-voice single-staff guitar, callers may pass staffXml (<staff>1</staff>) so Sibelius/GP8
 * bind each voice layer to the staff (omit when monophonic).
 *
 * Sibelius-safe: <type> must precede <staff> on every note; rest and pitched paths use the same ordering.
 */

/** MIDI number → MusicXML pitch components (export spelling may favour flats when `preferFlats`). */
export type MidiPitchParts = { step: string; alter: number; octave: number };

/**
 * Maps sharp spelling (step + alter +1) to flat spelling for flat-key scores (negative fifths).
 * C#→Db, D#→Eb, F#→Gb, G#→Ab, A#→Bb at same octave.
 */
const ENHARM_SHARP_TO_FLAT: Record<string, { step: string; alter: number }> = {
  C: { step: 'D', alter: -1 },
  D: { step: 'E', alter: -1 },
  F: { step: 'G', alter: -1 },
  G: { step: 'A', alter: -1 },
  A: { step: 'B', alter: -1 },
};

const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function accidentalDelta(accidental: string): number {
  if (accidental === '#') return 1;
  if (accidental === '##' || accidental === 'x') return 2;
  if (accidental === 'b') return -1;
  if (accidental === 'bb') return -2;
  return 0;
}

/**
 * Write `spelling` at the sounding pitch of `midi`.
 * Octave follows the written letter, so Cb above B and B# below C stay the same MIDI note.
 */
export type ExplicitPitchSpelling = { step: string; alter: number };

function accidentalSuffix(alter: number): string {
  if (alter === 1) return '#';
  if (alter === -1) return 'b';
  if (alter === 2) return '##';
  if (alter === -2) return 'bb';
  return '';
}

/**
 * Written spelling for one note. Absent spelling keeps `midiToPitch` unchanged.
 */
export function pitchPartsForExport(
  midi: number,
  preferFlats: boolean,
  spelling?: ExplicitPitchSpelling | null
): MidiPitchParts {
  if (!spelling?.step) return midiToPitch(midi, preferFlats);
  const spelled = spelledPitch(midi, `${spelling.step}${accidentalSuffix(spelling.alter)}`);
  return spelled ?? midiToPitch(midi, preferFlats);
}

export function spelledPitch(midi: number, spelling: string): MidiPitchParts | null {
  const match = spelling.trim().match(/^([A-Ga-g])(bb|##|b|#|x)?$/);
  if (!match || !Number.isFinite(midi)) return null;
  const step = match[1]!.toUpperCase();
  const alter = accidentalDelta(match[2] ?? '');
  const rounded = Math.round(midi);
  const letterPc = NATURAL_PC[step];
  if (letterPc === undefined) return null;
  const sounding = ((letterPc + alter) % 12 + 12) % 12;
  if (sounding !== ((rounded % 12) + 12) % 12) return null;
  let octave = Math.floor(rounded / 12) - 1;
  let written = (octave + 1) * 12 + letterPc + alter;
  if (written !== rounded) octave += Math.round((rounded - written) / 12);
  return { step, alter, octave };
}

export function midiToPitch(
  midi: number,
  preferFlats = false,
  spellingByPc?: Readonly<Record<number, string>> | null
): MidiPitchParts {
  const stepMap: Record<number, { step: string; alter: number }> = {
    0: { step: 'C', alter: 0 },
    1: { step: 'C', alter: 1 },
    2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 },
    4: { step: 'E', alter: 0 },
    5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 },
    7: { step: 'G', alter: 0 },
    8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 },
    10: { step: 'A', alter: 1 },
    11: { step: 'B', alter: 0 },
  };
  if (!Number.isFinite(midi)) {
    return { step: 'C', alter: 0, octave: 4 };
  }
  const rounded = Math.round(midi);
  const semitones = ((rounded % 12) + 12) % 12;
  const hinted = spellingByPc?.[semitones];
  if (hinted) {
    const spelled = spelledPitch(rounded, hinted);
    if (spelled) return spelled;
  }
  const octave = Math.floor(rounded / 12) - 1;
  const entry = stepMap[semitones];
  if (!entry) {
    return { step: 'C', alter: 0, octave };
  }
  let { step, alter } = entry;
  if (preferFlats && alter === 1) {
    const flat = ENHARM_SHARP_TO_FLAT[step];
    if (flat) {
      step = flat.step;
      alter = flat.alter;
    }
  }
  return { step, alter, octave };
}

/** True when the chord root is spelled with a flat (Db, Eb, Ab, …). */
export function chordSymbolPrefersFlats(symbol: string): boolean {
  const root = symbol.trim().match(/^([A-G](?:#|b|♭|#)?)/i)?.[1] ?? '';
  return /b|♭/i.test(root);
}

const HARMONY_QUALITY: Record<string, readonly number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  maj7: [0, 4, 7, 11],
  'maj7(#11)': [0, 4, 6, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  '7sus4': [0, 5, 7, 10],
  sus4: [0, 5, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
};

function chordTonesForReleaseSymbol(symbol: string): { rootPc: number; tones: number[] } | null {
  const raw = symbol.trim();
  if (!raw || /\s/.test(raw)) return null;
  let body = raw;
  let bassName: string | null = null;
  const slash = raw.lastIndexOf('/');
  if (slash > 0) {
    body = raw.slice(0, slash);
    bassName = raw.slice(slash + 1);
    if (!/^[A-G](?:#|b)?$/i.test(bassName)) return null;
  }
  const match = body.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!match?.[1] || match[2] == null) return null;
  const rootName = match[1][0]!.toUpperCase() + match[1].slice(1);
  const quality = match[2];
  const intervals = HARMONY_QUALITY[quality];
  if (!intervals) return null;
  const rootPc = noteNameToPitchClass(rootName);
  const bassPc = bassName ? noteNameToPitchClass(bassName[0]!.toUpperCase() + bassName.slice(1)) : rootPc;
  if (rootPc === undefined || bassPc === undefined) return null;
  const tones = [...new Set([...intervals.map((i) => mod12(rootPc + i)), bassPc])];
  return { rootPc, tones };
}

/** Pitch-class spellings for chord tones; flat roots favour flats; `(#n)` extensions keep sharps. */
export function buildHarmonicContextSpellingMap(symbol: string): Readonly<Record<number, string>> {
  const trimmed = symbol.trim();
  const ch = chordTonesForReleaseSymbol(trimmed);
  if (!ch) return {};
  const preferFlats = chordSymbolPrefersFlats(trimmed);
  const sharpPcFromAlter = new Set<number>();
  const extSemi: Record<number, number> = { 9: 2, 11: 6, 13: 9 };
  for (const m of trimmed.matchAll(/#\s*(\d+)/g)) {
    const deg = parseInt(m[1]!, 10);
    const semi = extSemi[deg];
    if (semi != null) sharpPcFromAlter.add(mod12(ch.rootPc + semi));
  }
  for (const m of trimmed.matchAll(/([A-G])#/g)) {
    const letter = m[1]!.toUpperCase();
    const pc = NATURAL_PC[letter];
    if (pc != null) sharpPcFromAlter.add(mod12(pc + 1));
  }

  const map: Record<number, string> = {};
  for (const pc of ch.tones) {
    const norm = mod12(pc);
    if (map[norm] !== undefined) continue;
    const useFlats = preferFlats && !sharpPcFromAlter.has(norm);
    const parts = midiToPitch(60 + norm, useFlats);
    map[norm] = `${parts.step}${accidentalSuffix(parts.alter)}`;
  }
  return map;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Per-bar harmonic spelling maps (1-based bar → pitch-class → spelling token). */
export function buildBarHarmonicSpellingMaps(
  symbolForBar: (bar: number) => string,
  totalBars: number
): Record<number, Readonly<Record<number, string>>> {
  const out: Record<number, Readonly<Record<number, string>>> = {};
  for (let bar = 1; bar <= totalBars; bar += 1) {
    out[bar] = buildHarmonicContextSpellingMap(symbolForBar(bar));
  }
  return out;
}

/** Apply bar-specific spelling maps inside each `<part>`. Sounding MIDI unchanged. */
export function applyBarContextPitchSpellings(
  xml: string,
  spellingByBar: Readonly<Record<number, Readonly<Record<number, string>>>>
): string {
  return xml.replace(
    /<part id="([^"]+)">([\s\S]*?)(?=<part id=|<\/score-partwise>)/g,
    (_full, _id: string, body: string) => {
      const rewritten = body.replace(
        /<measure number="(\d+)">([\s\S]*?)(?=<measure number=|<\/part>)/g,
        (mFull, num: string, inner: string) => {
          const bar = parseInt(num, 10);
          const map = spellingByBar[bar];
          if (!map || Object.keys(map).length === 0) return mFull;
          return `<measure number="${num}">${applyContextPitchSpellings(inner, map)}`;
        }
      );
      return `<part id="${_id}">${rewritten}`;
    }
  );
}

/** Rewrite `<pitch>` spellings for pitch classes present in `spellingByPc`. Other pitches stay as exported. */
export function applyContextPitchSpellings(
  xml: string,
  spellingByPc: Readonly<Record<number, string>> | null | undefined
): string {
  if (!spellingByPc || Object.keys(spellingByPc).length === 0) return xml;
  return xml.replace(
    /<pitch>\s*<step>([A-G])<\/step>\s*(?:<alter>(-?\d+)<\/alter>\s*)?<octave>(-?\d+)<\/octave>\s*<\/pitch>/g,
    (full, step: string, alterText: string | undefined, octaveText: string) => {
      const alter = alterText === undefined ? 0 : parseInt(alterText, 10);
      const octave = parseInt(octaveText, 10);
      const letterPc = NATURAL_PC[step];
      if (letterPc === undefined || !Number.isFinite(alter) || !Number.isFinite(octave)) return full;
      const midi = (octave + 1) * 12 + letterPc + alter;
      const hinted = spellingByPc[((midi % 12) + 12) % 12];
      if (!hinted) return full;
      const spelled = spelledPitch(midi, hinted);
      if (!spelled) return full;
      if (spelled.step === step && spelled.alter === alter && spelled.octave === octave) return full;
      const alterEl = spelled.alter !== 0 ? `<alter>${spelled.alter}</alter>` : '';
      return `<pitch><step>${spelled.step}</step>${alterEl}<octave>${spelled.octave}</octave></pitch>`;
    }
  );
}

/** Rest note: rest → duration → voice → type (+ dots) → staff? (must match pitched-note discipline). */
export function noteXmlRestFragment(opts: {
  durationTicks: number;
  voice: number;
  typeAndDotsXml: string;
  /** After type/dot: explicit staff for single-staff polyphony (never before <type>). */
  staffXml?: string;
  /** Beam and notations after staff. Omitted by legacy callers. */
  trailingXml?: string;
}): string {
  const { durationTicks, voice, typeAndDotsXml, staffXml = '', trailingXml = '' } = opts;
  return `        <note><rest/><duration>${durationTicks}</duration><voice>${voice}</voice>${typeAndDotsXml}${staffXml}${trailingXml}</note>\n`;
}

/** Pitched note: pitch → duration → tie → voice → type (+ dots) → stem? → staff? → notations. */
export function noteXmlPitchedFragment(opts: {
  dynamicsAttr: string;
  pitchXml: string;
  durationTicks: number;
  tieXml: string;
  voice: number;
  typeAndDotsXml: string;
  /** Same duration as preceding note — stacked chord tone (`<chord/>` before pitch). */
  chordXml?: string;
  /** Multi-voice: stem element so Sibelius / Guitar Pro render separate voices on one staff. */
  stemXml?: string;
  /** After stem: explicit staff for single-staff polyphony (Sibelius / GP8). */
  staffXml?: string;
  /** Between staff and notations. Omitted by legacy callers. */
  beamXml?: string;
  notationsXml: string;
}): string {
  const {
    dynamicsAttr,
    pitchXml,
    durationTicks,
    tieXml,
    voice,
    typeAndDotsXml,
    chordXml = '',
    stemXml = '',
    staffXml = '',
    beamXml = '',
    notationsXml,
  } = opts;
  return `        <note${dynamicsAttr}>${chordXml}${pitchXml}<duration>${durationTicks}</duration>${tieXml}<voice>${voice}</voice>${typeAndDotsXml}${stemXml}${staffXml}${beamXml}${notationsXml}</note>\n`;
}
