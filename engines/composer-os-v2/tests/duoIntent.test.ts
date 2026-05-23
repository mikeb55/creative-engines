/**
 * Product `metadata.duoIntent` (conversational | supportive) vs Slonimsky `duoIntent` parameter ({@link PhraseIntent}).
 *
 * Depth scope: phrase bias + attack stagger + register ownership + velocity balance.
 */

import { duoGoldenPathPhraseIntentAtBar } from '../core/phrase/phraseBuilder';
import {
  applyDuoIntentVelocityBalance,
  meanNoteVelocity,
  resolveDuoIntentRegisterOwnershipPlan,
} from '../core/goldenPath/duoIntentDepth';
import { addEvent, createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { CompositionContext } from '../core/compositionContext';
import type { PartModel } from '../core/score-model/scoreModelTypes';

/** Fixed seed known to produce ≥1 phrase-intent mismatch between product intents over 32 bars. */
const INTENT_DIFF_SEED = 77231;

export function runDuoIntentTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const maxBar = 32;
  let diffBars = 0;
  for (let b = 1; b <= maxBar; b++) {
    const conv = duoGoldenPathPhraseIntentAtBar(INTENT_DIFF_SEED, b, 'conversational');
    const sup = duoGoldenPathPhraseIntentAtBar(INTENT_DIFF_SEED, b, 'supportive');
    if (conv !== sup) diffBars++;
  }
  out.push({
    ok: diffBars >= 1,
    name: `duoIntent product: conversational vs supportive differ on ≥1 bar (seed=${INTENT_DIFF_SEED}, 1–${maxBar})`,
  });

  let regOk = true;
  const regSeed = 50021;
  for (let b = 1; b <= maxBar; b++) {
    const baseline = duoGoldenPathPhraseIntentAtBar(regSeed, b);
    const explicitUndefined = duoGoldenPathPhraseIntentAtBar(regSeed, b, undefined);
    if (baseline !== explicitUndefined) {
      regOk = false;
      break;
    }
  }
  out.push({
    ok: regOk,
    name: 'duoIntent product: omitted third arg matches explicit undefined (no regression vs pre–Batch-B)',
  });

  const conversationalPlan = resolveDuoIntentRegisterOwnershipPlan('conversational');
  const supportivePlan = resolveDuoIntentRegisterOwnershipPlan('supportive');
  out.push({
    ok:
      conversationalPlan?.bassResponse[1] === 57 &&
      supportivePlan?.guitarMelody[0] === 62 &&
      conversationalPlan.receipt.includes('conversational') &&
      supportivePlan.receipt.includes('supportive'),
    name: 'duoIntent depth: register ownership plans differ by product intent',
  });

  const convScore = makeVelocityFixtureScore();
  const convContext = makeVelocityFixtureContext('conversational');
  const convBassBefore = meanNoteVelocity(convScore.parts.find((p) => p.id === 'bass'));
  const convVel = applyDuoIntentVelocityBalance(convScore, convContext);
  const convBassAfter = meanNoteVelocity(convVel?.score.parts.find((p) => p.id === 'bass'));

  const supScore = makeVelocityFixtureScore();
  const supContext = makeVelocityFixtureContext('supportive');
  const supBassBefore = meanNoteVelocity(supScore.parts.find((p) => p.id === 'bass'));
  const supVel = applyDuoIntentVelocityBalance(supScore, supContext);
  const supBassAfter = meanNoteVelocity(supVel?.score.parts.find((p) => p.id === 'bass'));
  out.push({
    ok:
      convVel?.receipt.accompanimentDelta === -8 &&
      supVel?.receipt.accompanimentDelta === 7 &&
      convBassAfter < convBassBefore &&
      supBassAfter > supBassBefore,
    name: 'duoIntent depth: conversational lowers and supportive raises accompaniment velocity',
  });

  return out;
}

function makeVelocityFixtureScore() {
  const guitar: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [createMeasure(1, 'Cmaj7')],
  };
  const bass: PartModel = {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 33,
    clef: 'bass',
    measures: [createMeasure(1, 'Cmaj7')],
  };
  addEvent(guitar.measures[0]!, createNote(67, 0, 1, 1, undefined, undefined, 80));
  addEvent(guitar.measures[0]!, createNote(55, 1, 1, 2, undefined, undefined, 80));
  addEvent(bass.measures[0]!, createNote(40, 0, 2, 1, undefined, undefined, 80));
  addEvent(bass.measures[0]!, createNote(43, 2, 2, 1, undefined, undefined, 80));
  return createScore('duoIntent velocity fixture', [guitar, bass]);
}

function makeVelocityFixtureContext(intent: 'conversational' | 'supportive'): CompositionContext {
  return {
    seed: 1,
    presetId: 'guitar_bass_duo',
    form: { id: 'thirty_two_bar', totalBars: 1, sections: [] },
    feel: { mode: 'swing', swingRatio: 1, tempoFeel: 'medium', driftTotalBeats: 0 },
    instrumentProfiles: [],
    generationMetadata: { duoIntent: intent },
  } as unknown as CompositionContext;
}
