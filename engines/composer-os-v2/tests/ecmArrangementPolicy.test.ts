/**
 * ECM arrangement policy — bounded texture arc anti-static guard.
 */

import { augmentEcmChamberTexturePlan } from '../core/ecm/ecmChamberArrangementPolicy';
import type { EcmBarTexture } from '../core/ecm/ecmTextureEngine';

type TestResult = { name: string; ok: boolean };

function maxStaticRolePairRun(rows: EcmBarTexture[]): number {
  let best = 0;
  let run = 0;
  let prev = '';
  for (const r of rows) {
    const pair = `${r.guitarRole}|${r.bassRole}`;
    if (pair === prev) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = pair;
  }
  return best;
}

export function runEcmArrangementPolicyTests(): TestResult[] {
  const out: TestResult[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const flat: EcmBarTexture[] = Array.from({ length: 12 }, (_, i) => ({
    bar: i + 1,
    guitarRole: 'lead',
    bassRole: 'sustain_pad',
    overlapHint: false,
    layeringMode: 'balanced',
  }));

  const aug = augmentEcmChamberTexturePlan(flat, 12, 4242, 'ECM_METHENY_QUARTET');
  t('ECM arrangement policy: limits static role-pair carryover to <= 3 bars', maxStaticRolePairRun(aug) <= 3);

  return out;
}
