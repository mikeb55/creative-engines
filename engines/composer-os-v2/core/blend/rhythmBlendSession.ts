/**
 * Blend-lab session state (framework-agnostic; app slice re-exports).
 */

import { exportBlendedScoreToMusicXml as coreExportBlended } from './blendMusicXmlExporter';
import type { BlendExporterBlendedPlan } from './blendMusicXmlExporter';
import type { ConflictStrategy } from '../rhythm/rhythmLayerMerge';
import { catalogToCoreEngine, type RhythmEngineId } from './rhythmBlendTypes';

export interface RhythmBlendSessionState {
  engineA: RhythmEngineId;
  engineB: RhythmEngineId;
  presetIdA: string;
  presetIdB: string;
  conflictStrategy: ConflictStrategy;
}

const DEFAULT_SESSION: RhythmBlendSessionState = {
  engineA: 'felaKuti',
  engineB: 'greekRebetiko',
  presetIdA: 'straight',
  presetIdB: 'zeibekiko_9_8',
  conflictStrategy: 'max',
};

let session: RhythmBlendSessionState = { ...DEFAULT_SESSION };

export function getRhythmBlendSessionState(): Readonly<RhythmBlendSessionState> {
  return { ...session };
}

export function resetRhythmBlendSessionForTests(next?: Partial<RhythmBlendSessionState>): void {
  session = { ...DEFAULT_SESSION, ...next };
}

export function setEngineA(id: RhythmEngineId): void {
  session = { ...session, engineA: id };
}

export function setEngineB(id: RhythmEngineId): void {
  session = { ...session, engineB: id };
}

export function setPresetIdA(id: string): void {
  session = { ...session, presetIdA: id };
}

export function setPresetIdB(id: string): void {
  session = { ...session, presetIdB: id };
}

export function setConflictStrategy(c: ConflictStrategy): void {
  session = { ...session, conflictStrategy: c };
}

/**
 * Routes through core blended exporter using catalog → core engine mapping.
 */
export function exportBlendedScoreToMusicXml(): string {
  const plan: BlendExporterBlendedPlan = {
    engineA: { engine: catalogToCoreEngine(session.engineA), presetId: session.presetIdA },
    engineB: { engine: catalogToCoreEngine(session.engineB), presetId: session.presetIdB },
    conflictStrategy: session.conflictStrategy,
  };
  return coreExportBlended(plan);
}
