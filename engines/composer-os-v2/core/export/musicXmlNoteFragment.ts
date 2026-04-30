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

export function midiToPitch(midi: number, preferFlats = false): MidiPitchParts {
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

/** Rest note: rest → duration → voice → type (+ dots) → staff? (must match pitched-note discipline). */
export function noteXmlRestFragment(opts: {
  durationTicks: number;
  voice: number;
  typeAndDotsXml: string;
  /** After type/dot: explicit staff for single-staff polyphony (never before <type>). */
  staffXml?: string;
}): string {
  const { durationTicks, voice, typeAndDotsXml, staffXml = '' } = opts;
  return `        <note><rest/><duration>${durationTicks}</duration><voice>${voice}</voice>${typeAndDotsXml}${staffXml}</note>\n`;
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
    notationsXml,
  } = opts;
  return `        <note${dynamicsAttr}>${chordXml}${pitchXml}<duration>${durationTicks}</duration>${tieXml}<voice>${voice}</voice>${typeAndDotsXml}${stemXml}${staffXml}${notationsXml}</note>\n`;
}
