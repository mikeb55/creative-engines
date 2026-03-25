/**
 * Composer OS V2 — static module registry (Phase 1A+1B + Prompt 3/7 Song Mode compile).
 */

import type { ModuleCapabilities, ModuleDefinition } from './moduleTypes';
import { runSongMode, type SongModeRunInput, type SongModeRunResult } from '../song-mode/runSongMode';
import { runBigBandMode, type BigBandRunInput, type BigBandRunResult } from '../big-band/runBigBandMode';
import { runBigBandRealisation, type BigBandRealisationResult } from '../big-band/runBigBandRealisation';
import {
  runStringQuartetMode,
  type StringQuartetRunInput,
  type StringQuartetRunResult,
} from '../string-quartet/runStringQuartetMode';
import { runQuartetRealisation, type QuartetRealisationResult } from '../string-quartet/runQuartetRealisation';

/** Minimal echo module for tests and future bridge stubs. */
export type EchoInput = { message: string };
export type EchoOutput = { message: string };

const echoModule: ModuleDefinition<EchoInput, EchoOutput> = {
  id: 'phase1a_echo',
  category: 'bridge/export',
  input: {} as EchoInput,
  output: {} as EchoOutput,
  run: (input) => ({ message: input.message }),
  capabilities: {
    readsFrom: ['validation'],
    writesTo: ['export'],
    compatiblePresets: ['guitar_bass_duo', 'ecm_chamber', 'song_mode'],
    stage: 'bridge',
  },
};

export type SongModeScaffoldIn = { structureHint?: string };
export type SongModeScaffoldOut = { structureHint?: string };

/** Song Mode section scaffold — metadata only, no harmony engine. */
const songModeScaffoldModule: ModuleDefinition<SongModeScaffoldIn, SongModeScaffoldOut> = {
  id: 'song_mode_scaffold',
  category: 'songwriting',
  input: {} as SongModeScaffoldIn,
  output: {} as SongModeScaffoldOut,
  run: (input) => ({ structureHint: input.structureHint ?? 'default_verse_chorus' }),
  capabilities: {
    readsFrom: ['form', 'motif'],
    writesTo: ['form'],
    compatiblePresets: ['song_mode'],
    stage: 'scaffold',
  },
};

/** Full structural Song Mode pipeline (compiled song + lead sheet contract). */
const songModeCompileModule: ModuleDefinition<SongModeRunInput, SongModeRunResult> = {
  id: 'song_mode_compile',
  category: 'songwriting',
  input: {} as SongModeRunInput,
  output: {} as SongModeRunResult,
  run: (input) => runSongMode(input),
  capabilities: {
    readsFrom: ['form'],
    writesTo: ['score_model', 'validation'],
    compatiblePresets: ['song_mode'],
    stage: 'songwriting',
  },
};

/** Big Band planning pipeline (form → orchestration); no full score export yet. */
const bigBandPlanModule: ModuleDefinition<BigBandRunInput, BigBandRunResult> = {
  id: 'big_band_plan',
  category: 'orchestration',
  input: {} as BigBandRunInput,
  output: {} as BigBandRunResult,
  run: (input) => runBigBandMode(input),
  capabilities: {
    readsFrom: ['register', 'density'],
    writesTo: ['score_model', 'validation'],
    compatiblePresets: ['big_band'],
    stage: 'orchestration_planning',
    orchestrationPlanning: true,
  },
};

/** String Quartet planning pipeline (form → orchestration); no quartet MusicXML export yet. */
const stringQuartetPlanModule: ModuleDefinition<StringQuartetRunInput, StringQuartetRunResult> = {
  id: 'string_quartet_plan',
  category: 'orchestration',
  input: {} as StringQuartetRunInput,
  output: {} as StringQuartetRunResult,
  run: (input) => runStringQuartetMode(input),
  capabilities: {
    readsFrom: ['register', 'density'],
    writesTo: ['score_model', 'validation'],
    compatiblePresets: ['string_quartet'],
    stage: 'orchestration_planning',
    orchestrationPlanning: true,
  },
};

/** Big Band — planning + voicing + score model + MusicXML (Prompt C/3). */
const bigBandRealiseModule: ModuleDefinition<BigBandRunInput, BigBandRealisationResult> = {
  id: 'big_band_realise',
  category: 'orchestration',
  input: {} as BigBandRunInput,
  output: {} as BigBandRealisationResult,
  run: (input) => runBigBandRealisation(input),
  capabilities: {
    readsFrom: ['register', 'density'],
    writesTo: ['score_model', 'export', 'validation'],
    compatiblePresets: ['big_band'],
    stage: 'realisation',
  },
};

/** String Quartet — planning + voicing + score model + MusicXML (Prompt C/3). */
const stringQuartetRealiseModule: ModuleDefinition<StringQuartetRunInput, QuartetRealisationResult> = {
  id: 'string_quartet_realise',
  category: 'orchestration',
  input: {} as StringQuartetRunInput,
  output: {} as QuartetRealisationResult,
  run: (input) => runQuartetRealisation(input),
  capabilities: {
    readsFrom: ['register', 'density'],
    writesTo: ['score_model', 'export', 'validation'],
    compatiblePresets: ['string_quartet'],
    stage: 'realisation',
  },
};

/** Static registry keyed by module id. No dynamic loading. */
export const MODULE_REGISTRY: Record<string, ModuleDefinition<unknown, unknown>> = {
  [echoModule.id]: echoModule as ModuleDefinition<unknown, unknown>,
  [songModeScaffoldModule.id]: songModeScaffoldModule as ModuleDefinition<unknown, unknown>,
  [songModeCompileModule.id]: songModeCompileModule as ModuleDefinition<unknown, unknown>,
  [bigBandPlanModule.id]: bigBandPlanModule as ModuleDefinition<unknown, unknown>,
  [stringQuartetPlanModule.id]: stringQuartetPlanModule as ModuleDefinition<unknown, unknown>,
  [bigBandRealiseModule.id]: bigBandRealiseModule as ModuleDefinition<unknown, unknown>,
  [stringQuartetRealiseModule.id]: stringQuartetRealiseModule as ModuleDefinition<unknown, unknown>,
};

export function getRegisteredModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY);
}

export function getModuleCapabilities(id: string): ModuleCapabilities | undefined {
  return MODULE_REGISTRY[id]?.capabilities;
}
