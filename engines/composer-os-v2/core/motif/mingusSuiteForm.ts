/**
 * Charles Mingus — blues-as-architecture suite form (additive; episodic collective-improv grammar).
 */

export type MingusSectionType =
  | 'free_intro'
  | 'extended_blues'
  | 'collective_pedal'
  | 'gospel_shout'
  | 'elegy_coda';

export type MingusHarmonicMode = 'blues' | 'gospel' | 'free' | 'pedal_modal' | 'chromatic';

export type MingusBassMode = 'pedal' | 'chromatic_walk' | 'ostinato' | 'melodic_rubato';

export type MingusCadenceType = 'collective_arrival' | 'fade' | 'plagal' | 'ambiguous_minor';

export interface MingusSection {
  id: string;
  type: MingusSectionType;
  harmonicMode: MingusHarmonicMode;
  bassMode: MingusBassMode;
  cadenceType: MingusCadenceType;
  durationBars: number;
  lineAgentCount: number;
  pitchPool: 'blues' | 'gospel' | 'free_chromatic' | 'dorian';
  rhythmEngine: 'free' | 'swing' | 'second_line' | 'gospel_6_8';
  gospelShoutEnabled: boolean;
  collectiveImprovEnabled: boolean;
}

export interface MingusSuiteForm {
  id: string;
  sections: MingusSection[];
  primaryTonic: number;
  bluesScaleDegrees: number[];
  gospelColorChords: string[];
  recenterEveryBars: number;
  allowPermutation: boolean;
}

function seededUnit(seed: number, salt: number): number {
  let s = (seed * 7919 + salt * 104729) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

/** Largest-remainder allocation so bar counts sum exactly to `totalBars`. */
function distributeSectionBars(totalBars: number): readonly [number, number, number, number, number] {
  const ratios = [0.15, 0.3, 0.25, 0.2, 0.1] as const;
  const exact = ratios.map((r) => totalBars * r);
  const floors = exact.map((x) => Math.floor(x));
  let rem = totalBars - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) {
    const idx = order[k % order.length]!.i;
    floors[idx] = (floors[idx] ?? 0) + 1;
  }
  return floors as [number, number, number, number, number];
}

const SUITE_SECTION_ORDER: readonly MingusSectionType[] = [
  'free_intro',
  'extended_blues',
  'collective_pedal',
  'gospel_shout',
  'elegy_coda',
];

function slugVoice(voiceId: string): string {
  return voiceId.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Five-part episodic suite: free_intro → extended_blues → collective_pedal → gospel_shout → elegy_coda.
 * Bar lengths follow ~15% / 30% / 25% / 20% / 10% of `totalBars` (integer allocation).
 */
export function buildMingusSuiteForm(voiceId: string, seed: number, totalBars: number): MingusSuiteForm {
  const safeTotal = Math.max(5, Math.floor(totalBars));
  const bars = distributeSectionBars(safeTotal);
  const slug = slugVoice(voiceId);
  const allowPermutation = seededUnit(seed, 77) > 0.5;

  const sections: MingusSection[] = SUITE_SECTION_ORDER.map((type, i) => {
    const dur = bars[i] ?? 4;
    const baseId = `cm_${slug}_${seed}_${type}`;
    switch (type) {
      case 'free_intro':
        return {
          id: baseId,
          type,
          harmonicMode: 'pedal_modal',
          bassMode: 'pedal',
          cadenceType: 'fade',
          durationBars: dur,
          lineAgentCount: 2,
          pitchPool: 'blues',
          rhythmEngine: 'free',
          gospelShoutEnabled: false,
          collectiveImprovEnabled: true,
        };
      case 'extended_blues':
        return {
          id: baseId,
          type,
          harmonicMode: 'blues',
          bassMode: 'chromatic_walk',
          cadenceType: 'collective_arrival',
          durationBars: dur,
          lineAgentCount: 3,
          pitchPool: 'blues',
          rhythmEngine: 'swing',
          gospelShoutEnabled: false,
          collectiveImprovEnabled: true,
        };
      case 'collective_pedal':
        return {
          id: baseId,
          type,
          harmonicMode: 'pedal_modal',
          bassMode: 'ostinato',
          cadenceType: 'collective_arrival',
          durationBars: dur,
          lineAgentCount: 4,
          pitchPool: 'dorian',
          rhythmEngine: 'second_line',
          gospelShoutEnabled: false,
          collectiveImprovEnabled: true,
        };
      case 'gospel_shout':
        return {
          id: baseId,
          type,
          harmonicMode: 'gospel',
          bassMode: 'chromatic_walk',
          cadenceType: 'collective_arrival',
          durationBars: dur,
          lineAgentCount: 4,
          pitchPool: 'gospel',
          rhythmEngine: 'gospel_6_8',
          gospelShoutEnabled: true,
          collectiveImprovEnabled: false,
        };
      case 'elegy_coda':
        return {
          id: baseId,
          type,
          harmonicMode: 'chromatic',
          bassMode: 'melodic_rubato',
          cadenceType: 'ambiguous_minor',
          durationBars: dur,
          lineAgentCount: 2,
          pitchPool: 'blues',
          rhythmEngine: 'free',
          gospelShoutEnabled: false,
          collectiveImprovEnabled: false,
        };
    }
  });

  return {
    id: `mingus_suite_${slug}_${seed}`,
    sections,
    primaryTonic: 62,
    bluesScaleDegrees: [0, 3, 5, 6, 7, 10],
    gospelColorChords: ['I7', 'IV7', 'bVI7', 'V7/IV', 'VI7'],
    recenterEveryBars: 8,
    allowPermutation,
  };
}
