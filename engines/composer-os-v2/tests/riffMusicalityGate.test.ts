import {
  evaluateRiffMusicality,
  evaluatePitchStreakGuard,
  familyRuleWeights,
  defaultRiffProfileForGenerator,
} from '../core/riff-generator/riffMusicalityGate';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { RiffRhythmSegment } from '../core/riff-generator/riffTypes';

function minimalRiffScore(bars: number, noteMidi: number): ScoreModel {
  const measures = Array.from({ length: bars }, (_, i) => {
    const m = createMeasure(i + 1, 'E9');
    m.events = [createNote(noteMidi, 0, 1, 1)];
    return m;
  });
  return createScore('GateTest', [
    {
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures,
    },
  ]);
}

function perBarRhythm(bars: number): RiffRhythmSegment[][] {
  return Array.from({ length: bars }, () => [
    { startBeat: 0, duration: 1, rest: false },
    { startBeat: 1, duration: 1, rest: false },
  ]);
}

export function runRiffMusicalityGateTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const funkW = familyRuleWeights('funk');
    const rockW = familyRuleWeights('rock');
    out.push({
      ok: funkW.syncopationBalance > rockW.syncopationBalance,
      name: 'funk VRB: syncopationBalance weighted higher than rock',
    });
    out.push({
      ok: rockW.loopIdentityScore > funkW.loopIdentityScore,
      name: 'rock VRB: loopIdentityScore weighted higher than funk',
    });
  }

  {
    const profile = {
      ...defaultRiffProfileForGenerator('neutral', 'eighth'),
      allowPitchStreak: false,
    };
    const riff = {
      score: minimalRiffScore(2, 64),
      perBarRhythm: perBarRhythm(2),
      bars: 2,
      grid: 'eighth' as const,
    };
    const pitch = evaluatePitchStreakGuard(riff, profile);
    out.push({
      ok: !pitch.bypassed && pitch.failures.length > 0,
      name: 'allowPitchStreak false: pitchStreakGuard always fires',
    });
  }

  {
    const profile = {
      ...defaultRiffProfileForGenerator('neutral', 'eighth'),
      pedalRigid: true,
      riffRegisterFloor: 40,
      riffRegisterCeiling: 55,
    };
    const riff = {
      score: minimalRiffScore(2, 42),
      perBarRhythm: perBarRhythm(2),
      bars: 2,
      grid: 'eighth' as const,
    };
    const result = evaluateRiffMusicality(riff, profile);
    const regScore = result.details.registerCoherence ?? 0;
    out.push({
      ok: regScore >= 0.45 && !result.gateFailures.some((f) => f.ruleId === 'registerCoherence'),
      name: 'pedalRigid true: registerCoherence passes for low-string lock',
    });
  }

  {
    const funkProfile = resolveRiffGeneratorProfile({
      vrbId: 'sly_stone',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const rockProfile = resolveRiffGeneratorProfile({
      vrbId: 'iommi',
      style: 'neutral',
      grid: 'eighth',
      density: 'medium',
    });
    out.push({
      ok: funkProfile.allowPitchStreak !== true || rockProfile.allowPitchStreak === true,
      name: 'family profiles resolve for gate family tag wiring',
    });
  }

  return out;
}
