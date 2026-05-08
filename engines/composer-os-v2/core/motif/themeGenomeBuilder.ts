/**
 * Builds deterministic {@link ThemeGenome} per Song Mode primary voice (+ optional phrase-engine pool).
 */

import type { MotifPool } from '../goldenPath/phraseEngineV2';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import type {
  MotifCell2,
  MotifCell2HarmonicMask,
  MotifCell2TransformBudget,
  SectionRecallContract,
  ThemeGenome,
} from './themeGenome';

function intervalsFromPitches(pitches: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    out.push(pitches[i]! - pitches[i - 1]!);
  }
  return out;
}

const DEFAULT_SECTION_CONTRACT: SectionRecallContract = {
  A: { presentWithin: 8, transformations: 3 },
  B: { minTransformations: 2, transformDimensions: ['contour', 'register', 'rhythm'] },
  coda: { recoverBy: 'both' },
};

function invertContour(c: ('up' | 'down' | 'same')[]): ('up' | 'down' | 'same')[] {
  return c.map((x) => (x === 'up' ? 'down' : x === 'down' ? 'up' : 'same'));
}

const TB_GIL: MotifCell2TransformBudget = {
  transpose: true,
  invert: true,
  retrograde: false,
  augment: true,
  diminish: false,
  fragment: true,
  sequence: false,
  embedInnerVoice: true,
};

const TB_MS: MotifCell2TransformBudget = {
  transpose: true,
  invert: false,
  retrograde: false,
  augment: true,
  diminish: false,
  fragment: true,
  sequence: true,
  embedInnerVoice: true,
};

const TB_COL: MotifCell2TransformBudget = {
  transpose: true,
  invert: true,
  retrograde: true,
  augment: false,
  diminish: true,
  fragment: true,
  sequence: true,
  embedInnerVoice: false,
};

const TB_BAL: MotifCell2TransformBudget = {
  transpose: true,
  invert: true,
  retrograde: false,
  augment: true,
  diminish: true,
  fragment: true,
  sequence: true,
  embedInnerVoice: true,
};

function maskBalanced(): MotifCell2HarmonicMask {
  return { chordTonesBias: 0.5, tensionBias: 0.35 };
}

function cellGilEvans(): MotifCell2 {
  const intervals = [2, 5, 2, -3];
  const durations = [1.5, 1.5, 2, 2, 4];
  const contour: ('up' | 'down' | 'same')[] = ['same', 'up', 'up', 'up', 'down'];
  const accents = durations.map((d) => 0.35 + Math.min(0.35, d / 8));
  return {
    id: 'gil_primary',
    role: 'primary',
    intervals,
    durations,
    contour,
    accents,
    registerBand: [55, 76],
    harmonicMask: { chordTonesBias: 0.3, tensionBias: 0.2, avoidStrongLT: true, pedalFriendly: true },
    transformBudget: TB_GIL,
    recallWeight: 0.92,
  };
}

function cellMariaSchneider(): MotifCell2 {
  const intervals = [2, 3, 2, -2];
  const durations = [1, 1, 1.5, 2, 2];
  const contour: ('up' | 'down' | 'same')[] = ['same', 'up', 'up', 'up', 'down'];
  const accents = [0.45, 0.48, 0.5, 0.55, 0.4];
  return {
    id: 'ms_primary',
    role: 'primary',
    intervals,
    durations,
    contour,
    accents,
    registerBand: [57, 79],
    harmonicMask: { chordTonesBias: 0.5, tensionBias: 0.3, avoidStrongLT: true, pedalFriendly: false },
    transformBudget: TB_MS,
    recallWeight: 0.9,
  };
}

function cellJohnColtrane(): MotifCell2 {
  const intervals = [1, 3, -2, 4];
  const durations = [0.5, 0.5, 0.5, 1, 0.5];
  const contour: ('up' | 'down' | 'same')[] = ['same', 'up', 'up', 'down', 'up'];
  const accents = [0.55, 0.55, 0.56, 0.6, 0.55];
  return {
    id: 'col_primary',
    role: 'primary',
    intervals,
    durations,
    contour,
    accents,
    registerBand: [60, 84],
    harmonicMask: { chordTonesBias: 0.6, tensionBias: 0.6, pentatonicOnly: false },
    transformBudget: TB_COL,
    recallWeight: 0.88,
  };
}

function cellBalancedDefault(seed: number): MotifCell2 {
  const intervals = [2, 3, -2, 2];
  const durations = [1, 1, 1, 1.5, 2];
  void seed;
  return {
    id: 'neutral_primary',
    role: 'primary',
    intervals,
    durations,
    contour: ['same', 'up', 'up', 'down', 'up'],
    accents: [0.5, 0.5, 0.5, 0.5, 0.45],
    registerBand: [57, 79],
    harmonicMask: maskBalanced(),
    transformBudget: TB_BAL,
    recallWeight: 0.85,
  };
}

function cellWayneShorter(): MotifCell2 {
  const intervals = [2, 2, 12, -2, -2];
  const durations = [2.5, 2, 0.5, 0.5, 1.5, 2];
  const contour: ('up' | 'down' | 'same')[] = ['same', 'up', 'up', 'up', 'down', 'down'];
  const accents = durations.map((d, i) => 0.38 + (i % 3) * 0.06 + Math.min(0.2, d / 10));
  return {
    id: 'ws_primary',
    role: 'primary',
    intervals,
    durations,
    contour,
    accents,
    registerBand: [57, 81],
    harmonicMask: {
      chordTonesBias: 0.3,
      tensionBias: 0.4,
      avoidStrongLT: true,
      pedalFriendly: true,
    },
    transformBudget: {
      transpose: true,
      invert: true,
      retrograde: false,
      augment: true,
      diminish: true,
      fragment: true,
      sequence: true,
      embedInnerVoice: true,
    },
    recallWeight: 0.85,
  };
}

