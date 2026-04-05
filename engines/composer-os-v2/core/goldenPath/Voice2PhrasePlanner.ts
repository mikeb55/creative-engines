/**
 * Phase 18.3B — Phrase-level Voice 2 state machine (deterministic; no reactive gap-fill).
 * One sequence per phrase: ENTER → FLOW → (HOLD) → CADENCE; optional REST only after minimum activity.
 */

import { seededUnit } from './guitarBassDuoHarmony';

export type Voice2PhraseState = 'enter' | 'flow' | 'hold' | 'cadence';

export type Voice2BarPlan = {
  bar: number;
  state: Voice2PhraseState;
  /** First sounding beat in bar [0, 3.5]; ENTER forces early entry within first 2 beats. */
  entryBeat: number;
};

export type Voice2PhrasePlan = {
  phraseIndex: number;
  baseBar: number;
  endBar: number;
  bars: Voice2BarPlan[];
  /** Minimum bars that must sound (non-REST) in this phrase. */
  minActiveBars: number;
};

function assignPhraseState(barIndexInPhrase: number, len: number, phraseIdx: number, seed: number): Voice2PhraseState {
  if (len <= 1) return 'cadence';
  if (len === 2) {
    return barIndexInPhrase === 0 ? 'enter' : 'cadence';
  }
  if (barIndexInPhrase === 0) return 'enter';
  if (barIndexInPhrase === len - 1) return 'cadence';
  if (barIndexInPhrase === len - 2 && len >= 3) return 'hold';
  return 'flow';
}

/**
 * Build deterministic phrase plans for all 4-bar windows in the score.
 */
export function buildVoice2PhraseStatePlans(tb: number, seed: number): Voice2PhrasePlan[] {
  const phraseCount = Math.ceil(tb / 4);
  const out: Voice2PhrasePlan[] = [];
  for (let p = 0; p < phraseCount; p++) {
    const base = p * 4 + 1;
    const end = Math.min(base + 3, tb);
    const len = end - base + 1;
    const bars: Voice2BarPlan[] = [];
    for (let i = 0; i < len; i++) {
      const bar = base + i;
      let state = assignPhraseState(i, len, p, seed);
      /** Early entry: ENTER within first 1–2 beats; other states may start on beat 0 or 0.5. */
      let entryBeat = 0;
      if (state === 'enter') {
        entryBeat = seededUnit(seed, bar, 9201) < 0.55 ? 0 : seededUnit(seed, bar, 9201) < 0.85 ? 0.5 : 1;
        if (entryBeat > 1.5) entryBeat = 0;
      } else if (state === 'flow' || state === 'hold') {
        entryBeat = seededUnit(seed, bar, 9202) < 0.4 ? 0.5 : 0;
      } else if (state === 'cadence') {
        entryBeat = seededUnit(seed, bar, 9203) < 0.25 ? 0 : 0.5;
      } else {
        entryBeat = 0;
      }
      bars.push({ bar, state, entryBeat });
    }
    const minActiveBars = len <= 1 ? 1 : Math.min(len, 2);
    out.push({ phraseIndex: p, baseBar: base, endBar: end, bars, minActiveBars });
  }
  return out;
}
