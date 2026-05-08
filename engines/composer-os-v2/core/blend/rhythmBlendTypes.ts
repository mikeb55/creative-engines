/**
 * V43 rhythm blend catalog — display IDs and metadata (distinct from core {@link RhythmEngineId} in songFormRhythmTypes).
 */

import type { RhythmEngineId as CoreRhythmEngineId } from '../rhythm/songFormRhythmTypes';

/** Blend-lab engine selector IDs (UI + export naming). */
export type RhythmEngineId = 'felaKuti' | 'greekRebetiko' | 'brazilian' | 'secondLine' | 'cuban';

export interface RhythmBlendEngineEntry {
  id: RhythmEngineId;
  label: string;
  prefix: string;
  color: string;
  gridSteps: number;
  defaultPresetId: string;
  coreEngine: CoreRhythmEngineId;
}

export const RHYTHM_BLEND_ENGINE_ENTRIES: RhythmBlendEngineEntry[] = [
  {
    id: 'felaKuti',
    label: 'Fela Kuti Afrobeat',
    prefix: 'fk',
    color: '#E8A020',
    gridSteps: 16,
    defaultPresetId: 'straight',
    coreEngine: 'afrobeat',
  },
  {
    id: 'greekRebetiko',
    label: 'Greek Rebetiko',
    prefix: 'gr',
    color: '#7B5EA7',
    gridSteps: 18,
    defaultPresetId: 'zeibekiko_9_8',
    coreEngine: 'rebetiko',
  },
  {
    id: 'brazilian',
    label: 'Brazilian',
    prefix: 'br',
    color: '#2E8B57',
    gridSteps: 16,
    defaultPresetId: 'bossa-nova-basic',
    coreEngine: 'brazilian',
  },
  {
    id: 'secondLine',
    label: 'Second Line',
    prefix: 'sl',
    color: '#C0392B',
    gridSteps: 16,
    defaultPresetId: 'second-line-basic',
    coreEngine: 'second_line',
  },
  {
    id: 'cuban',
    label: 'Cuban',
    prefix: 'cu',
    color: '#1A6FA8',
    gridSteps: 16,
    defaultPresetId: 'son-clave-3-2',
    coreEngine: 'cuban',
  },
];

const BY_ID = new Map<RhythmEngineId, RhythmBlendEngineEntry>(
  RHYTHM_BLEND_ENGINE_ENTRIES.map((e) => [e.id, e])
);

export function catalogToCoreEngine(id: RhythmEngineId): CoreRhythmEngineId {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`catalogToCoreEngine: unknown blend catalog id ${String(id)}`);
  return e.coreEngine;
}

export function blendEngineMeta(id: RhythmEngineId): RhythmBlendEngineEntry {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`blendEngineMeta: unknown blend catalog id ${String(id)}`);
  return e;
}
