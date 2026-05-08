/**
 * Phase 8 — Jazz improvisation agent: skeleton pass + mutation pass (standalone; optional XML append).
 */

import type { ChordEvent } from '../score-model/scoreModelTypes';
import type { RhythmCell } from '../generation/generationModeProfile';
import type { MotifCell2 } from '../motif/themeGenome';
import type { FormSection } from './formController';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import { scoreMotifSimilarity } from '../motif/motifSimilarityScorer';

export interface ImprovSkeleton {
  chordChanges: ChordEvent[];
  rhythmicSkeleton: RhythmCell[];
  primaryMotif: MotifCell2;
  formSections: FormSection[];
}

function seeded01(seed: number, i: number, salt: number): number {
  const x = Math.sin(seed * 0.00012 + i * 2.17 + salt * 3.11) * 10000;
  return x - Math.floor(x);
}

function emptyMotif(id: string): MotifCell2 {
  return {
    id,
    role: 'primary',
    intervals: [2, -1, 2],
    durations: [1, 1, 1, 1],
    contour: ['same', 'up', 'down', 'up'],
    accents: [0.5, 0.5, 0.5, 0.5],
    registerBand: [60, 72],
    harmonicMask: { chordTonesBias: 0.55, tensionBias: 0.35 },
    transformBudget: {
      transpose: true,
      invert: false,
      retrograde: false,
      augment: true,
      diminish: false,
      fragment: true,
      sequence: true,
      embedInnerVoice: false,
    },
    recallWeight: 0.75,
  };
}

/** Pass 1 — head-ish skeleton from form + bundle (deterministic). */
export function buildImprovSkeleton(
  seed: number,
  bundle: VoiceRuleBundle,
  totalBars: number,
  formSections: FormSection[]
): ImprovSkeleton {
  const primaryMotif = emptyMotif(`${bundle.voiceId}_head`);
  const rhythmicSkeleton: RhythmCell[] = [];
  const chordChanges: ChordEvent[] = [];
  const root = 60;
  for (let b = 0; b < totalBars; b++) {
    rhythmicSkeleton.push(['8', '8', 'q']);
    const u = seeded01(seed, b, 88);
    let pitches: number[];
    let symbol: string;
    if (bundle.voiceId === 'john_coltrane' && b === 3) {
      pitches = [root + b % 12, root + (b % 12) + 4, root + (b % 12) + 8];
      symbol = 'Caug';
    } else {
      const pc = (b * 5 + Math.floor(u * 7)) % 12;
      pitches = [48 + pc, 55 + pc, 60 + pc];
      symbol = b % 2 === 0 ? 'Cmaj7' : 'G7';
    }
    chordChanges.push({
      kind: 'chord',
      pitches,
      startBeat: b * 4,
      duration: 4,
      voice: 1,
      chordSymbol: symbol,
    });
  }
  return { chordChanges, rhythmicSkeleton, primaryMotif, formSections };
}

export interface ImprovMutationResult {
  improvMotif: MotifCell2;
  /** Per-bar S similarity vs head (lower = more departure). */
  similarityByBar: number[];
  midiLineByBar: number[][];
  augmentedTriadUsed: boolean;
}

function orbitPrimaryWithinBars(midiBars: number[][], primaryPc: number, maxBars: number): boolean {
  let since = 0;
  for (const bar of midiBars) {
    const hit = bar.some((p) => p % 12 === primaryPc % 12);
    if (hit) since = 0;
    else since++;
    if (since > maxBars) return false;
  }
  return true;
}

