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
