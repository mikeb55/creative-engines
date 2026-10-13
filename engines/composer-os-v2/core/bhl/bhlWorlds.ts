/**
 * BHL Batch A — six harmonic worlds.
 * Pitch sets are built here. Tonality Vault and liquid harmony are read, not modified.
 * Root motion of a fifth is not a world operation.
 */

import { planLiquidHarmony } from '../harmony/liquidHarmonyPlanner';
import type { TensionState } from '../harmony/layerStateMachine';
import { chooseVaultChord, bhlPitchClassName } from './bhlPhrase';
import type { BhlBassBar } from './bhlRhythm';

export const BHL_WORLD_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type BhlWorldId = (typeof BHL_WORLD_IDS)[number];

export interface BhlWorldInfo {
  id: BhlWorldId;
  name: string;
  /** What the guitar is allowed to treat as its harmonic object. */
  resource: string;
}

export const BHL_WORLDS: readonly BhlWorldInfo[] = [
  { id: 'A', name: 'Triad Pairs', resource: 'Two major triads a major second apart. They share no pitch class. Motion inside one triad can keep a chord tone. The next triad is the contrast.' },
  { id: 'B', name: 'Harmonic Quadratonics', resource: 'One Tonality Vault quadratonic: three chord tones plus the primary tension, via planLiquidHarmony. The tension tone is the contrast. The chord tones are the common tones.' },
  { id: 'C', name: 'Major + Augmented', resource: 'Major triad plus the augmented triad on the same root. The major third is the common tone. The raised fifth is the contrast. The augmented triad can also move by a major third, which is not a fifth.' },
  { id: 'D', name: 'Major + Diminished', resource: 'Major triad plus the diminished triad on the same root. The root is the common tone. The minor third and tritone are the contrast.' },
  { id: 'E', name: 'Pentatonic Harmony', resource: 'Major pentatonic on the bass root, stacked as pentatonic dyads. No leading tone and no dominant seventh.' },
  { id: 'F', name: 'Unrelated Major Triads', resource: 'Major triads whose roots sit a minor third and a tritone apart. Those roots are not a fourth or a fifth. A minor-third pair can keep its one shared tone. The tritone triad shares none.' },
];

export interface BhlWorldField {
  world: BhlWorldId;
  name: string;
  /** Absolute pitch classes the guitar may sound, apart from the opening motif statement. */
  pitchClasses: number[];
  /** Groups the line can move inside. Contrast is a move to another group. */
  groups: number[][];
  chordType: string | null;
  rootPc: number;
  contrastInterval: number;
  liquidMelodyPc: number | null;
}

const mod12 = (value: number) => ((value % 12) + 12) % 12;

function shift(root: number, intervals: readonly number[]): number[] {
  return intervals.map((interval) => mod12(root + interval));
}

function uniq(values: readonly number[]): number[] {
  return [...new Set(values.map(mod12))].sort((a, b) => a - b);
}

export function isBhlWorldId(value: unknown): value is BhlWorldId {
  return typeof value === 'string' && (BHL_WORLD_IDS as readonly string[]).includes(value);
}

export function bhlWorldInfo(id: BhlWorldId): BhlWorldInfo {
  return BHL_WORLDS.find((world) => world.id === id)!;
}

/** Functional fifths are not available as a world root step. */
export function isFifthStep(interval: number): boolean {
  const step = mod12(interval);
  return step === 5 || step === 7;
}

export function buildBhlWorldField(
  world: BhlWorldId,
  bar: BhlBassBar,
  tension: TensionState,
): BhlWorldField {
  const root = bar.rootPc;
  const info = bhlWorldInfo(world);
  if (world === 'A') {
    const lower = shift(root, [0, 4, 7]);
    const upper = shift(root, [2, 6, 9]);
    return {
      world,
      name: info.name,
      pitchClasses: uniq([...lower, ...upper]),
      groups: [lower, upper],
      chordType: null,
      rootPc: root,
      contrastInterval: 2,
      liquidMelodyPc: null,
    };
  }
  if (world === 'B') {
    const vault = chooseVaultChord(bar.pitchClasses.length ? bar.pitchClasses : [root], root);
    const liquid = planLiquidHarmony(vault.chordType, root, tension);
    const pcs = uniq([liquid.melodyPitchClass, ...liquid.voicingPitchClasses]);
    const chordTones = liquid.voicingPitchClasses.filter((pitchClass) => pitchClass !== liquid.melodyPitchClass);
    return {
      world,
      name: info.name,
      pitchClasses: pcs.length ? pcs : [root],
      groups: [uniq(chordTones.length ? chordTones : pcs), [liquid.melodyPitchClass]],
      chordType: vault.chordType,
      rootPc: root,
      contrastInterval: mod12(liquid.melodyPitchClass - root) || 1,
      liquidMelodyPc: liquid.melodyPitchClass,
    };
  }
  if (world === 'C') {
    const major = shift(root, [0, 4, 7]);
    const augmented = shift(root, [0, 4, 8]);
    const spun = shift(mod12(root + 4), [0, 4, 8]);
    return {
      world,
      name: info.name,
      pitchClasses: uniq([...major, ...augmented, ...spun]),
      groups: [major, augmented, spun],
      chordType: null,
      rootPc: root,
      contrastInterval: 8,
      liquidMelodyPc: null,
    };
  }
  if (world === 'D') {
    const major = shift(root, [0, 4, 7]);
    const diminished = shift(root, [0, 3, 6]);
    return {
      world,
      name: info.name,
      pitchClasses: uniq([...major, ...diminished]),
      groups: [major, diminished],
      chordType: null,
      rootPc: root,
      contrastInterval: 3,
      liquidMelodyPc: null,
    };
  }
  if (world === 'E') {
    const pentatonic = shift(root, [0, 2, 4, 7, 9]);
    return {
      world,
      name: info.name,
      pitchClasses: pentatonic,
      groups: [
        [pentatonic[0]!, pentatonic[2]!, pentatonic[3]!],
        [pentatonic[1]!, pentatonic[4]!],
      ],
      chordType: null,
      rootPc: root,
      contrastInterval: 2,
      liquidMelodyPc: null,
    };
  }
  const first = shift(root, [0, 4, 7]);
  const second = shift(mod12(root + 3), [0, 4, 7]);
  const third = shift(mod12(root + 6), [0, 4, 7]);
  return {
    world,
    name: info.name,
    pitchClasses: uniq([...first, ...second, ...third]),
    groups: [first, second, third],
    chordType: null,
    rootPc: root,
    contrastInterval: 6,
    liquidMelodyPc: null,
  };
}

export function formatWorldPcs(pitchClasses: readonly number[]): string {
  return pitchClasses.map((pitchClass) => bhlPitchClassName(pitchClass)).join(' ');
}

/** First pitch class of `next` that is already in `previous`, if any. */
export function sharedPitchClass(previous: readonly number[], next: readonly number[]): number | null {
  const have = new Set(previous.map(mod12));
  return next.map(mod12).find((pitchClass) => have.has(pitchClass)) ?? null;
}
