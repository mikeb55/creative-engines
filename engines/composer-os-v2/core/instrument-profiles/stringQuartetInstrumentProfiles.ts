/**
 * String quartet — GM bowed-string profiles; ranges mirror {@link QUARTET_MIDI_BOUNDS}.
 */

import type { BowedStringProfile } from './instrumentProfileTypes';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';

export const STRING_QUARTET_VIOLIN_I: BowedStringProfile = {
  instrumentIdentity: 'violin_1',
  midiProgram: 40,
  hardRange: [QUARTET_MIDI_BOUNDS[SQ_PART_V1]![0], QUARTET_MIDI_BOUNDS[SQ_PART_V1]![1]],
  notationClef: 'treble',
};

export const STRING_QUARTET_VIOLIN_II: BowedStringProfile = {
  instrumentIdentity: 'violin_2',
  midiProgram: 40,
  hardRange: [QUARTET_MIDI_BOUNDS[SQ_PART_V2]![0], QUARTET_MIDI_BOUNDS[SQ_PART_V2]![1]],
  notationClef: 'treble',
};

export const STRING_QUARTET_VIOLA: BowedStringProfile = {
  instrumentIdentity: 'viola',
  midiProgram: 41,
  hardRange: [QUARTET_MIDI_BOUNDS[SQ_PART_VA]![0], QUARTET_MIDI_BOUNDS[SQ_PART_VA]![1]],
  notationClef: 'alto',
};

export const STRING_QUARTET_CELLO: BowedStringProfile = {
  instrumentIdentity: 'cello',
  midiProgram: 42,
  hardRange: [QUARTET_MIDI_BOUNDS[SQ_PART_VC]![0], QUARTET_MIDI_BOUNDS[SQ_PART_VC]![1]],
  notationClef: 'bass',
};
