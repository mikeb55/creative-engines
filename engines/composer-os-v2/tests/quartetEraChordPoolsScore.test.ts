/**
 * String Quartet — era chord pools: score model chord symbols differ per era (deterministic, same seed).
 */

import { buildQuartetScoreModel } from '../core/string-quartet/quartetScoreBuilder';
import type { BigBandEraId } from '../core/big-band/bigBandResearchTypes';
import type { QuartetFormPlan, QuartetTexturePlan } from '../core/string-quartet/quartetPlanTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 42;
const TOTAL_BARS = 32;

const ALL_ERAS: BigBandEraId[] = ['swing', 'bebop', 'post_bop', 'contemporary'];

function minimalQuartetPlans(): { formPlan: QuartetFormPlan; texturePlan: QuartetTexturePlan } {
  return {
    formPlan: {
      totalBars: TOTAL_BARS,
      slices: [{ index: 0, phase: 'statement', startBar: 1, endBar: TOTAL_BARS }],
    },
    texturePlan: {
      slices: [
        {
          formSliceIndex: 0,
          phase: 'statement',
          rolesByInstrument: {
            violin_1: 'lead',
            violin_2: 'counterline',
            viola: 'inner_motion',
            cello: 'bass_anchor',
          },
        },
      ],
    },
  };
}

function chordSymbols32(score: ScoreModel): string[] {
  const part0 = score.parts[0];
  if (!part0 || part0.measures.length !== TOTAL_BARS) {
    throw new Error(`Expected first part with ${TOTAL_BARS} measures`);
  }
  return part0.measures.map((m) => (m.chord == null || m.chord === '' ? '(none)' : m.chord));
}

function anyBarContainsOneOf(chords: string[], substrings: string[]): boolean {
  return chords.some((c) => substrings.some((s) => c.includes(s)));
}

function allFourDistinct(byEra: Record<BigBandEraId, string[]>): boolean {
  const keys = ALL_ERAS;
  const sigs = keys.map((e) => byEra[e].join('|'));
  return new Set(sigs).size === keys.length;
}

export function runQuartetEraChordPoolsScoreTests(): { ok: boolean; name: string }[] {
  const { formPlan, texturePlan } = minimalQuartetPlans();
  const byEra = {} as Record<BigBandEraId, string[]>;

  for (const era of ALL_ERAS) {
    const score = buildQuartetScoreModel({
      title: `SQ era ${era}`,
      seed: SEED,
      formPlan,
      texturePlan,
      era,
    });
    byEra[era] = chordSymbols32(score);
  }

  console.log(`\n=== String Quartet era chord pools (score) — ${TOTAL_BARS} bars, seed ${SEED} ===`);
  for (const era of ALL_ERAS) {
    console.log(`${era}: ${byEra[era].join(' | ')}`);
  }

  const swingOk = anyBarContainsOneOf(byEra.swing, ['maj6', '6/9', 'dim7', 'm6']);
  const bebopOk = anyBarContainsOneOf(byEra.bebop, ['7b9', '7#9', '7#11', 'm7b5']);
  const postOk = anyBarContainsOneOf(byEra.post_bop, ['maj7#11', '7alt', '7sus']);
  const contemporaryOk = anyBarContainsOneOf(byEra.contemporary, ['m9', 'm11', 'add9']);
  const distinctOk = allFourDistinct(byEra);

  const ok = swingOk && bebopOk && postOk && contemporaryOk && distinctOk;

  const failures: string[] = [];
  if (!swingOk) failures.push('swing missing expected vocabulary (maj6|6/9|dim7|m6)');
  if (!bebopOk) failures.push('bebop missing expected vocabulary (7b9|7#9|7#11|m7b5)');
  if (!postOk) failures.push('post_bop missing expected vocabulary (maj7#11|7alt|7sus)');
  if (!contemporaryOk) failures.push('contemporary missing expected vocabulary (m9|m11|add9)');
  if (!distinctOk) failures.push('not all four era chord sequences are distinct');

  const name =
    ok
      ? 'String Quartet score: four eras (same seed, 32 bars) yield distinct chords and era-typical symbols'
      : `String Quartet era chord pool score test FAILED: ${failures.join('; ')}`;

  return [{ ok, name }];
}

/** Direct run: `npx ts-node --project ../../tsconfig.json tests/quartetEraChordPoolsScore.test.ts` from composer-os-v2 */
if (require.main === module) {
  const rows = runQuartetEraChordPoolsScoreTests();
  for (const r of rows) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
