/**
 * Population Composer — per-producer harmonic cell proposals (deterministic, seeded).
 */

import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import { barsFromHarmonyTemplate } from '../music-context/compingHarmonyTemplates';
import { buildTritonicDictionary } from '../tritonic/tritonicCell';
import {
  realiseTritonic,
  type TritonicRealisationContext,
} from '../tritonic/tritonicRealisation';
import type { DramaticPhase, PopulationProducerId } from './populationComposerTypes';

const PC_ROOT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const VAULT_ANCHOR_TEMPLATE = [
  { offset: 0, suffix: 'maj7' },
  { offset: 2, suffix: 'm7' },
  { offset: 5, suffix: '7' },
  { offset: 0, suffix: 'maj7' },
] as const;

const MONK_ANGULAR_OFFSETS: Record<DramaticPhase, readonly number[]> = {
  build: [1, 6, 2],
  suspend: [5, 0],
  fracture: [6, 1, 6],
  cadence: [5, 7, 0],
  restart: [2, 6, 4],
};

const WAYNE_DRIFT_OFFSETS: Record<DramaticPhase, readonly number[]> = {
  build: [4, 9, 2],
  suspend: [5, 11, 0],
  fracture: [3, 8, 1],
  cadence: [7, 0],
  restart: [5, 10, 3],
};

const FAMILY_SUFFIX: Record<string, string> = {
  quartal: 'sus4',
  cluster: '7alt',
  suspended: '7sus4',
  shorter_floating: 'maj7',
  bergonzi: '7',
};

function rootPcFromSymbol(symbol: string): PitchClass {
  const parsed = parseChordSymbol(symbol);
  const m = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  if (!m) return 0 as PitchClass;
  const name = m[1]!;
  const idx = PC_ROOT_NAMES.findIndex(
    (n) => n.toLowerCase() === name[0]!.toUpperCase() + name.slice(1).toLowerCase(),
  );
  if (idx >= 0) return idx as PitchClass;
  const flatMap: Record<string, number> = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  return (flatMap[name[0]!.toUpperCase() + name.slice(1)] ?? 0) as PitchClass;
}

function symbolFromPc(pc: PitchClass, suffix: string): string {
  return `${PC_ROOT_NAMES[((pc % 12) + 12) % 12]!}${suffix}`;
}

function tritonicProposal(
  key: PitchClass,
  barIndex: number,
  phase: DramaticPhase,
  seed: number,
): string {
  const mode: TritonicRealisationContext['mode'] =
    phase === 'build' || phase === 'cadence' ? 'bb' : phase === 'suspend' ? 'ecm' : 'sq';
  const ctx: TritonicRealisationContext = {
    mode,
    cells: buildTritonicDictionary().cells,
    behaviourOptions: {
      oddityScore: phase === 'fracture' ? 0.7 : 0.45,
      delayedResolution: phase !== 'cadence',
      melodyPriority: false,
    },
  };
  const result = realiseTritonic(ctx);
  const flat = result.phrases.flat();
  const cell = flat[(barIndex + seed) % flat.length]!;
  const bass = [...cell.notes].sort((a, b) => a - b)[0]!;
  const rootPc = (((bass + key) % 12) + 12) % 12;
  return symbolFromPc(rootPc as PitchClass, FAMILY_SUFFIX[cell.family] ?? '7');
}

function monkProposal(
  prevSymbol: string | undefined,
  key: PitchClass,
  barIndex: number,
  phase: DramaticPhase,
): string {
  const base = prevSymbol ? rootPcFromSymbol(prevSymbol) : key;
  const offsets = MONK_ANGULAR_OFFSETS[phase];
  const offset = offsets[barIndex % offsets.length]!;
  const pc = (((base + offset) % 12) + 12) % 12;
  const suffix = phase === 'fracture' ? '7alt' : phase === 'cadence' ? '7' : 'm7';
  return symbolFromPc(pc as PitchClass, suffix);
}

function wayneProposal(
  prevSymbol: string | undefined,
  key: PitchClass,
  barIndex: number,
  phase: DramaticPhase,
): string {
  const base = prevSymbol ? rootPcFromSymbol(prevSymbol) : key;
  const offsets = WAYNE_DRIFT_OFFSETS[phase];
  const offset = offsets[barIndex % offsets.length]!;
  const pc = (((base + offset) % 12) + 12) % 12;
  const suffix =
    phase === 'suspend' ? 'maj7#11' : phase === 'restart' ? 'm7' : phase === 'cadence' ? '7' : 'm9';
  return symbolFromPc(pc as PitchClass, suffix);
}

function vaultProposal(key: PitchClass, barIndex: number): string {
  const bars = barsFromHarmonyTemplate(key, VAULT_ANCHOR_TEMPLATE);
  return bars[barIndex % bars.length]!;
}

function bigBandProposal(key: PitchClass, barIndex: number): string {
  const template = [
    { offset: 0, suffix: '7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 2, suffix: '7' },
    { offset: 5, suffix: 'm7' },
    { offset: 7, suffix: '7' },
  ] as const;
  const bars = barsFromHarmonyTemplate(key, template);
  return bars[barIndex % bars.length]!;
}

export function proposeHarmonyBar(
  producer: PopulationProducerId,
  params: {
    key: PitchClass;
    barIndex: number;
    phase: DramaticPhase;
    seed: number;
    prevSymbol?: string;
  },
): string {
  const { key, barIndex, phase, seed, prevSymbol } = params;
  switch (producer) {
    case 'tritonic':
      return tritonicProposal(key, barIndex, phase, seed);
    case 'monk':
      return monkProposal(prevSymbol, key, barIndex, phase);
    case 'wayne_shorter':
      return wayneProposal(prevSymbol, key, barIndex, phase);
    case 'vault':
      return vaultProposal(key, barIndex);
    case 'big_band':
      return bigBandProposal(key, barIndex);
    default:
      return vaultProposal(key, barIndex);
  }
}

/** Normalised root distance 0–1 for contrast scoring. */
export function harmonicContrast(prevSymbol: string | undefined, proposal: string): number {
  if (!prevSymbol) return 0.5;
  const a = rootPcFromSymbol(prevSymbol);
  const b = rootPcFromSymbol(proposal);
  const dist = Math.min((a - b + 12) % 12, (b - a + 12) % 12);
  return dist / 6;
}
