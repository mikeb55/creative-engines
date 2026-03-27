/**
 * Product / V1 baseline — planning vs generation (Prompt 7/7).
 * Display strings only; engine behaviour lives in core/.
 */

import { COMPOSER_OS_VERSION } from './composerOsConfig';

export { COMPOSER_OS_VERSION };

export type ModeCapability = 'musicxml_generation' | 'planning_only' | 'song_structure';

export interface SupportedModeInfo {
  presetId: string;
  displayName: string;
  capability: ModeCapability;
  honestNote: string;
}

/** Honest V1 capability matrix for UI, docs, and diagnostics. */
export const COMPOSER_OS_V1_SUPPORTED_MODES: readonly SupportedModeInfo[] = [
  {
    presetId: 'guitar_bass_duo',
    displayName: 'Guitar–Bass Duo',
    capability: 'musicxml_generation',
    honestNote: 'Full golden-path MusicXML generation.',
  },
  {
    presetId: 'ecm_chamber',
    displayName: 'ECM Chamber',
    capability: 'musicxml_generation',
    honestNote: 'Full chamber MusicXML generation (Metheny / Schneider modes).',
  },
  {
    presetId: 'riff_generator',
    displayName: 'Riff Generator',
    capability: 'musicxml_generation',
    honestNote: 'Short loopable riffs (1–4 bars) to the library Riffs folder; LOCK grid, GCE-gated MusicXML.',
  },
  {
    presetId: 'song_mode',
    displayName: 'Song Mode',
    capability: 'song_structure',
    honestNote: 'Structural song + lead-sheet contract as JSON; no MusicXML lead-sheet export in this build.',
  },
  {
    presetId: 'big_band',
    displayName: 'Big Band',
    capability: 'planning_only',
    honestNote: 'Planning JSON only — no full ensemble MusicXML.',
  },
  {
    presetId: 'string_quartet',
    displayName: 'String Quartet',
    capability: 'planning_only',
    honestNote: 'Planning JSON only — no quartet MusicXML.',
  },
] as const;
