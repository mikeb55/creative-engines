/**
 * Optional per-preset guitar voicing maps (Tonality Vault follow-up).
 * Registry Pattern B: maps live beside `AlternateGuitarTuningPreset` string tables; presets without entries fall back to baseline `guitarChordTonesInRange` behaviour.
 */

import type { AlternateGuitarTuningResolved } from './alternateGuitarTunings';

/** Triad-pair vocabulary placeholder for future Tonality Vault rows. */
export interface TriadPairFamilyRule {
  chordFamily: string;
  upperLower?: { description: string; upperPcSet: readonly number[]; lowerPcSet: readonly number[] };
  priorityRank: number;
}

export interface FretStringHint {
  allowedStringIndices?: readonly number[];
  maxFretSpan?: number;
  droneStringIndices?: readonly number[];
}

export interface GuitarTuningVoicingMap {
  presetId: string;
  /** Pilot (`new_standard`): bias realised fifth into upper register when deterministic gate fires. */
  fifthHeavyCharacter?: boolean;
  openStringMidis?: readonly [number, number, number, number, number, number];
  triadPairFamilies?: readonly TriadPairFamilyRule[];
  fretStringHints?: readonly FretStringHint[];
}

export interface ResolvedTuningVoicingContext {
  presetId: string | null;
  map: GuitarTuningVoicingMap | null;
  partRole: 'guitar' | 'guitar_2';
}

/**
 * Side registry — only presets with explicit maps participate; unknown ids resolve to `undefined` → null map at runtime.
 * Pilot: `new_standard` (Fripp New Standard, CGDAEG) — fifth-heavy realisation character.
 */
export const TUNING_VOICING_MAP_BY_PRESET_ID: Readonly<Record<string, GuitarTuningVoicingMap>> = {
  new_standard: {
    presetId: 'new_standard',
    fifthHeavyCharacter: true,
  },
};

export function buildResolvedTuningVoicingContext(
  alt: AlternateGuitarTuningResolved | undefined | null,
  partRole: 'guitar' | 'guitar_2'
): ResolvedTuningVoicingContext {
  const empty: ResolvedTuningVoicingContext = { presetId: null, map: null, partRole };
  if (!alt || alt.mode === 'standard') return empty;

  let presetId: string | null = null;
  if (alt.mode === 'shared') {
    presetId = alt.shared?.presetId ?? null;
  } else if (alt.mode === 'separate') {
    presetId = partRole === 'guitar_2' ? alt.guitar2?.presetId ?? null : alt.guitar1?.presetId ?? null;
  }

  if (!presetId) return empty;
  const map = TUNING_VOICING_MAP_BY_PRESET_ID[presetId];
  return { presetId, map: map ?? null, partRole };
}
