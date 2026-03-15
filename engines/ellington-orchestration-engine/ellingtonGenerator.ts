/**
 * Ellington Orchestration Engine — Plan generator
 * Converts chord progressions into sectional orchestration plans.
 */

import type {
  ChordSegment,
  OrchestrationBarPlan,
  OrchestrationPlan,
  EllingtonParameters,
  DensityLevel,
  ContrastMode,
} from './ellingtonTypes';
import { DEFAULT_PARAMS } from './ellingtonTypes';

const SECTIONS: string[] = ['saxes', 'trumpets', 'trombones'];
const DENSITY_LEVELS: DensityLevel[] = ['sparse', 'medium', 'dense', 'tutti'];
const CONTRAST_MODES: ContrastMode[] = ['colour', 'weight', 'response', 'combined'];

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function weightedPick<T>(
  items: T[],
  weights: number[],
  rnd: () => number
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let v = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    v -= weights[i];
    if (v <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function generateOrchestrationPlan(
  progression: ChordSegment[],
  params: Partial<EllingtonParameters> = {},
  seed: number = Date.now()
): OrchestrationPlan {
  const p = { ...DEFAULT_PARAMS, ...params };
  const rnd = seededRandom(seed);

  const totalBars = progression.reduce((sum, seg) => sum + seg.bars, 0);
  const bars: OrchestrationBarPlan[] = [];

  let barIndex = 0;
  let currentLead: string = pick(SECTIONS, rnd);
  let currentDensity: DensityLevel = 'sparse';
  let phraseIndex = 0;

  for (const seg of progression) {
    for (let b = 0; b < seg.bars; b++) {
      const bar = barIndex + 1;
      const phraseProgress = barIndex / totalBars;

      const densityRoll = rnd();
      if (phraseProgress > p.tuttiThreshold && densityRoll > 0.7) {
        currentDensity = 'tutti';
      } else if (phraseProgress > 0.6 && densityRoll > 0.5 - p.densityBias * 0.3) {
        currentDensity = currentDensity === 'sparse' ? 'medium' : currentDensity === 'medium' ? 'dense' : currentDensity;
      } else if (phraseProgress < 0.3 && rnd() > 0.3) {
        currentDensity = 'sparse';
      }

      const supportCandidates = SECTIONS.filter((s) => s !== currentLead);
      const supportSection = pick(supportCandidates, rnd);

      const callResponse = rnd() < p.callResponseStrength
        ? (phraseIndex % 2 === 0 ? 'call' : 'response')
        : 'none';

      const contrastMode = weightedPick(
        CONTRAST_MODES,
        [0.2, 0.2, 0.2, 0.4],
        rnd
      );

      const tutti = currentDensity === 'tutti';
      const background = rnd() < p.backgroundFigureDensity
        ? 'pad'
        : rnd() < 0.3
          ? 'ostinato'
          : 'none';

      const comments: string[] = [];
      if (tutti) comments.push('tutti');
      if (callResponse !== 'none') comments.push(callResponse);
      if (background !== 'none') comments.push(`background: ${background}`);

      if (phraseProgress > 0.7 && rnd() > 0.6) {
        phraseIndex++;
        const nextLead = pick(SECTIONS, rnd) as string;
        if (nextLead !== currentLead) {
          currentLead = nextLead;
          comments.push('lead change');
        }
      }

      bars.push({
        bar,
        chord: seg.chord,
        leadSection: currentLead,
        supportSection: supportSection,
        density: currentDensity,
        contrastMode,
        callResponse: callResponse as 'call' | 'response' | 'none',
        tutti,
        background,
        comments,
      });

      barIndex++;
    }
  }

  return {
    bars,
    totalBars,
    progression,
  };
}
