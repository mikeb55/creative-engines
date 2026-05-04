import { selectQuadratonicMelodySpec } from './quadratonicMelodySelector';
import type { TensionState } from './layerStateMachine';

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

export type LiquidHarmonyPlan = {
  /** Single melody pitch class (absolute 0–11). */
  melodyPitchClass: number;
  /** Remaining quadratonic chord-tone PCs assigned to inner / shell voicing. */
  voicingPitchClasses: number[];
  /**
   * Beat offset for resolution of the primary tension: **`0.5`** = next subdivision (eighth in quarter-based 4/4);
   * **`0`** when the melody is already a triad tone (nothing to “resolve” off the tension).
   * Pair with **`nearestResolvePitchClassToTriad`** for the target triad PC.
   */
  tensionResolvesOnBeat: number;
  chordTypeId: string;
};

/** Nearest melodic-triad pitch class to the primary tension (circle distance). */
export function nearestResolvePitchClassToTriad(tensionAbs: number, triadAbs: readonly number[]): number {
  let best = triadAbs[0] ?? tensionAbs;
  let bestDist = 99;
  for (const t of triadAbs) {
    const d = Math.min(Math.abs(tensionAbs - t), 12 - Math.abs(tensionAbs - t));
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return normalizePc(best);
}

/**
 * One chord snapshot: quadratonic pool from Tonality Vault, melody vs voicing split by {@link TensionState}.
 */
export function planLiquidHarmony(
  chordTypeId: string,
  rootPc: number,
  state: TensionState
): LiquidHarmonyPlan {
  const spec = selectQuadratonicMelodySpec(chordTypeId);
  const root = normalizePc(rootPc);

  if (!spec) {
    return {
      melodyPitchClass: root,
      voicingPitchClasses: [],
      tensionResolvesOnBeat: 0,
      chordTypeId,
    };
  }

  const triadAbs = spec.melodicTriad.map((t) => normalizePc(root + t.pitchClassFromRoot));
  const tensionAbs = normalizePc(root + spec.primaryTension.pitchClassFromRoot);
  const quad = [...new Set([...triadAbs, tensionAbs])].map(normalizePc);

  let melodyPitchClass: number;
  if (state === 'tension' || state === 'chaos') {
    melodyPitchClass = tensionAbs;
  } else if (state === 'resolve' || state === 'recover') {
    melodyPitchClass = triadAbs[0]!;
  } else {
    melodyPitchClass = triadAbs[1] ?? triadAbs[0]!;
  }

  const voicingPitchClasses = quad.filter((pc) => pc !== melodyPitchClass);

  const usesTensionMelody = melodyPitchClass === tensionAbs;
  const tensionResolvesOnBeat = usesTensionMelody ? 0.5 : 0;

  return {
    melodyPitchClass,
    voicingPitchClasses,
    tensionResolvesOnBeat,
    chordTypeId,
  };
}
