/**
 * Jazz duo behaviour metrics and gates (interaction, phrase, bass guide tones).
 */

import type { PartModel } from '../core/score-model/scoreModelTypes';
import {
  barHasPhraseBoundary,
  guideToneCoverage,
  hasCallResponseInWindow,
  hasPhraseEndWithin,
  isAuthoritativeEnding,
  maxSameDirectionSteps,
  rootRatioStrongBeats,
  validateJazzDuoBehaviourRules,
  violatesOverlap,
} from '../core/score-integrity/jazzDuoBehaviourValidation';
import { createMeasure, createNote, createRest, createScore, addEvent } from '../core/score-model/scoreEventBuilder';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

function duoScore(guitar: PartModel['measures'], bass: PartModel['measures']) {
  return createScore('test', [
    {
      id: 'g',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: guitar,
    },
    {
      id: 'b',
      name: 'Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: bass,
    },
  ]);
}

export function runJazzDuoBehaviourTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];

  {
    const m = createMeasure(1, 'Dmin9');
    addEvent(m, createNote(50, 0, 2));
    addEvent(m, createRest(2, 2));
    results.push({ name: 'phrase boundary: half + rest', ok: barHasPhraseBoundary(m) && isAuthoritativeEnding(m) });
  }

  {
    const g: PartModel['measures'] = [];
    const b: PartModel['measures'] = [];
    for (let bar = 1; bar <= 8; bar++) {
      const chord = bar <= 2 ? 'Dmin9' : bar <= 4 ? 'G13' : bar <= 6 ? 'Cmaj9' : 'A7alt';
      const gm = createMeasure(bar, chord, bar === 1 ? 'A' : bar === 5 ? 'B' : undefined);
      addEvent(gm, createNote(60 + bar, 0, 2));
      addEvent(gm, createRest(2, 2));
      g.push(gm);
      const bm = createMeasure(bar, chord, bar === 1 ? 'A' : bar === 5 ? 'B' : undefined);
      addEvent(bm, createNote(38, 0.75, 0.5));
      addEvent(bm, createNote(41, 2, 2));
      b.push(bm);
    }
    const score = duoScore(g, b);
    const ok =
      hasPhraseEndWithin(score, 4, 1) &&
      hasPhraseEndWithin(score, 4, 5) &&
      hasCallResponseInWindow(score, 4, 1) &&
      !violatesOverlap(score);
    results.push({ name: 'synthetic duo: phrase windows + call/response + no overlap', ok });
  }

  {
    const m = createMeasure(1, 'Dmin9');
    addEvent(m, createNote(41, 0, 1));
    addEvent(m, createNote(38, 2, 1));
    const bass: PartModel = {
      id: 'b',
      name: 'Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: [m],
    };
    const rr = rootRatioStrongBeats(bass);
    const gc = guideToneCoverage(bass);
    const steps = maxSameDirectionSteps(bass);
    results.push({
      name: 'rootRatioStrongBeats / guideToneCoverage / maxSameDirectionSteps finite',
      ok: rr >= 0 && rr <= 1 && gc >= 0 && gc <= 1 && steps >= 0,
    });
  }

  {
    const gm = createMeasure(1, 'Dmin9');
    addEvent(gm, createNote(60, 0, 0.25));
    const bm = createMeasure(1, 'Dmin9');
    addEvent(bm, createNote(38, 2, 0.25));
    const ok = validateJazzDuoBehaviourRules(duoScore([gm], [bm])).errors.length > 0;
    results.push({ name: 'trivial sparse bar fails jazz gates (sanity)', ok });
  }

  {
    let ok = true;
    for (const seed of [12345, 42, 7]) {
      const r = runGoldenPath(seed);
      if (!r.success) ok = false;
      else if (!validateJazzDuoBehaviourRules(r.score).valid) ok = false;
    }
    results.push({ name: 'golden path passes jazz duo behaviour gates (multi-seed)', ok });
  }

  return results;
}
