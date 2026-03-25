/**
 * Composer OS V2 — Song Mode preset (Phase 1A scaffold only).
 * Not wired into conductor or golden path.
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';
import { DEFAULT_SONG_VOICE_TYPE } from '../core/song-mode/songModeTypes';

export const songModePreset: Preset = {
  id: 'song_mode',
  name: 'Song Mode',
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'straight',
    intensity: 0.55,
    syncopationDensity: 'medium',
  },
};

/** Vocal target for lead-sheet / song scaffolding (not used by generation yet). */
export const SONG_MODE_DEFAULT_VOICE = DEFAULT_SONG_VOICE_TYPE;