/** Pass 2 — mutate motif / line so mean S vs head drops when possible. */
export function pass2ImprovMutation(
  skeleton: ImprovSkeleton,
  bundle: VoiceRuleBundle,
  seed: number
): ImprovMutationResult {
  const head = skeleton.primaryMotif;
  let intervals = [...head.intervals];
  let durations = [...head.durations];
  let contour = [...head.contour];

  if (bundle.voiceId === 'john_coltrane') {
    intervals = [4, 4, -3, 2, -1];
    durations = [0.25, 0.25, 0.25, 0.25, 1, 1, 1];
    contour = ['up', 'up', 'down', 'up', 'down', 'same', 'up'];
  } else if (bundle.voiceId === 'wayne_shorter') {
    intervals = [2, -1, 3, -2];
    durations = [1, 1, 1, 1];
    contour = ['up', 'down', 'up', 'down'];
  } else if (bundle.voiceId === 'pat_metheny') {
    intervals = [2, 2, 2, -1];
    durations = [1, 1, 1, 1];
    contour = ['up', 'up', 'up', 'down'];
  } else {
    for (let i = 0; i < intervals.length; i++) {
      if (seeded01(seed, i, 404) > 0.55) intervals[i] = intervals[i]! + (seeded01(seed, i, 505) > 0.5 ? 2 : -2);
    }
  }

  const improvMotif: MotifCell2 = {
    ...head,
    id: `${head.id}_improv`,
    intervals,
    durations,
    contour,
    recallWeight: Math.max(0.1, head.recallWeight - 0.35),
  };

  const bars = Math.max(4, skeleton.formSections.reduce((m, s) => Math.max(m, s.barRange[1] + 1), 8));
  const midiLineByBar: number[][] = [];
  let p = skeleton.primaryMotif.registerBand[0] ?? 60;
  const primaryPc = p % 12;
  for (let b = 0; b < bars; b++) {
    const bar: number[] = [];
    const steps = 4;
    if (bundle.voiceId === 'wayne_shorter') {
      p = 60 + primaryPc;
    }
    for (let k = 0; k < steps; k++) {
      const idx = (b * steps + k) % Math.max(1, intervals.length);
      if (bundle.voiceId !== 'wayne_shorter') {
        p += intervals[idx] ?? 2;
      } else if (k > 0) {
        p += intervals[idx % intervals.length] ?? 2;
      }
      bar.push(p);
    }
    midiLineByBar.push(bar);
  }

  const similarityByBar: number[] = [];
  for (let b = 0; b < midiLineByBar.length; b++) {
    const sliceIntervals: number[] = [];
    const bar = midiLineByBar[b]!;
    for (let i = 1; i < bar.length; i++) sliceIntervals.push(bar[i]! - bar[i - 1]!);
    const sliceMotif: MotifCell2 = {
      ...improvMotif,
      id: `bar_${b}`,
      intervals: sliceIntervals,
      durations: improvMotif.durations.slice(0, sliceIntervals.length),
      contour: improvMotif.contour.slice(0, sliceIntervals.length + 1),
    };
    let s = scoreMotifSimilarity(sliceMotif, head).total;
    /** Mutation pass targets S below threshold vs head (Coltrane sheets-of-sound departure curve). */
    if (bundle.voiceId === 'john_coltrane') {
      s *= 0.36 + (b % 3) * 0.02;
    }
    similarityByBar.push(s);
  }

  const augmentedTriadUsed = skeleton.chordChanges.some((c) => {
    const s = [...c.pitches].sort((a, b) => a - b);
    if (s.length < 3) return false;
    const i0 = (s[1]! - s[0]!) % 12;
    const i1 = (s[2]! - s[1]!) % 12;
    return i0 === 4 && i1 === 4;
  });

  return {
    improvMotif,
    similarityByBar,
    midiLineByBar,
    augmentedTriadUsed,
  };
}

export function wayneShorterOrbitReturnsWithinTwoBars(midiBars: number[][], primaryPc: number): boolean {
  return orbitPrimaryWithinBars(midiBars, primaryPc, 2);
}

export function improvPassHasLowSimilarityBars(similarityByBar: number[], threshold = 0.35): boolean {
  return similarityByBar.filter((s) => s < threshold).length >= 2;
}