function secondaryFromPrimary(primary: MotifCell2, id: string): MotifCell2 {
  const inv = primary.intervals.map((x) => -x);
  const durAug = primary.durations.map((d) => Math.min(4, d * 1.25));
  const invContour = invertContour(primary.contour);
  return {
    ...primary,
    id,
    role: 'secondary',
    intervals: inv,
    durations: durAug,
    contour: invContour.length === primary.contour.length ? invContour : primary.contour,
    recallWeight: primary.recallWeight * 0.85,
  };
}

function cadentialFromPrimary(primary: MotifCell2): MotifCell2 {
  return {
    id: `${primary.id}_cadence`,
    role: 'cadential',
    intervals: [-2],
    durations: [2, 2],
    contour: ['same', 'down'],
    accents: [0.4, 0.35],
    registerBand: [Math.max(48, primary.registerBand[0] - 2), primary.registerBand[1]],
    harmonicMask: { ...primary.harmonicMask, chordTonesBias: Math.min(1, primary.harmonicMask.chordTonesBias + 0.1) },
    transformBudget: { ...primary.transformBudget, fragment: true },
    recallWeight: 0.75,
  };
}

function bridgeFromVoicing(primary: MotifCell2, secondary: MotifCell2): MotifCell2 {
  const nInt = Math.min(3, primary.intervals.length, secondary.intervals.length);
  const intervals = primary.intervals.slice(0, nInt).map((x, i) => x + Math.round((secondary.intervals[i] ?? 0) * 0.25));
  const noteCount = intervals.length + 1;
  const durations: number[] = [];
  for (let i = 0; i < noteCount; i++) {
    durations.push(secondary.durations[i] ?? primary.durations[i] ?? 1);
  }
  const contour: ('up' | 'down' | 'same')[] = [];
  for (let i = 0; i < noteCount; i++) {
    contour.push(secondary.contour[i] ?? primary.contour[i] ?? 'same');
  }
  const accents: number[] = [];
  for (let i = 0; i < noteCount; i++) {
    accents.push(primary.accents[i] ?? 0.45);
  }
  return {
    id: `${primary.id}_bridge`,
    role: 'bridge',
    intervals,
    durations,
    contour,
    accents,
    registerBand: [
      Math.min(primary.registerBand[0], secondary.registerBand[0]) + 2,
      Math.max(primary.registerBand[1], secondary.registerBand[1]),
    ],
    harmonicMask: primary.harmonicMask,
    transformBudget: primary.transformBudget,
    recallWeight: 0.7,
  };
}

function primaryForVoice(canon: string, seed: number): MotifCell2 {
  if (canon === 'gil_evans') return cellGilEvans();
  if (canon === 'maria_schneider') return cellMariaSchneider();
  if (canon === 'john_coltrane') return cellJohnColtrane();
  if (canon === 'wayne_shorter') return cellWayneShorter();
  return cellBalancedDefault(seed);
}

function extractPrimaryFromPool(pool: MotifPool): MotifCell2 | null {
  for (const c of pool.cells) {
    if (c.weight <= 0 || c.pitches.length < 2) continue;
    const intervals = intervalsFromPitches(c.pitches);
    const contour: ('up' | 'down' | 'same')[] = ['same'];
    for (let i = 1; i < c.pitches.length; i++) {
      const d = c.pitches[i]! - c.pitches[i - 1]!;
      contour.push(d > 1 ? 'up' : d < -1 ? 'down' : 'same');
    }
    const dur =
      c.durations.length === intervals.length + 1
        ? [...c.durations]
        : [...c.durations, ...Array(Math.max(0, intervals.length + 1 - c.durations.length)).fill(1)];
    while (dur.length < intervals.length + 1) dur.push(1);
    const accents = dur.map(() => 0.5);
    return {
      id: 'pool_primary',
      role: 'primary',
      intervals,
      durations: dur.slice(0, intervals.length + 1),
      contour:
        contour.length === intervals.length + 1
          ? contour
          : [...contour, ...Array(Math.max(0, intervals.length + 1 - contour.length)).fill('same' as const)],
      accents: accents.slice(0, intervals.length + 1),
      registerBand: [Math.min(...c.pitches) - 2, Math.max(...c.pitches) + 2],
      harmonicMask: maskBalanced(),
      transformBudget: TB_BAL,
      recallWeight: 0.88,
    };
  }
  return null;
}

export function buildThemeGenome(voiceId: string, seed: number, existingPool?: MotifPool): ThemeGenome {
  const canon = normalizeSongwriterStyleKey(voiceId) ?? voiceId;
  const generationId = `mal-gen_${canon}_${seed}`;
  const id = `tg_${canon}_${seed}`;

  const fromPool = existingPool ? extractPrimaryFromPool(existingPool) : null;
  const primary = fromPool ?? primaryForVoice(canon, seed);
  const secondary = secondaryFromPrimary(primary, `${primary.id}_secondary`);
  const cadentialTail = cadentialFromPrimary(primary);
  const bridgeCell = bridgeFromVoicing(primary, secondary);

  return {
    id,
    generationId,
    primaryCell: primary,
    secondaryCell: secondary,
    cadentialTail,
    bridgeCell,
    voiceId: canon,
    recallQuota: 0.6,
    sectionContracts: DEFAULT_SECTION_CONTRACT,
  };
}
