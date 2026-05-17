/**
 * Duo golden path — phraseIntentBias pitch nudge + Stage 2 cross-bar continuityIntent.
 */

import { duoGoldenPathPhraseIntentAtBar } from '../core/phrase/phraseBuilder';
import {
  applyPhraseIntentBiasToGuitarV1Measure,
  phraseIntentBiasPitchNudgeSemitones,
} from '../core/goldenPath/duoPhraseIntentBias';
import { addEvent, createMeasure, createNote } from '../core/score-model/scoreEventBuilder';

export function runDuoPhraseBiasTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const archBar1 = phraseIntentBiasPitchNudgeSemitones('arch', 1);
  const archBar3 = phraseIntentBiasPitchNudgeSemitones('arch', 3);
  out.push({
    ok: archBar1 > archBar3,
    name: 'phraseIntentBias=arch: bar 1 pitch nudge > bar 3 nudge',
  });

  const desc = [1, 2, 3, 4].map((bar) => phraseIntentBiasPitchNudgeSemitones('descending', bar));
  out.push({
    ok: desc[0]! > desc[1]! && desc[1]! > desc[2]! && desc[2]! > desc[3]!,
    name: 'phraseIntentBias=descending: nudge decreases bar over bar',
  });

  const asc = [1, 2, 3, 4].map((bar) => phraseIntentBiasPitchNudgeSemitones('ascending', bar));
  out.push({
    ok: asc[0]! < asc[1]! && asc[1]! < asc[2]! && asc[2]! < asc[3]!,
    name: 'phraseIntentBias=ascending: nudge increases bar over bar',
  });

  const neutralBars = [1, 2, 3, 4].map((bar) => phraseIntentBiasPitchNudgeSemitones('neutral', bar));
  out.push({
    ok: neutralBars.every((n) => n === 0),
    name: 'phraseIntentBias=neutral: no nudge applied (existing behaviour)',
  });

  let continuityPropagates = false;
  for (let seed = 1; seed <= 500 && !continuityPropagates; seed++) {
    const phraseStart = duoGoldenPathPhraseIntentAtBar(seed, 5);
    const bar2Fresh = duoGoldenPathPhraseIntentAtBar(seed, 6);
    const bar2Continuity = duoGoldenPathPhraseIntentAtBar(seed, 6, undefined, phraseStart);
    if (bar2Continuity === phraseStart && bar2Fresh !== phraseStart) {
      continuityPropagates = true;
    }
  }
  out.push({
    ok: continuityPropagates,
    name: 'Stage 2 intent at bar 1 propagates to bar 2 (continuityIntent set)',
  });

  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 1, 1));
  addEvent(m, createNote(48, 0, 1, 2));
  const guitarBefore = (m.events.find((e) => e.kind === 'note' && (e as { voice?: number }).voice === 1) as {
    pitch: number;
  }).pitch;
  const bassBefore = (m.events.find((e) => e.kind === 'note' && (e as { voice?: number }).voice === 2) as {
    pitch: number;
  }).pitch;
  applyPhraseIntentBiasToGuitarV1Measure(m, 'arch', 1, 40, 72);
  const guitarAfter = (m.events.find((e) => e.kind === 'note' && (e as { voice?: number }).voice === 1) as {
    pitch: number;
  }).pitch;
  const bassAfter = (m.events.find((e) => e.kind === 'note' && (e as { voice?: number }).voice === 2) as {
    pitch: number;
  }).pitch;
  out.push({
    ok: guitarAfter - guitarBefore === archBar1 && bassAfter === bassBefore,
    name: 'Bass unaffected by phraseIntentBias (pitch nudge = 0 on bass)',
  });

  return out;
}
