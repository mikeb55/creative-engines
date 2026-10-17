/**
 * Composer OS V3.4 Stage A instrument catalogue.
 * Hard ranges are the sounding limits stated in docs/V3.4-ADVANCED-ARRANGING-ORCHESTRATION-SPEC.md.
 * Comfort ranges are inference and are marked comfortInferred.
 * Instruments with no numeric range in that document are omitted rather than filled in.
 * Piano is the exception: the specification names the Pierrot desk and gives no MIDI span.
 * The span below is the standard 88-key compass, not a guessed orchestral working range.
 */

import type { InstrumentSpec, Technique, Transposition } from './instrumentTypes';
import { CONCERT_TRANSPOSITION } from './instrumentTypes';

const VSL_VIOLIN = 'https://www.vsl.co.at/academy/strings/violin';
const VSL_VIOLA = 'https://www.vsl.co.at/academy/strings/viola';
const VSL_CELLO = 'https://www.vsl.co.at/academy/strings/cello';
const VSL_BASS = 'https://www.vsl.co.at/academy/strings/double-bass';
const VSL_HARP = 'https://www.vsl.co.at/academy/strings/harp';
const VSL_FLUTE = 'https://www.vsl.co.at/academy/woodwinds/concert-flute';
const VSL_OBOE = 'https://www.vsl.co.at/academy/woodwinds/oboe';
const VSL_CLARINET = 'https://www.vsl.co.at/academy/woodwinds/clarinet';
const VSL_BASSOON = 'https://www.vsl.co.at/academy/woodwinds/bassoon';
const VSL_HORN = 'https://www.vsl.co.at/academy/brass/horn-f';
const VSL_TRUMPET = 'https://www.vsl.co.at/academy/brass/trumpet-c';
const VSL_TROMBONE = 'https://www.vsl.co.at/academy/brass/tenor-trombone';
const VSL_TUBA = 'https://www.vsl.co.at/academy/brass/bass-tuba';
const ORCH_LIB = 'https://www.orchestralibrary.com/reftables/rang.html';
const SOUNDS_XML = 'https://www.w3.org/2021/06/musicxml40/listings/sounds.xml/';
const VSL_PIANO_IPN = 'https://www.vsl.co.at/instruments/synchron/fx-piano';
const VSL_PIANO_RANGE = 'https://www.vsl.co.at/de/instruments/synchronized/special-keyboards';

const BOWED: readonly Technique[] = [
  'arco',
  'pizz',
  'snap_pizz',
  'col_legno',
  'sul_pont',
  'sul_tasto',
  'natural_harmonic',
  'artificial_harmonic',
  'tremolo_unmeasured',
  'con_sord',
  'senza_sord',
];

const TRUMPET_TECH: readonly Technique[] = [
  'straight_mute',
  'cup_mute',
  'harmon_mute',
  'con_sord',
  'senza_sord',
  'open',
  'flutter',
];

export const TRUMPET_BB_TRANSPOSITION: Transposition = { diatonic: -1, chromatic: -2, octaveChange: 0 };
export const ALTO_SAX_TRANSPOSITION: Transposition = { diatonic: -5, chromatic: -9, octaveChange: 0 };
export const TENOR_SAX_TRANSPOSITION: Transposition = { diatonic: -1, chromatic: -2, octaveChange: -1 };
export const BARITONE_SAX_TRANSPOSITION: Transposition = { diatonic: -5, chromatic: -9, octaveChange: -1 };
export const HORN_F_TRANSPOSITION: Transposition = { diatonic: -4, chromatic: -7, octaveChange: 0 };
export const CLARINET_BB_TRANSPOSITION: Transposition = { diatonic: -1, chromatic: -2, octaveChange: 0 };
export const DOUBLE_BASS_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: -1 };
export const PICCOLO_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: 1 };
export const CELESTA_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: 1 };
export const GLOCKENSPIEL_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: 2 };

function spec(partial: InstrumentSpec): InstrumentSpec {
  return partial;
}

