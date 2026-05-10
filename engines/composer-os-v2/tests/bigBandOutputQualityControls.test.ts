/**
 * Big Band output quality controls — section intensity, figure response, feel mode, drum articulation.
 */

import { applyFigureResponseToPunchMaps, generateBrassPunches, generateShoutChorus } from '../core/arranging/bigBandPatterns';
import {
  applyDrumArticulationToPolicy,
  getDrumPolicy,
  resolveBigBandDrumIntensityForPhase,
} from '../core/big-band/bigBandDrumIntensity';
import { buildBigBandScoreModel } from '../core/big-band/bigBandScoreBuilder';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBigBandSections } from '../core/big-band/bigBandSectionPlanner';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';

export function runBigBandOutputQualityControlsTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok:
      resolveBigBandDrumIntensityForPhase('sparse', 'solo_section', { solo_section: 'driving' }) ===
      'driving',
    name: 'sectionIntensityOverrides — solo slice can override global sparse with driving',
  });

  out.push({
    ok:
      resolveBigBandDrumIntensityForPhase('driving', 'melody_head', undefined) === 'driving' &&
      resolveBigBandDrumIntensityForPhase('driving', 'melody_head', {}) === 'driving',
    name: 'sectionIntensityOverrides — omitted / empty map preserves global intensity',
  });

  const polRide = getDrumPolicy('melody_head', 'standard');
  out.push({
    ok:
      applyDrumArticulationToPolicy(polRide, 'brushes').timeTexture === 'brush' &&
      applyDrumArticulationToPolicy(getDrumPolicy('intro', 'sparse'), 'sticks').timeTexture === 'ride',
    name: 'drumArticulation — brushes forces brush matrix; sticks lifts sparse intro off brush to ride',
  });

  out.push({
    ok: applyDrumArticulationToPolicy(polRide, undefined).timeTexture === polRide.timeTexture,
    name: 'drumArticulation — undefined leaves policy unchanged (auto passthrough)',
  });

  const chords32 = Array.from({ length: 32 }, () => 'Cmaj7');
  const brass0 = generateBrassPunches(chords32, [0, 2]);
  const shout0 = generateShoutChorus(chords32);
  const med = applyFigureResponseToPunchMaps(brass0, shout0, 32, { figureResponse: undefined, seed: 55 });
  const low = applyFigureResponseToPunchMaps(brass0, shout0, 32, { figureResponse: 'low', seed: 55 });
  const high = applyFigureResponseToPunchMaps(brass0, shout0, 32, { figureResponse: 'high', seed: 55 });
  out.push({
    ok: med.brass.size === brass0.size && med.shout.size === shout0.size,
    name: 'figureResponse medium — identical brass/shout key counts to baseline generators',
  });
  out.push({
    ok: low.brass.size < brass0.size && low.shout.size <= shout0.size,
    name: 'figureResponse low — thins brass/shout hit maps vs baseline',
  });
  out.push({
    ok: high.brass.size >= brass0.size,
    name: 'figureResponse high — adds at least as many brass punch bars as baseline',
  });

  const form = planDefaultBigBandForm(120_003, { totalBars: 32 });
  const sections = planBigBandSections(form, 120_003);
  const baseInput = {
    title: 'BB quality',
    seed: 9001,
    formPlan: form,
    sectionPlan: sections,
  };
  const scoreIn4 = buildBigBandScoreModel({ ...baseInput, feelMode: 'in4' });
  const scoreIn2 = buildBigBandScoreModel({ ...baseInput, feelMode: 'in2' });
  const bassPartIdx = 5;
  const nNotesIn4 = scoreIn4.parts[bassPartIdx]!.measures[0]!.events.filter((e) => e.kind === 'note')
    .length;
  const nNotesIn2 = scoreIn2.parts[bassPartIdx]!.measures[0]!.events.filter((e) => e.kind === 'note')
    .length;
  out.push({
    ok: nNotesIn4 === 4 && nNotesIn2 === 2,
    name: 'feelMode — in4 walking bass has four quarters; in2 half-time has two halves on bar 1',
  });

  const scorePlain = buildBigBandScoreModel({ ...baseInput });
  const scoreBrush = buildBigBandScoreModel({ ...baseInput, drumArticulation: 'brushes' });
  let melodyBar = 1;
  for (const sl of form.slices) {
    if (sl.phase === 'melody_head') {
      melodyBar = sl.startBar;
      break;
    }
  }
  const drumIdx = 6;
  const midisPlain = scorePlain.parts[drumIdx]!.measures[melodyBar - 1]!.events
    .filter((e): e is NoteEvent => e.kind === 'note')
    .map((e) => e.pitch);
  const midisBrush = scoreBrush.parts[drumIdx]!.measures[melodyBar - 1]!.events
    .filter((e): e is NoteEvent => e.kind === 'note')
    .map((e) => e.pitch);
  out.push({
    ok: midisPlain.some((m) => m === 51) && midisBrush.some((m) => m === 40),
    name: 'drumArticulation — brushes swaps ride GM51 toward brush GM40 vs default on melody slice',
  });

  return out;
}
