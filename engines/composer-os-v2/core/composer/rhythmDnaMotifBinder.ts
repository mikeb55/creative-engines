/**
 * Phase 4+5 — RhythmDNA-style discrete cells bound to motif rhythmic identity (R spine).
 */

import type { MotifCell2 } from '../motif/themeGenome';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import type { VoiceRuleBundle } from './voiceRuleBundle';

export interface RhythmMotifBinding {
  motifId: string;
  allowedRhythmCells: string[];
  forbiddenRhythmCells: string[];
  syncopationLevel: number;
}

/** Discrete rhythm archetypes — ids stable for filtering / penalties. */
export const RHYTHM_DNA_CELL_IDS = [
  'rd_quarter_on_1',
  'rd_half_half',
  'rd_eighth_syncop',
  'rd_offbeat_hit',
  'rd_tie_across_bar',
  'rd_shout_grid',
  'rd_sparse_float',
  'rd_triplet_cell',
] as const;

export type RhythmDnaCellId = (typeof RHYTHM_DNA_CELL_IDS)[number];

export interface RhythmDnaCellMeta {
  id: RhythmDnaCellId;
  /** Strong attack on beat 1 (penalised when antiMetric). */
  strongBeatOneAttack: boolean;
  /** Duration pattern crosses bar boundary (Coltrane mid-bar change). */
  crossesBarline: boolean;
  /** Energy for shout / peak sections. */
  energy: number;
  /** 0 = on-grid; 1 = displaced / offbeat preference. */
  offbeatBias: number;
}

export const RHYTHM_DNA_CELL_TABLE: Record<RhythmDnaCellId, RhythmDnaCellMeta> = {
  rd_quarter_on_1: { id: 'rd_quarter_on_1', strongBeatOneAttack: true, crossesBarline: false, energy: 0.35, offbeatBias: 0 },
  rd_half_half: { id: 'rd_half_half', strongBeatOneAttack: true, crossesBarline: false, energy: 0.4, offbeatBias: 0.05 },
  rd_eighth_syncop: { id: 'rd_eighth_syncop', strongBeatOneAttack: false, crossesBarline: false, energy: 0.55, offbeatBias: 0.55 },
  rd_offbeat_hit: { id: 'rd_offbeat_hit', strongBeatOneAttack: false, crossesBarline: false, energy: 0.62, offbeatBias: 0.85 },
  rd_tie_across_bar: { id: 'rd_tie_across_bar', strongBeatOneAttack: false, crossesBarline: true, energy: 0.58, offbeatBias: 0.65 },
  rd_shout_grid: { id: 'rd_shout_grid', strongBeatOneAttack: true, crossesBarline: false, energy: 0.95, offbeatBias: 0.25 },
  rd_sparse_float: { id: 'rd_sparse_float', strongBeatOneAttack: false, crossesBarline: false, energy: 0.22, offbeatBias: 0.45 },
  rd_triplet_cell: { id: 'rd_triplet_cell', strongBeatOneAttack: false, crossesBarline: false, energy: 0.48, offbeatBias: 0.35 },
};

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Derive syncopation 0–1 from motif durations + accents (R spine). */
export function syncopationFromMotifCell(cell: MotifCell2): number {
  if (!cell.durations.length) return 0.45;
  const norm = cell.durations.reduce((a, b) => a + b, 0) || 1;
  let off = 0;
  for (let i = 0; i < cell.durations.length; i++) {
    const w = cell.durations[i]! / norm;
    const ac = cell.accents[i] ?? 0.5;
    off += w * Math.abs(ac - 0.5) * 2;
  }
  return clamp01(off);
}

/**
 * Enumerate allowed / forbidden RhythmDNA cells from motif R identity.
 * When `relaxed` (development / improv), allowed list widens.
 */
export function computeRhythmMotifBinding(
  motifId: string,
  primary: MotifCell2,
  bundle: VoiceRuleBundle | undefined,
  relaxed: boolean
): RhythmMotifBinding {
  const sync = syncopationFromMotifCell(primary);
  const allIds = Object.keys(RHYTHM_DNA_CELL_TABLE) as RhythmDnaCellId[];

  const scored = allIds.map((id) => {
    const m = RHYTHM_DNA_CELL_TABLE[id]!;
    let score = 1 - Math.abs(m.offbeatBias - sync);
    if (m.crossesBarline && bundle?.harmonicRhythm.allowMidBarChange) score += 0.08;
    return { id, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const keep = relaxed ? Math.max(5, Math.floor(allIds.length * 0.75)) : Math.max(3, Math.floor(allIds.length * 0.5));
  const allowed = scored.slice(0, keep).map((s) => s.id);
  const forbidden = scored.slice(keep).map((s) => s.id);

  return {
    motifId,
    allowedRhythmCells: allowed,
    forbiddenRhythmCells: forbidden,
    syncopationLevel: sync,
  };
}

export function filterRhythmCellsByBinding(cellIds: string[], binding: RhythmMotifBinding): string[] {
  const allow = new Set(binding.allowedRhythmCells);
  return cellIds.filter((id) => allow.has(id));
}

/** Threadgill — penalise on-beat strong attacks when antiMetric. */
export function antiMetricPenaltyForCell(cellId: string, bundle: VoiceRuleBundle): number {
  if (!bundle.rhythmPolicy.antiMetric) return 0;
  const m = RHYTHM_DNA_CELL_TABLE[cellId as RhythmDnaCellId];
  if (!m) return 0;
  return m.strongBeatOneAttack ? 55 : 0;
}

/** Mingus — after gospel shout threshold, force shout grid regardless of motif filter. */
export function mingusShoutInjectActive(barIndex: number, bundle: VoiceRuleBundle): boolean {
  const th = bundle.rhythmPolicy.gospelShoutThreshold;
  if (bundle.voiceId !== 'charles_mingus' || th === undefined) return false;
  return barIndex >= th;
}

/** Coltrane — tied / cross-bar cells permitted when mid-bar changes allowed. */
export function coltraneAllowsTiedSyncopationCell(cellId: string, bundle: VoiceRuleBundle): boolean {
  if (bundle.voiceId !== 'john_coltrane') return false;
  if (!bundle.harmonicRhythm.allowMidBarChange) return false;
  const m = RHYTHM_DNA_CELL_TABLE[cellId as RhythmDnaCellId];
  return Boolean(m?.crossesBarline || cellId === 'rd_tie_across_bar');
}

/** Adjust rhythmic constraints from binding + voice bundle (additive only). */
export function applyRhythmMotifBindingToConstraints(
  base: RhythmicConstraints,
  bundle: VoiceRuleBundle | undefined,
  binding: RhythmMotifBinding | undefined
): RhythmicConstraints {
  if (!bundle || !binding) return base;

  let offbeatWeight = base.offbeatWeight;
  let phraseDisplacementTendency = base.phraseDisplacementTendency;
  let attackDensityTendency = base.attackDensityTendency;

  offbeatWeight = clamp01(offbeatWeight + binding.syncopationLevel * 0.22);
  if (bundle.rhythmPolicy.antiMetric) {
    offbeatWeight = clamp01(offbeatWeight + 0.12);
    phraseDisplacementTendency = clamp01(phraseDisplacementTendency + 0.1);
  }
  if (bundle.voiceId === 'henry_threadgill') {
    offbeatWeight = clamp01(offbeatWeight + 0.08);
  }
  if (bundle.voiceId === 'charles_mingus') {
    attackDensityTendency = clamp01(attackDensityTendency + 0.05);
  }

  return {
    ...base,
    offbeatWeight,
    phraseDisplacementTendency,
    attackDensityTendency,
  };
}
