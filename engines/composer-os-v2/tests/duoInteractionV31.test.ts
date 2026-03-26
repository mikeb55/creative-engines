/**
 * Duo V3.1 — interaction authority, call/response, role contrast (golden path).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { getDuoPhraseIntentV31 } from '../core/goldenPath/guitarPhraseAuthority';
import { activityScoreForBar, HIGH_ACTIVITY } from '../core/goldenPath/activityScore';
import { countCallResponseEvents } from '../core/score-integrity/jazzDuoBehaviourValidation';
import {
  interactionAuthorityGceLayer,
  roleContrastScore,
  validateDuoInteractionAuthorityGate,
} from '../core/score-integrity/duoLockQuality';

function testV31PhraseIntentRoles(): boolean {
  return (
    getDuoPhraseIntentV31(1) === 'guitar_lead' &&
    getDuoPhraseIntentV31(2) === 'guitar_lead' &&
    getDuoPhraseIntentV31(3) === 'bass_lead' &&
    getDuoPhraseIntentV31(4) === 'bass_lead' &&
    getDuoPhraseIntentV31(5) === 'answer_bass' &&
    getDuoPhraseIntentV31(6) === 'answer_guitar' &&
    getDuoPhraseIntentV31(7) === 'guitar_lead' &&
    getDuoPhraseIntentV31(8) === 'cadence'
  );
}

function testInteractionGateOnLockSeed(): boolean {
  const r = runGoldenPath(100);
  if (!r.success || !r.score) return false;
  return validateDuoInteractionAuthorityGate(r.score).valid;
}

function testCallResponseCount(): boolean {
  const r = runGoldenPath(101);
  if (!r.score) return false;
  return countCallResponseEvents(r.score) >= 2;
}

function testRoleContrastPositive(): boolean {
  const r = runGoldenPath(102);
  if (!r.score) return false;
  return roleContrastScore(r.score) >= 0.06;
}

function testDensityContrastNoLongDualHotRun(): boolean {
  const r = runGoldenPath(103);
  if (!r.score) return false;
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return false;
  let run = 0;
  let maxRun = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const ga = activityScoreForBar(g, bar);
    const ba = activityScoreForBar(b, bar);
    if (ga >= HIGH_ACTIVITY && ba >= HIGH_ACTIVITY) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  return maxRun <= 2;
}

function testInteractionGceLayer(): boolean {
  const r = runGoldenPath(104);
  if (!r.score) return false;
  return interactionAuthorityGceLayer(r.score) >= 0.35;
}

export function runDuoInteractionV31Tests(): { name: string; ok: boolean }[] {
  return [
    ['V3.1 phrase intent map (8-bar roles)', testV31PhraseIntentRoles],
    ['V3.1 interaction authority gate passes (seed 100)', testInteractionGateOnLockSeed],
    ['V3.1 call/response count ≥2', testCallResponseCount],
    ['V3.1 role contrast score', testRoleContrastPositive],
    ['V3.1 density contrast (no long dual-high run)', testDensityContrastNoLongDualHotRun],
    ['V3.1 interaction GCE layer', testInteractionGceLayer],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
