/**
 * Song Mode Phase A — alt-tuning style profile gate (Option A) + parity with STYLE_INDIE_ART_POP.
 */

import type { CompositionContext } from '../core/compositionContext';
import { applyIndieArtPopPhaseADeepening } from '../core/song-mode/indieArtPopPhaseA';
import { styleProfileSupportsAlternateGuitarTuning } from '../core/song-mode/alternateGuitarTunings';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';
import type { NoteEvent, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import type { SectionWithRole } from '../core/section-roles/sectionRoleTypes';
import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';

const SECTIONS: SectionWithRole[] = [
  {
    label: 'A',
    startBar: 1,
    length: 8,
    role: 'statement',
    metadata: {
      role: 'statement',
      densityTendency: 'medium',
      registerTendency: 'centre',
      rhythmActivity: 'medium',
      textureTendency: 'melodic',
    },
  },
];

function buildMinimalScore(): ScoreModel {
  const guitar: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [],
  };
  for (let i = 1; i <= 4; i++) {
    const m = createMeasure(i);
    if (i === 2) {
      addEvent(m, createNote(60, 0, 1, 1));
    }
    guitar.measures.push(m);
  }
  return createScore('phase-a-test', [guitar]);
}

function guitarVelocityBar2(score: ScoreModel): number {
  const ev = score.parts[0]!.measures[1]!.events[0];
  if (!ev || ev.kind !== 'note') return -1;
  return (ev as NoteEvent).velocity ?? -1;
}

function runPhaseA(styleProfile: StyleProfile): { velocity: number; applied: boolean } {
  const score = buildMinimalScore();
  const ctx = {
    presetId: 'guitar_bass_duo',
    seed: 42,
    form: { totalBars: 8 },
    generationMetadata: {
      songModeHookFirstIdentity: true,
      styleProfile,
      alternateGuitarTuning: { mode: 'standard' },
    },
  } as CompositionContext;
  applyIndieArtPopPhaseADeepening(score, ctx, SECTIONS);
  return {
    velocity: guitarVelocityBar2(score),
    applied: ctx.generationMetadata?.indieArtPopPhaseAApplied === true,
  };
}

export function runIndieArtPopPhaseATests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const indie = runPhaseA('STYLE_INDIE_ART_POP');
  const sonic = runPhaseA('STYLE_SONIC_YOUTH');
  out.push({
    ok:
      indie.applied &&
      sonic.applied &&
      indie.velocity === sonic.velocity &&
      indie.velocity === 76,
    name: 'STYLE_INDIE_ART_POP and STYLE_SONIC_YOUTH: Phase A applies same velocity delta (Indie parity / unchanged logic)',
  });

  const joni = runPhaseA('STYLE_JONI_MITCHELL');
  out.push({
    ok: joni.applied && joni.velocity === 76,
    name: 'STYLE_JONI_MITCHELL receives Phase A when hook-first + duo (Option A)',
  });

  const ecm = runPhaseA('STYLE_ECM');
  out.push({
    ok: !ecm.applied && ecm.velocity === -1,
    name: 'STYLE_ECM skips Phase A (not in alt-tuning profile allowlist)',
  });

  out.push({
    ok:
      styleProfileSupportsAlternateGuitarTuning('STYLE_INDIE_ART_POP') &&
      styleProfileSupportsAlternateGuitarTuning('STYLE_ECM_CHAMBER') &&
      !styleProfileSupportsAlternateGuitarTuning(undefined),
    name: 'styleProfileSupportsAlternateGuitarTuning matches registry expectations',
  });

  return out;
}
