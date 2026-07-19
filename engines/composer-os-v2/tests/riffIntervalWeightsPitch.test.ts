/**
 * PR A — intervalWeights → preferredIntervals + pick-time multiply + snap suppress.
 */

import type { RiffIntervalWeightMap, RiffProfile } from '../core/composer/riffProfileTypes';
import type { PitchClass, ResolvedPitchField } from '../core/harmony/pitchFieldSpineTypes';
import {
  bassRiffPitchFieldForBar,
  guitarRiffPitchFieldForBar,
  preferredIntervalsFromIntervalWeights,
  RIFF_INTERVAL_WEIGHT_SEMITONES,
} from '../core/riff-generator/riffPitchField';
import {
  applyPreferredIntervalWeightsToPool,
  directedIntervalClass,
  pickWeightedPc,
  pitchFromFieldForTest,
  RIFF_NEAR_PREV_SNAP_DEFAULT,
  RIFF_NEAR_PREV_SNAP_WITH_INTERVALS,
} from '../core/riff-generator/riffMelody';
import { mulberry32 } from '../core/riff-generator/riffRandom';

function asPc(n: number): PitchClass {
  return (((n % 12) + 12) % 12) as PitchClass;
}

export function runRiffIntervalWeightsPitchTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const keys = Object.keys(RIFF_INTERVAL_WEIGHT_SEMITONES).sort();
    const expected = ['M2', 'M3', 'M6', 'P4', 'P5', 'm2', 'm3', 'tritone'].sort();
    const semis = RIFF_INTERVAL_WEIGHT_SEMITONES;
    const ok =
      keys.join(',') === expected.join(',') &&
      semis.m2 === 1 &&
      semis.M2 === 2 &&
      semis.m3 === 3 &&
      semis.M3 === 4 &&
      semis.P4 === 5 &&
      semis.tritone === 6 &&
      semis.P5 === 7 &&
      semis.M6 === 9;
    out.push({ ok, name: 'RIFF_INTERVAL_WEIGHT_SEMITONES covers m2/M2/m3/M3/P4/tritone/P5/M6' });
  }

  {
    const mapped = preferredIntervalsFromIntervalWeights({
      m3: 0.9,
      P5: 0.5,
      M6: 0.8,
      tritone: 0.2,
    });
    const bySemi = new Map(mapped.map((e) => [e.semitones, e.weight]));
    const ok =
      mapped.length === 4 &&
      bySemi.get(3) === 0.9 &&
      bySemi.get(7) === 0.5 &&
      bySemi.get(9) === 0.8 &&
      bySemi.get(6) === 0.2 &&
      !bySemi.has(1) &&
      !bySemi.has(2);
    out.push({ ok, name: 'preferredIntervalsFromIntervalWeights maps defined keys only' });
  }

  {
    const empty = preferredIntervalsFromIntervalWeights(undefined);
    const blank = preferredIntervalsFromIntervalWeights({});
    out.push({
      ok: empty.length === 0 && blank.length === 0,
      name: 'preferredIntervalsFromIntervalWeights empty when no weights',
    });
  }

  {
    const pool = [
      { pc: 1, weight: 1 },
      { pc: 7, weight: 1 },
      { pc: 4, weight: 1 },
    ];
    const preferPrev = 60; // C
    const preferred = [
      { semitones: 7, weight: 10 },
      { semitones: 1, weight: 0.1 },
    ];
    const next = applyPreferredIntervalWeightsToPool(pool, preferPrev, preferred);
    const w1 = next.find((e) => e.pc === 1)!.weight;
    const w7 = next.find((e) => e.pc === 7)!.weight;
    const w4 = next.find((e) => e.pc === 4)!.weight;
    const ok =
      directedIntervalClass(60, 1) === 1 &&
      directedIntervalClass(60, 7) === 7 &&
      directedIntervalClass(60, 4) === 4 &&
      Math.abs(w1 - 0.1) < 1e-9 &&
      Math.abs(w7 - 10) < 1e-9 &&
      Math.abs(w4 - 1) < 1e-9; // unmatched → pass-through 1.0
    out.push({
      ok,
      name: 'applyPreferredIntervalWeightsToPool: match multiply + unmatched pass-through 1.0',
    });
  }

  {
    const pool = [
      { pc: 1, weight: 1 },
      { pc: 7, weight: 1 },
    ];
    const preferPrev = 60;
    const preferred = [{ semitones: 7, weight: 20 }];
    const weighted = applyPreferredIntervalWeightsToPool(pool, preferPrev, preferred);
    const rng = mulberry32(424242);
    let hit7 = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      if (pickWeightedPc(weighted, rng) === 7) hit7++;
    }
    const rate = hit7 / N;
    out.push({
      ok: rate > 0.85,
      name: `pick distribution shifts toward weighted IC (P5 rate=${rate.toFixed(2)})`,
    });
  }

  {
    const basePool = [
      { pc: asPc(0), weight: 1 },
      { pc: asPc(2), weight: 1 },
      { pc: asPc(4), weight: 1 },
      { pc: asPc(5), weight: 1 },
      { pc: asPc(7), weight: 1 },
      { pc: asPc(9), weight: 1 },
      { pc: asPc(11), weight: 1 },
    ];
    const fieldNo: ResolvedPitchField = {
      allowedPcs: basePool,
      preferredIntervals: [],
      regionId: 't_no',
    };
    const fieldYes: ResolvedPitchField = {
      allowedPcs: basePool,
      preferredIntervals: [{ semitones: 7, weight: 8 }],
      regionId: 't_yes',
    };

    out.push({
      ok: RIFF_NEAR_PREV_SNAP_WITH_INTERVALS < 0.2 && RIFF_NEAR_PREV_SNAP_DEFAULT === 0.65,
      name: 'snap constants: with-intervals heavily reduced (~0.12) vs default 0.65',
    });

    const N = 200;
    let snapWhenActive = 0;
    let snapWhenInactive = 0;
    for (let i = 0; i < N; i++) {
      let c1 = 0;
      const rngA = () => {
        c1++;
        // pick last; snap roll 0.40 — fires only under default 0.65, not under 0.12
        return c1 === 1 ? 0.99 : 0.4;
      };
      let c2 = 0;
      const rngB = () => {
        c2++;
        return c2 === 1 ? 0.99 : 0.4;
      };
      const a = pitchFromFieldForTest(fieldYes, rngA, 48, 72, 60);
      const b = pitchFromFieldForTest(fieldNo, rngB, 48, 72, 60);
      if (a % 12 === 0) snapWhenActive++;
      if (b % 12 === 0) snapWhenInactive++;
    }
    const ok =
      snapWhenInactive === N && // roll 0.4 < 0.65 → always snap when no preferredIntervals
      snapWhenActive === 0; // roll 0.4 > 0.12 → never snap when preferredIntervals present
    out.push({
      ok,
      name: `snap suppressed when preferredIntervals present (activeSnap=${snapWhenActive}, inactiveSnap=${snapWhenInactive})`,
    });
  }

  {
    const weights: RiffIntervalWeightMap = { m3: 1, P5: 0.8, M6: 0.5, tritone: 0.2 };
    const stub = { intervalWeights: weights } as RiffProfile;
    const g = guitarRiffPitchFieldForBar('Am7', 'neutral', stub);
    const b = bassRiffPitchFieldForBar('Am7', 0, stub);
    const expect = preferredIntervalsFromIntervalWeights(weights);
    const same = (a: typeof expect, c: typeof expect) =>
      a.length === c.length && a.every((e, i) => e.semitones === c[i]!.semitones && e.weight === c[i]!.weight);
    out.push({
      ok: same(g.preferredIntervals, expect) && same(b.preferredIntervals, expect),
      name: 'guitar + bass pitch fields populate preferredIntervals from intervalWeights (parity)',
    });
  }

  {
    const g = guitarRiffPitchFieldForBar('Am7', 'neutral', undefined);
    const b = bassRiffPitchFieldForBar('Am7', 0, undefined);
    out.push({
      ok: g.preferredIntervals.length === 0 && b.preferredIntervals.length === 0,
      name: 'guitar + bass preferredIntervals empty when profile has no intervalWeights',
    });
  }

  return out;
}
