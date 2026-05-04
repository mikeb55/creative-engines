import { buildBeatContextLegalityMap } from '../harmony/beatContextLegalityMap';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import type { TensionState } from '../harmony/layerStateMachine';

export type MotifNote = {
  pitchClass: number;
  beatPosition: number;
  duration: number;
};

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function relToAbs(rootPc: number, rel: number): number {
  return normalizePc(rootPc + rel);
}

function nearestInPool(pc: number, pool: readonly number[]): number {
  if (pool.length === 0) return normalizePc(pc);
  let best = pool[0]!;
  let bestD = 99;
  for (const p of pool) {
    const d = Math.min(Math.abs(normalizePc(pc) - p), 12 - Math.abs(normalizePc(pc) - p));
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return normalizePc(best);
}

function transformSequence(
  motif: MotifNote[],
  poolPicker: (idx: number, pc: number) => number
): MotifNote[] {
  return motif.map((n, idx) => ({
    pitchClass: poolPicker(idx, n.pitchClass),
    beatPosition: n.beatPosition,
    duration: n.duration,
  }));
}

/**
 * Restates a motif once per {@link TensionState}: same rhythm grid, pitch classes re-quantised to vault pools.
 */
export function transformMotifThroughLayers(
  motif: MotifNote[],
  chordTypeId: string,
  rootPc: number
): Record<TensionState, MotifNote[]> {
  const root = normalizePc(rootPc);
  const spec = selectQuadratonicMelodySpec(chordTypeId);
  const legality = buildBeatContextLegalityMap(chordTypeId, root);

  const empty: Record<TensionState, MotifNote[]> = {
    resolve: [],
    primary: [],
    tension: [],
    chaos: [],
    recover: [],
  };

  if (!spec || legality.size === 0) {
    return {
      resolve: motif.map((n) => ({ ...n })),
      primary: motif.map((n) => ({ ...n })),
      tension: motif.map((n) => ({ ...n })),
      chaos: motif.map((n) => ({ ...n })),
      recover: motif.map((n) => ({ ...n })),
    };
  }

  const triadAbs = spec.melodicTriad.map((t) => relToAbs(root, t.pitchClassFromRoot));
  const quadRel = spec.quadratonicPitchClassesFromRoot;
  const quadAbs = quadRel.map((rel) => relToAbs(root, rel));

  const secondaryAbs: number[] = [];
  for (const [pc, tag] of legality) {
    if (tag.tonalRole === 'secondaryTension') secondaryAbs.push(normalizePc(pc));
  }

  const primaryPool = quadAbs;
  const chaosPool = quadAbs;

  const states: TensionState[] = ['resolve', 'primary', 'tension', 'chaos', 'recover'];
  const out = { ...empty };

  for (const state of states) {
    if (state === 'resolve') {
      out.resolve = transformSequence(motif, (_i, pc) => nearestInPool(pc, triadAbs));
      continue;
    }
    if (state === 'primary') {
      out.primary = transformSequence(motif, (_i, pc) => nearestInPool(pc, primaryPool));
      continue;
    }
    if (state === 'tension') {
      const pool = secondaryAbs.length > 0 ? secondaryAbs : quadAbs;
      out.tension = transformSequence(motif, (_i, pc) => nearestInPool(pc, pool));
      continue;
    }
    if (state === 'chaos') {
      out.chaos = transformSequence(motif, (_i, pc) => nearestInPool(pc, chaosPool));
      continue;
    }
    if (state === 'recover') {
      out.recover = transformSequence(motif, (idx, pc) => {
        const triadTarget = nearestInPool(pc, triadAbs);
        if (idx % 2 === 0) return triadTarget;
        return normalizePc(triadTarget - 1);
      });
    }
  }

  return out;
}
