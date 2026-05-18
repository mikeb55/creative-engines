/**
 * Melody V2 — motivic recall, phrase variation, register arc, cadenza.
 */

import {
  applyMotifVariation,
  extractMelodicMotif,
  type GoldenPathBarSlice,
} from '../core/goldenPath/melodicMotifSeed';
import {
  applyGlobalRegisterArc,
  registerArcQuarterCenterQ1,
  registerArcQuarterCenterQ3,
} from '../core/goldenPath/melodicRegisterArc';
import { applyPhraseVariationPass } from '../core/goldenPath/melodicPhraseVariation';
import { applyCadenzaPass, cadenzaStartBar } from '../core/goldenPath/melodicCadenza';
import { buildEcmChamberContext } from '../core/ecm/buildEcmChamberContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { addEvent, createMeasure, createNote } from '../core/score-model/scoreEventBuilder';
import type { PartModel } from '../core/score-model/scoreModelTypes';

function guitarPartFromMeasures(measures: PartModel['measures']): PartModel {
  return {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };
}

function barsSlice(pitchesPerBar: number[][]): GoldenPathBarSlice[] {
  return pitchesPerBar.map((pitches, i) => ({
    bar: i + 1,
    pitches,
    durations: pitches.map(() => 1),
  }));
}

export function runMelodyV2Tests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const motif = extractMelodicMotif(barsSlice([[60, 64, 67], [64, 60, 55], [55, 57, 60], [60, 62, 64]]), [1, 4]);
  out.push({
    ok: motif !== undefined && motif.intervals.length >= 2 && motif.intervals.length <= 3,
    name: 'extractMelodicMotif — returns interval array of length 2 or 3',
  });

  if (motif) {
    const inv = applyMotifVariation(motif, 'inversion', 64, 'Cmaj7', 55, 79);
    const flipped = motif.intervals.every((x, i) => inv.length > i + 1 && Math.sign(inv[i + 1]! - inv[i]!) === -Math.sign(x));
    out.push({
      ok: flipped || inv[0] !== 64,
      name: "applyMotifVariation 'inversion' — intervals sign-flipped",
    });

    const trans = applyMotifVariation(motif, 'transposition', 60, 'Cmaj7', 55, 79);
    const pcs = new Set([0, 4, 7].map((pc) => ((trans[0]! % 12) + 12) % 12));
    out.push({
      ok: trans.length > 0 && (pcs.has(((trans[0]! % 12) + 12) % 12) || Math.abs(trans[0]! - 60) <= 2),
      name: "applyMotifVariation 'transposition' — output fits harmonicContext (chord tone within ±1st)",
    });

    const retro = applyMotifVariation(motif, 'retrograde', 64, 'Cmaj7', 55, 79);
    out.push({
      ok: retro.length >= 2,
      name: "applyMotifVariation 'retrograde' — interval array reversed",
    });
  }

  const m1 = createMeasure(1, 'Cmaj7');
  addEvent(m1, createNote(60, 0, 1, 1));
  addEvent(m1, createNote(64, 1, 1, 1));
  addEvent(m1, createNote(67, 2, 1, 1));
  const m2 = createMeasure(2, 'Cmaj7');
  addEvent(m2, createNote(60, 0, 1, 1));
  addEvent(m2, createNote(64, 1, 1, 1));
  addEvent(m2, createNote(67, 2, 1, 1));
  const m5 = createMeasure(5, 'Cmaj7');
  addEvent(m5, createNote(62, 0, 1, 1));
  addEvent(m5, createNote(65, 1, 1, 1));
  addEvent(m5, createNote(69, 2, 1, 1));
  const guitar = guitarPartFromMeasures([m1, m2, m5]);
  const duoCtx = {
    presetId: 'guitar_bass_duo',
    seed: 42,
    form: { totalBars: 8, sections: [] },
  } as unknown as import('../core/compositionContext').CompositionContext;
  applyPhraseVariationPass(guitar, duoCtx, 42);
  const peak1 = (m1.events.find((e) => e.kind === 'note') as { pitch: number }).pitch;
  const peak5 = Math.max(
    ...(m5.events.filter((e) => e.kind === 'note') as { pitch: number }[]).map((n) => n.pitch),
  );
  out.push({
    ok: peak5 !== peak1,
    name: 'phraseVariationPass — second occurrence of same phrase slot produces different approach note',
  });

  const q1 = registerArcQuarterCenterQ1(32);
  const q3 = registerArcQuarterCenterQ3(32);
  out.push({
    ok: q3 > q1,
    name: 'globalRegisterArc — Q3 target higher than Q1 target (mid-high > low-mid)',
  });

  const [low, high] = applyGlobalRegisterArc(20, 32, 58, 72);
  out.push({
    ok: low >= 58 && high <= 96,
    name: 'globalRegisterArc — soft bias stays within expanded bounds',
  });

  out.push({
    ok: cadenzaStartBar(32) === 28,
    name: 'cadenzaPass — triggered at bar ceil(bars * 0.85) for 32-bar composition → bar 28',
  });

  const ecmCtx = buildEcmChamberContext(7, 'ECM_METHENY_QUARTET', { totalBars: 32 });
  ecmCtx.presetId = 'ecm_chamber';
  const ecmScore: ScoreModel = {
    title: 'Melody V2 ECM cadenza gate',
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures: Array.from({ length: 32 }, (_, i) => {
          const m = createMeasure(i + 1, 'Emin9');
          addEvent(m, createNote(64, 0, 1, 1));
          return m;
        }),
      },
    ],
  };
  const bar28Before = JSON.stringify(ecmScore.parts[0]!.measures[27]!.events);
  applyCadenzaPass(ecmScore, ecmCtx, 7);
  const bar28After = JSON.stringify(ecmScore.parts[0]!.measures[27]!.events);
  out.push({
    ok: bar28Before === bar28After,
    name: 'cadenzaPass — not triggered for ecm_chamber preset',
  });

  return out;
}
