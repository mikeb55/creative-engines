/**
 * Single place for Guitar–Bass Duo MusicXML / Sibelius-facing bass identity.
 * Avoid ambiguous "Bass" labels that route to vocal or generic patches.
 */

/** Staff / part list name (not generic "Bass"). */
export const GUITAR_BASS_DUO_BASS_PART_NAME = 'Double Bass';

/** MusicXML 3.1 instrument-sound (MIDI mapping hint for notation apps). */
export const GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND = 'pluck.bass.acoustic';

/** GM Acoustic Bass: 0-based program index 32 → MusicXML midi-program element value 33 (1-based). */
export const GUITAR_BASS_DUO_BASS_MIDI_PROGRAM_ZERO_BASED = 32;