export const INSTRUMENT_CATALOGUE: readonly InstrumentSpec[] = [
  spec({
    id: 'violin',
    displayName: 'Violin',
    family: 'strings',
    soundingHardRange: [55, 105],
    soundingComfortRange: [55, 105],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'strings.violin',
    midiProgram: 40,
    techniques: BOWED,
    maxSimultaneous: 2,
    balanceClass: 'strings_section',
    sources: [VSL_VIOLIN, SOUNDS_XML],
  }),
  spec({
    id: 'viola',
    displayName: 'Viola',
    family: 'strings',
    soundingHardRange: [48, 93],
    soundingComfortRange: [48, 93],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['alto', 'treble'],
    instrumentSound: 'strings.viola',
    midiProgram: 41,
    techniques: BOWED,
    maxSimultaneous: 2,
    balanceClass: 'strings_section',
    sources: [VSL_VIOLA, SOUNDS_XML],
  }),
  spec({
    id: 'cello',
    displayName: 'Cello',
    family: 'strings',
    soundingHardRange: [36, 81],
    soundingComfortRange: [36, 81],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['bass', 'tenor', 'treble'],
    instrumentSound: 'strings.cello',
    midiProgram: 42,
    techniques: BOWED,
    maxSimultaneous: 2,
    balanceClass: 'strings_section',
    sources: [VSL_CELLO, SOUNDS_XML],
  }),
  spec({
    id: 'double_bass',
    displayName: 'Double Bass',
    family: 'strings',
    soundingHardRange: [23, 67],
    soundingComfortRange: [23, 67],
    comfortInferred: true,
    transposition: DOUBLE_BASS_TRANSPOSITION,
    clefs: ['bass'],
    instrumentSound: 'strings.contrabass',
    midiProgram: 43,
    techniques: BOWED,
    maxSimultaneous: 2,
    balanceClass: 'strings_section',
    sources: [VSL_BASS, SOUNDS_XML],
  }),
  spec({
    id: 'harp',
    displayName: 'Harp',
    family: 'plucked',
    soundingHardRange: [23, 104],
    soundingComfortRange: [23, 104],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['treble', 'bass'],
    instrumentSound: 'pluck.harp',
    midiProgram: 46,
    techniques: [],
    maxSimultaneous: 10,
    balanceClass: 'other',
    sources: [VSL_HARP, SOUNDS_XML],
  }),
  spec({
    id: 'flute',
    displayName: 'Concert Flute',
    family: 'woodwinds',
    soundingHardRange: [59, 98],
    soundingComfortRange: [59, 98],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.flutes.flute',
    midiProgram: 73,
    techniques: ['flutter'],
    maxSimultaneous: 1,
    balanceClass: 'woodwind',
    sources: [VSL_FLUTE, SOUNDS_XML],
  }),
  spec({
    id: 'piccolo',
    displayName: 'Piccolo',
    family: 'woodwinds',
    soundingHardRange: null,
    soundingComfortRange: null,
    comfortInferred: true,
    transposition: PICCOLO_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.flutes.flute.piccolo',
    midiProgram: 72,
    techniques: ['flutter'],
    maxSimultaneous: 1,
    balanceClass: 'woodwind',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'oboe',
    displayName: 'Oboe',
    family: 'woodwinds',
    soundingHardRange: [58, 91],
    soundingComfortRange: [58, 91],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.reed.oboe',
    midiProgram: 68,
    techniques: ['flutter'],
    maxSimultaneous: 1,
    balanceClass: 'woodwind',
    sources: [VSL_OBOE, SOUNDS_XML],
  }),
  spec({
    id: 'clarinet_bb',
    displayName: 'Clarinet in B-flat',
    family: 'woodwinds',
    soundingHardRange: [50, 94],
    soundingComfortRange: [50, 91],
    comfortInferred: true,
    transposition: CLARINET_BB_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.reed.clarinet.bflat',
    midiProgram: 71,
    techniques: ['flutter'],
    maxSimultaneous: 1,
    balanceClass: 'woodwind',
    sources: [VSL_CLARINET, SOUNDS_XML],
  }),
  spec({
    id: 'bassoon',
    displayName: 'Bassoon',
    family: 'woodwinds',
    soundingHardRange: [34, 75],
    soundingComfortRange: [34, 75],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['bass', 'tenor'],
    instrumentSound: 'wind.reed.bassoon',
    midiProgram: 70,
    techniques: ['flutter'],
    maxSimultaneous: 1,
    balanceClass: 'woodwind',
    sources: [VSL_BASSOON, SOUNDS_XML],
  }),
  spec({
    id: 'horn_f',
    displayName: 'Horn in F',
    family: 'brass',
    soundingHardRange: [35, 77],
    soundingComfortRange: [35, 77],
    comfortInferred: true,
    transposition: HORN_F_TRANSPOSITION,
    clefs: ['treble', 'bass'],
    instrumentSound: 'brass.french-horn',
    midiProgram: 60,
    techniques: ['stopped', 'straight_mute', 'con_sord', 'senza_sord', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'horn',
    sources: [VSL_HORN, ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'trumpet_bb',
    displayName: 'Trumpet in B-flat',
    family: 'brass',
    soundingHardRange: [52, 84],
    soundingComfortRange: [52, 84],
    comfortInferred: true,
    transposition: TRUMPET_BB_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'brass.trumpet.bflat',
    midiProgram: 56,
    techniques: TRUMPET_TECH,
    maxSimultaneous: 1,
    balanceClass: 'trumpet_trombone_tuba',
    sources: [VSL_TRUMPET, ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'trombone',
    displayName: 'Tenor Trombone',
    family: 'brass',
    soundingHardRange: [40, 77],
    soundingComfortRange: [40, 77],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['bass', 'tenor'],
    instrumentSound: 'brass.trombone.tenor',
    midiProgram: 57,
    techniques: ['straight_mute', 'cup_mute', 'con_sord', 'senza_sord', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'trumpet_trombone_tuba',
    sources: [VSL_TROMBONE, SOUNDS_XML],
  }),
  spec({
    id: 'tuba',
    displayName: 'Bass Tuba',
    family: 'brass',
    soundingHardRange: [26, 67],
    soundingComfortRange: [26, 67],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['bass'],
    instrumentSound: 'brass.tuba.bass',
    midiProgram: 58,
    techniques: ['con_sord', 'senza_sord', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'trumpet_trombone_tuba',
    sources: [VSL_TUBA, SOUNDS_XML],
  }),
  spec({
    id: 'alto_sax',
    displayName: 'Alto Saxophone',
    family: 'saxophones',
    soundingHardRange: [49, 82],
    soundingComfortRange: [49, 82],
    comfortInferred: true,
    transposition: ALTO_SAX_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.reed.saxophone.alto',
    midiProgram: 65,
    techniques: ['flutter', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'saxophone',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'tenor_sax',
    displayName: 'Tenor Saxophone',
    family: 'saxophones',
    soundingHardRange: [44, 77],
    soundingComfortRange: [44, 77],
    comfortInferred: true,
    transposition: TENOR_SAX_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.reed.saxophone.tenor',
    midiProgram: 66,
    techniques: ['flutter', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'saxophone',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'baritone_sax',
    displayName: 'Baritone Saxophone',
    family: 'saxophones',
    soundingHardRange: [36, 70],
    soundingComfortRange: [37, 70],
    comfortInferred: true,
    transposition: BARITONE_SAX_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'wind.reed.saxophone.baritone',
    midiProgram: 67,
    techniques: ['flutter', 'open'],
    maxSimultaneous: 1,
    balanceClass: 'saxophone',
    sources: [ORCH_LIB, SOUNDS_XML],
    standardSoundingFloor: 37,
  }),
  spec({
    id: 'timpani',
    displayName: 'Timpani',
    family: 'percussion',
    soundingHardRange: [38, 60],
    soundingComfortRange: [38, 60],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['bass'],
    instrumentSound: 'drum.timpani',
    midiProgram: 47,
    techniques: ['tremolo_unmeasured'],
    maxSimultaneous: 4,
    balanceClass: 'other',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'glockenspiel',
    displayName: 'Glockenspiel',
    family: 'percussion',
    soundingHardRange: null,
    soundingComfortRange: null,
    comfortInferred: true,
    transposition: GLOCKENSPIEL_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'pitched-percussion.glockenspiel',
    midiProgram: 9,
    techniques: [],
    maxSimultaneous: 2,
    balanceClass: 'other',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
  spec({
    id: 'piano',
    displayName: 'Piano',
    family: 'keyboard',
    /**
     * Sounding A0–C8. VSL IPN sets middle C to C4 and calls the A below piano C1 “A0”.
     * VSL lists keyboard range A0–C8. This catalogue’s middle C is MIDI 60, so A0 is 21 and C8 is 108.
     * The big-band comp snap 55–84 is a writing register, not this hard range.
     */
    soundingHardRange: [21, 108],
    soundingComfortRange: [21, 108],
    comfortInferred: true,
    transposition: CONCERT_TRANSPOSITION,
    clefs: ['treble', 'bass'],
    instrumentSound: 'keyboard.piano',
    midiProgram: 0,
    techniques: [],
    maxSimultaneous: 10,
    balanceClass: 'other',
    sources: [VSL_PIANO_IPN, VSL_PIANO_RANGE, SOUNDS_XML],
  }),
  spec({
    id: 'celesta',
    displayName: 'Celesta',
    family: 'keyboard',
    soundingHardRange: null,
    soundingComfortRange: null,
    comfortInferred: true,
    transposition: CELESTA_TRANSPOSITION,
    clefs: ['treble'],
    instrumentSound: 'keyboard.celesta',
    midiProgram: 8,
    techniques: [],
    maxSimultaneous: 10,
    balanceClass: 'other',
    sources: [ORCH_LIB, SOUNDS_XML],
  }),
];

const BY_ID = new Map(INSTRUMENT_CATALOGUE.map((item) => [item.id, item]));

export function getInstrument(id: string): InstrumentSpec {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown instrument catalogue id: ${id}`);
  return found;
}

export function listInstruments(): readonly InstrumentSpec[] {
  return INSTRUMENT_CATALOGUE;
}

export interface RangeFlag {
  kind: 'outside_hard_range' | 'outside_comfort';
  detail: string;
}

/**
 * Flags a sounding pitch. Does not move it.
 * T8: violin F#3 (54) is outside_hard_range and the returned pitch is still 54.
 */
export function inspectCataloguePitch(instrumentId: string, midi: number): { pitch: number; flags: RangeFlag[] } {
  const item = getInstrument(instrumentId);
  const flags: RangeFlag[] = [];
  const hard = item.soundingHardRange;
  const comfort = item.soundingComfortRange;
  if (hard && (midi < hard[0] || midi > hard[1])) {
    flags.push({
      kind: 'outside_hard_range',
      detail: `${item.displayName} sounding MIDI ${midi} is outside documented hard range ${hard[0]}–${hard[1]}`,
    });
  } else if (comfort && (midi < comfort[0] || midi > comfort[1])) {
    flags.push({
      kind: 'outside_comfort',
      detail: `${item.displayName} sounding MIDI ${midi} is outside the inferred comfort range ${comfort[0]}–${comfort[1]}`,
    });
  }
  return { pitch: midi, flags };
}

/** T7 display line for the documented sounding hard range. */
export function documentedRangeLine(id: string): string {
  const item = getInstrument(id);
  if (id === 'baritone_sax') return '37–70 (36 with low-A extension)';
  if (!item.soundingHardRange) return 'range not documented';
  return `${item.soundingHardRange[0]}–${item.soundingHardRange[1]}`;
}
