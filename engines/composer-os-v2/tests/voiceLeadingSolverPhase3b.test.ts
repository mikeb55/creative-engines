/**
 * Phase 3b — additive unit tests for voice-leading solver + Schneider HarmonicScene tension arc.
 */

import {
  shorterNonFunctionalNeighbourBonus,
  solveVoiceLeading,
} from '../core/composer/voiceLeadingSolver';
import { buildHarmonicScenesForVoiceBundle, tensionLevelForBar } from '../core/composer/harmonicScene';
import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../core/composer/voiceRuleBundles';

function testParallelFifthPrefersCleanVoicing(): boolean {
  const neutral = { ...NEUTRAL_VOICE_RULE_BUNDLE };
  const prev: { notes: number[]; cost: number } = { notes: [48, 67], cost: 0 };
  const dirty: { notes: number[]; cost: number } = { notes: [50, 69], cost: 0 };
  const clean: { notes: number[]; cost: number } = { notes: [50, 66], cost: 0 };
  const r = solveVoiceLeading([dirty, clean], prev, neutral);
  return r.chosen.notes[1] === 66;
}

function testGilEvansSpreadPenaltyOutsideRange(): boolean {
  const gil = getVoiceRuleBundle('gil_evans');
  const prev: { notes: number[]; cost: number } | null = null;
  const narrow: { notes: number[]; cost: number } = { notes: [60, 61, 62], cost: 0 };
  const inRange: { notes: number[]; cost: number } = { notes: [60, 62, 74], cost: 0 };
  const r = solveVoiceLeading([narrow, inRange], prev, gil);
  return r.chosen.notes[r.chosen.notes.length - 1] === 74;
}

function testSchneiderSingleVoiceMutationPenalty(): boolean {
  const schneider = getVoiceRuleBundle('maria_schneider');
  const prev: { notes: number[]; cost: number } = { notes: [48, 60, 72], cost: 0 };
  const twoMove: { notes: number[]; cost: number } = { notes: [50, 62, 72], cost: 0 };
  const oneMove: { notes: number[]; cost: number } = { notes: [48, 62, 72], cost: 0 };
  const r = solveVoiceLeading([twoMove, oneMove], prev, schneider);
  return r.chosen.notes[0] === 48 && r.chosen.notes[1] === 62;
}

function testShorterNonFunctionalNeighbourBonus(): boolean {
  const shorter = getVoiceRuleBundle('wayne_shorter');
  const prev = [48, 64, 67];
  const curr = [50, 55, 59];
  const b = shorterNonFunctionalNeighbourBonus(shorter, prev, curr);
  return b === -45;
}

function testThreadgillOutOfSetIntervalPenalty(): boolean {
  const th = getVoiceRuleBundle('henry_threadgill');
  const prev: { notes: number[]; cost: number } | null = null;
  const badIc11: { notes: number[]; cost: number } = { notes: [60, 71], cost: 0 };
  const goodIc2: { notes: number[]; cost: number } = { notes: [60, 62], cost: 0 };
  const r = solveVoiceLeading([badIc11, goodIc2], prev, th);
  return r.chosen.notes[1] === 62;
}

function testSchneiderEightBarTensionArc(): boolean {
  const bundle = getVoiceRuleBundle('maria_schneider');
  const form = {
    totalBars: 8,
    sections: [{ label: 'A', startBar: 1, length: 8 }],
  };
  const scenes = buildHarmonicScenesForVoiceBundle(form, bundle);
  const t = (bar: number) => tensionLevelForBar(bar, bundle, scenes);
  for (let b = 1; b <= 3; b++) {
    if (t(b) >= t(b + 1)) return false;
  }
  for (let b = 5; b <= 7; b++) {
    if (t(b) <= t(b + 1)) return false;
  }
  return true;
}

export function runVoiceLeadingSolverPhase3bTests(): { name: string; ok: boolean }[] {
  return [
    ['Phase 3b solver — parallel fifth prefers clean voicing', testParallelFifthPrefersCleanVoicing],
    ['Phase 3b solver — Gil Evans spread band rejects narrow cluster', testGilEvansSpreadPenaltyOutsideRange],
    ['Phase 3b solver — Schneider single-voice mutation vs two movers', testSchneiderSingleVoiceMutationPenalty],
    ['Phase 3b solver — Shorter non-functional neighbour bonus', testShorterNonFunctionalNeighbourBonus],
    ['Phase 3b solver — Threadgill out-of-set interval penalty', testThreadgillOutOfSetIntervalPenalty],
    ['Phase 3b HarmonicScene — Schneider 8-bar tension rise then fall', testSchneiderEightBarTensionArc],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
