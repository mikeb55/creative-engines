/**
 * V31 — Clave grid overlay: nudge `RhythmicConstraints` from validated `ClaveGridSpec` + Cuban stub ids.
 * Gated by `COMPOSER_OS_CLAVE_GRID_OVERLAY` / `VITE_COMPOSER_OS_CLAVE_GRID_OVERLAY`.
 */

import type { RhythmicConstraints, SyncopationDensity } from '../rhythm-engine/rhythmTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { getCubanRhythmPresetById } from './cubanRhythmPresets';
import {
  CLAVE_GRID_STUB_REGISTRY,
  type ClaveGridPresetRef,
  type ClaveGridSpec,
} from './claveGridTypes';
import type { BarMeterMap } from './barMeterTypes';

export interface ClaveGridOverlayReceipt {
  envEnabled: boolean;
  applied: boolean;
  skippedReason?: string;
  presetRef?: ClaveGridPresetRef;
  resolvedCubanPresetId?: string;
  claveCycleBars?: number;
  barMeterMapEcho?: BarMeterMap;
  metrics?: {
    offbeatWeight: number;
    phraseDisplacementTendency: number;
    sustainTendency: number;
    attackDensityTendency: number;
    syncopationDensity: SyncopationDensity;
  };
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function truthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/** Node / Vite client: overlay applies only when truthy. */
export function isClaveGridOverlayEnvEnabled(): boolean {
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  return (
    truthyEnv(process.env.COMPOSER_OS_CLAVE_GRID_OVERLAY) ||
    truthyEnv(process.env.VITE_COMPOSER_OS_CLAVE_GRID_OVERLAY)
  );
}

function classifySyncopation(offbeatWeight: number): SyncopationDensity {
  if (offbeatWeight >= 0.58) return 'high';
  if (offbeatWeight >= 0.38) return 'medium';
  return 'low';
}

export function applyClaveGridOverlay(
  seed: number,
  constraints: RhythmicConstraints,
  spec: ClaveGridSpec
): { constraints: RhythmicConstraints; receipt: ClaveGridOverlayReceipt } {
  const stub = CLAVE_GRID_STUB_REGISTRY[spec.presetRef];
  const cuban = getCubanRhythmPresetById(stub.cubanPresetId);

  const phase = spec.phase !== undefined ? clamp01(spec.phase) : 0.5;
  const hr = spec.harmonicRhythmBias !== undefined ? clamp01(spec.harmonicRhythmBias) : 0.5;
  const syncW = spec.syncopationWeight !== undefined ? clamp01(spec.syncopationWeight) : 0.5;
  const jitter = seededUnit(seed, 0, 77123);

  const tumbaoNudge = cuban ? (cuban.feel.tumbaoDensity - 0.65) * 0.06 : 0;

  let offbeatWeight = clamp01(
    constraints.offbeatWeight + (syncW - 0.5) * 0.22 + jitter * 0.04
  );
  let phraseDisplacementTendency = clamp01(
    constraints.phraseDisplacementTendency + (phase - 0.5) * 0.18 + (syncW - 0.5) * 0.08
  );
  let sustainTendency = clamp01(constraints.sustainTendency + (hr - 0.5) * 0.22 + tumbaoNudge);
  let attackDensityTendency = clamp01(constraints.attackDensityTendency - (hr - 0.5) * 0.18);
  const syncopationDensity = classifySyncopation(offbeatWeight);

  const next: RhythmicConstraints = {
    ...constraints,
    offbeatWeight,
    phraseDisplacementTendency,
    sustainTendency,
    attackDensityTendency,
    syncopationDensity,
  };

  return {
    constraints: next,
    receipt: {
      envEnabled: true,
      applied: true,
      presetRef: spec.presetRef,
      resolvedCubanPresetId: stub.cubanPresetId,
      claveCycleBars: spec.claveCycleBars ?? 4,
      barMeterMapEcho: spec.barMeterMap,
      metrics: {
        offbeatWeight: next.offbeatWeight,
        phraseDisplacementTendency: next.phraseDisplacementTendency,
        sustainTendency: next.sustainTendency,
        attackDensityTendency: next.attackDensityTendency,
        syncopationDensity: next.syncopationDensity,
      },
    },
  };
}
