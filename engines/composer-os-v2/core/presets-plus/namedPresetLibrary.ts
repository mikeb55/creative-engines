/**
 * Registry of named presets → base mode + defaults.
 */

import type { GenerateRequest } from '../../app-api/appApiTypes';
import { PRESET_OUTPUT_SUBFOLDER } from '../../app-api/composerOsOutputPaths';
import type { BigBandRunInput } from '../big-band/runBigBandMode';
import type { SongModeRunInput } from '../song-mode/runSongMode';
import type { NamedPresetDefinition, NamedPresetId } from './namedPresetTypes';

const stack = (
  primary: string,
  secondary?: string,
  colour?: string
): NamedPresetDefinition['defaultStyleStack'] => ({
  primary,
  secondary,
  colour,
  styleBlend: { primary: 'medium', secondary: 'light', colour: 'subtle' },
});

export const NAMED_PRESET_LIBRARY: Record<NamedPresetId, NamedPresetDefinition> = {
  orbit_ecm: {
    id: 'orbit_ecm',
    displayName: 'Orbit ECM',
    description: 'ECM Metheny quartet feel with a light colour layer — same as ecm_chamber + Metheny.',
    basePresetId: 'ecm_chamber',
    defaultStyleStack: stack('metheny', 'barry_harris', 'triad_pairs'),
    ecmMode: 'ECM_METHENY_QUARTET',
    seedBehaviourHint: 'offset_for_variation',
    suggestedSeedStep: 10_007,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.ecm_chamber,
  },
  ecm_song: {
    id: 'ecm_song',
    displayName: 'ECM Song',
    description: 'ECM Schneider chamber colour — narrative, contrasting sections.',
    basePresetId: 'ecm_chamber',
    defaultStyleStack: stack('metheny', 'bacharach'),
    ecmMode: 'ECM_SCHNEIDER_CHAMBER',
    seedBehaviourHint: 'prefer_prime',
    suggestedSeedStep: 5003,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.ecm_chamber,
  },
  guitar_bass_recording: {
    id: 'guitar_bass_recording',
    displayName: 'Guitar–Bass Recording',
    description: 'Duo with strong primary stack — good for tight takes.',
    basePresetId: 'guitar_bass_duo',
    defaultStyleStack: stack('barry_harris', 'metheny', 'bacharach'),
    seedBehaviourHint: 'any',
    suggestedSeedStep: 3331,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo,
  },
  big_band_swing: {
    id: 'big_band_swing',
    displayName: 'Big Band Swing',
    description: 'Big band planning with swing era defaults.',
    basePresetId: 'big_band',
    defaultStyleStack: stack('barry_harris'),
    bigBandEra: 'swing',
    bigBandComposer: null,
    seedBehaviourHint: 'offset_for_variation',
    suggestedSeedStep: 8803,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.big_band,
  },
  big_band_bebop: {
    id: 'big_band_bebop',
    displayName: 'Big Band Bebop',
    description: 'Big band planning with bebop era line-forward behaviour.',
    basePresetId: 'big_band',
    defaultStyleStack: stack('barry_harris', 'metheny'),
    bigBandEra: 'bebop',
    bigBandComposer: null,
    seedBehaviourHint: 'offset_for_variation',
    suggestedSeedStep: 9901,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.big_band,
  },
  quartet_lyrical: {
    id: 'quartet_lyrical',
    displayName: 'Quartet Lyrical',
    description: 'String quartet planning — lyrical / singing lines bias (metadata).',
    basePresetId: 'string_quartet',
    defaultStyleStack: stack('bacharach', 'metheny'),
    seedBehaviourHint: 'prefer_prime',
    suggestedSeedStep: 7001,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.string_quartet,
  },
  bacharach_song: {
    id: 'bacharach_song',
    displayName: 'Bacharach Song',
    description: 'Song Mode with Bacharach songwriter profile.',
    basePresetId: 'song_mode',
    defaultStyleStack: stack('bacharach'),
    primarySongwriterStyle: 'bacharach',
    seedBehaviourHint: 'any',
    suggestedSeedStep: 4242,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.song_mode,
  },
  songwriter_classic: {
    id: 'songwriter_classic',
    displayName: 'Classic Songwriter',
    description: 'Song Mode with Beatles-oriented defaults.',
    basePresetId: 'song_mode',
    defaultStyleStack: stack('bacharach', 'metheny'),
    primarySongwriterStyle: 'beatles',
    seedBehaviourHint: 'any',
    suggestedSeedStep: 1964,
    outputFolderHint: PRESET_OUTPUT_SUBFOLDER.song_mode,
  },
};

export function listNamedPresetIds(): NamedPresetId[] {
  return Object.keys(NAMED_PRESET_LIBRARY) as NamedPresetId[];
}

export function getNamedPreset(id: NamedPresetId): NamedPresetDefinition | undefined {
  return NAMED_PRESET_LIBRARY[id];
}

/** Merge style / ECM defaults from a named preset onto an existing generate request (same base preset). */
export function mergeNamedPresetIntoGenerateRequest(namedId: NamedPresetId, req: GenerateRequest): GenerateRequest {
  const def = NAMED_PRESET_LIBRARY[namedId];
  if (def.basePresetId !== req.presetId) {
    throw new Error(`named preset "${namedId}" expects base preset "${def.basePresetId}", got "${req.presetId}"`);
  }
  return {
    ...req,
    styleStack: def.defaultStyleStack,
    ecmMode: def.ecmMode ?? req.ecmMode,
  };
}

export function songModeInputFromNamedPreset(namedId: NamedPresetId, seed: number, title?: string): SongModeRunInput | null {
  const def = NAMED_PRESET_LIBRARY[namedId];
  if (def.basePresetId !== 'song_mode') return null;
  return {
    seed,
    title,
    primarySongwriterStyle: def.primarySongwriterStyle,
  };
}

export function bigBandInputFromNamedPreset(namedId: NamedPresetId, seed: number, title?: string): BigBandRunInput | null {
  const def = NAMED_PRESET_LIBRARY[namedId];
  if (def.basePresetId !== 'big_band') return null;
  return {
    seed,
    title,
    era: def.bigBandEra,
    composerStyle: def.bigBandComposer ?? null,
  };
}
