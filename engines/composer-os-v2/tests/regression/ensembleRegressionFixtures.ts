/**
 * Stable planning inputs for Phase 19.1 ensemble regression (Big Band + String Quartet).
 */

import type { BigBandFormPlan, BigBandSectionPlan } from '../../core/big-band/bigBandPlanTypes';
import type { BigBandInstrumentSection } from '../../core/big-band/bigBandSectionTypes';
import type { BigBandRoleType } from '../../core/big-band/bigBandTypes';
import type { QuartetFormPlan, QuartetTexturePlan } from '../../core/string-quartet/quartetPlanTypes';
import type { QuartetInstrument } from '../../core/string-quartet/stringQuartetTypes';
import type { QuartetRoleType } from '../../core/string-quartet/quartetRoleTypes';

const BB_CYCLE = ['Cmaj7', 'Am7', 'Dm7', 'G7'] as const;
const SQ_CYCLE = ['Dmin9', 'G13', 'Cmaj9', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'] as const;

export const REGRESSION_SEED = 19_105_2026;

export function expandChordCycle(cycle: readonly string[], totalBars: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < totalBars; i += 1) out.push(cycle[i % cycle.length]!);
  return out;
}

export function bigBandFormPlanNBars(n: number): BigBandFormPlan {
  return {
    totalBars: n,
    slices: [
      {
        index: 0,
        phase: 'melody_head',
        startBar: 1,
        endBar: n,
      },
    ],
  };
}

const BB_ACTIVE_ROLES: Record<BigBandInstrumentSection, BigBandRoleType> = {
  saxes: 'lead_melody',
  trumpets: 'lead_melody',
  trombones: 'lead_melody',
  rhythm_section: 'rhythm_anchor',
};

export function bigBandSectionPlanAllSections(): BigBandSectionPlan {
  return {
    slices: [
      {
        formSliceIndex: 0,
        phase: 'melody_head',
        rolesBySection: { ...BB_ACTIVE_ROLES },
      },
    ],
  };
}

const Q_ROLES: Record<QuartetInstrument, QuartetRoleType> = {
  violin_1: 'lead',
  violin_2: 'lead',
  viola: 'harmonic_support',
  cello: 'bass_anchor',
};

export function quartetFormPlanNBars(n: number): QuartetFormPlan {
  return {
    totalBars: n,
    slices: [
      {
        index: 0,
        phase: 'statement',
        startBar: 1,
        endBar: n,
      },
    ],
  };
}

export function quartetTexturePlanStatement(): QuartetTexturePlan {
  return {
    slices: [
      {
        formSliceIndex: 0,
        phase: 'statement',
        rolesByInstrument: { ...Q_ROLES },
      },
    ],
  };
}

export function fixedChordBarsBigBand(totalBars: number): string[] {
  return expandChordCycle(BB_CYCLE, totalBars);
}

export function fixedChordBarsQuartet(totalBars: number): string[] {
  return expandChordCycle(SQ_CYCLE, totalBars);
}
