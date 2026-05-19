/**
 * SQ swing rhythm engine — Friberg–Sundström ratio + NoteEvent post-pass + GCE expectation presets.
 */

import { SHIPPED_SQ_RHYTHM_ENGINE_IDS } from '../app-api/composerOsAppGeneration';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { NoteEvent } from '../core/counterpoint/abstractLineSet';
import {
  SQ_SWING_RHYTHM_BY_VRB_ID,
  computeSwingIntensityForTempo,
} from '../core/counterpoint/vrbProfiles/sqSwingRhythm';
import { rhythmExpectationForVrb, scoreRhythmicIdentity } from '../core/gce/gceAutoScorers';
import type { MelodicNote } from '../core/gce/gce_melody_eval';
import {
  applySwingTransform,
  buildSwingPolicy,
  sqSwingRhythmEngineId,
  swingRatio,
} from '../core/rhythm/sqSwingRhythmEngine';

function offbeatAt(bar: number): NoteEvent {
  return { pitchMidi: 60, durationBars: 0.25, offsetBars: bar + 0.25 };
}

function onbeatAt(bar: number): NoteEvent {
  return { pitchMidi: 60, durationBars: 0.25, offsetBars: bar };
}

function swingPolicy(style: 'none' | 'jazz' | 'concert' | 'folk_jazz', bpm = 120): ReturnType<typeof buildSwingPolicy> {
  return { swingStyle: style, swingIntensity: 0.5, bpm };
}

function offbeatShift(notes: NoteEvent[]): number {
  const n = notes[0]!;
  return n.offsetBars - 0.25;
}

function testSwingRatio80(): boolean {
  const r = swingRatio(80, 0.5);
  return r >= 2.5 && r <= 3.5;
}

function testSwingRatio240(): boolean {
  const r = swingRatio(240, 0.5);
  return r >= 1.0 && r <= 1.5;
}

function testSwingRatio140(): boolean {
  const r = swingRatio(140, 0.5);
  return Math.abs(r - 2.0) <= 0.3;
}

function testSwingRatioClamped(): boolean {
  for (const bpm of [40, 80, 120, 180, 300]) {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const r = swingRatio(bpm, s);
      if (r < 1.0 || r > 3.5) return false;
    }
  }
  return true;
}

function testNoneUnchanged(): boolean {
  const notes = [offbeatAt(0), onbeatAt(1)];
  const out = applySwingTransform(notes, swingPolicy('none'));
  return out[0]!.offsetBars === 0.25 && out[1]!.offsetBars === 1;
}

function testJazzShiftsLaterThanHalf(): boolean {
  const notes = [offbeatAt(0)];
  const out = applySwingTransform(notes, swingPolicy('jazz', 120));
  const frac = out[0]!.offsetBars % 1;
  return frac > 0.5;
}

function testConcertLessThanJazz(): boolean {
  const jazz = applySwingTransform([offbeatAt(0)], swingPolicy('jazz', 120));
  const concert = applySwingTransform([offbeatAt(0)], swingPolicy('concert', 120));
  return offbeatShift(concert) < offbeatShift(jazz);
}

function testFolkJazzLessThanConcert(): boolean {
  const concert = applySwingTransform([offbeatAt(0)], swingPolicy('concert', 120));
  const folk = applySwingTransform([offbeatAt(0)], swingPolicy('folk_jazz', 120));
  return offbeatShift(folk) < offbeatShift(concert);
}

function testDurationUnchanged(): boolean {
  const notes = [offbeatAt(2)];
  const out = applySwingTransform(notes, swingPolicy('jazz'));
  return out[0]!.durationBars === notes[0]!.durationBars;
}

function testPitchUnchanged(): boolean {
  const notes = [{ pitchMidi: 72, durationBars: 0.25, offsetBars: 1.25 }];
  const out = applySwingTransform(notes, swingPolicy('jazz'));
  return out[0]!.pitchMidi === 72;
}

function testBuildPolicySwingFeelTrue(): boolean {
  const bundle: VoiceRuleBundle = {
    voiceId: 'custom',
    harmonicRhythm: { minChordDurationBars: 1, maxChordDurationBars: 4, allowMidBarChange: false },
    bassPolicy: { role: 'root', allowOctaveDoubling: false },
    voicingPolicy: {
      minSpreadSemitones: 8,
      maxSpreadSemitones: 16,
      clusterSizeNotes: [3, 4],
      forbidParallelFifths: true,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: { contour: 'diatonic-step', maxLeapSemitones: 7 },
    orchestrationPolicy: { anchorToneCount: 1, mutateSingleVoiceAtTime: true, allowCollectiveImprov: false },
    formPolicy: { narrativeArc: 'free', sectionRecallEnforced: false },
    rhythmPolicy: { antiMetric: false },
    repairPolicy: { resolveParallels: true, maxVoiceOverlap: 4 },
    swingFeel: true,
  };
  return buildSwingPolicy(bundle, 120).swingStyle === 'concert';
}

function testBuildPolicySwingFeelFalse(): boolean {
  const bundle: VoiceRuleBundle = {
    voiceId: 'custom',
    harmonicRhythm: { minChordDurationBars: 1, maxChordDurationBars: 4, allowMidBarChange: false },
    bassPolicy: { role: 'root', allowOctaveDoubling: false },
    voicingPolicy: {
      minSpreadSemitones: 8,
      maxSpreadSemitones: 16,
      clusterSizeNotes: [3, 4],
      forbidParallelFifths: true,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: { contour: 'diatonic-step', maxLeapSemitones: 7 },
    orchestrationPolicy: { anchorToneCount: 1, mutateSingleVoiceAtTime: true, allowCollectiveImprov: false },
    formPolicy: { narrativeArc: 'free', sectionRecallEnforced: false },
    rhythmPolicy: { antiMetric: false },
    repairPolicy: { resolveParallels: true, maxVoiceOverlap: 4 },
    swingFeel: false,
  };
  return buildSwingPolicy(bundle, 120).swingStyle === 'none';
}

function testEngineId(): boolean {
  return sqSwingRhythmEngineId() === 'sq_swing';
}

function testShippedRegistry(): boolean {
  return (SHIPPED_SQ_RHYTHM_ENGINE_IDS as readonly string[]).includes('sq_swing');
}

function testRhythmExpGershwin(): boolean {
  return rhythmExpectationForVrb('gershwin')?.placementMode === 'swing';
}

function testRhythmExpSatie(): boolean {
  return rhythmExpectationForVrb('satie')?.placementMode === 'grid';
}

function testRhythmExpShostakovich(): boolean {
  return rhythmExpectationForVrb('shostakovich')?.placementMode === 'anti_metric';
}

function testRhythmExpRavel(): boolean {
  return rhythmExpectationForVrb('ravel') === undefined;
}

function melodyLine(beats: number[]): MelodicNote[] {
  return beats.map((beat, i) => ({
    midi: 60 + i,
    beats: 0.5,
    bar: 1,
    beat,
    rest: false,
  }));
}

function testScoreNoExpectationUnchanged(): boolean {
  const line = melodyLine([0, 0.5, 1, 1.5, 2, 2.5]);
  const a = scoreRhythmicIdentity(line);
  const b = scoreRhythmicIdentity(line, undefined);
  return a.score === b.score && a.justification === b.justification;
}

function testSwingExpectationFavorsSwung(): boolean {
  const swung = melodyLine([0, 2.3, 1, 2.35, 2, 2.4]);
  const grid = melodyLine([0, 0.5, 1, 1.5, 2, 2.5]);
  const exp = rhythmExpectationForVrb('gershwin')!;
  const swungScore = scoreRhythmicIdentity(swung, exp).score;
  const gridScore = scoreRhythmicIdentity(grid, exp).score;
  return swungScore > gridScore;
}

function testPorterPresetIntensity(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingIntensity === 0.52;
}

function testGershwinPresetIntensity(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.swingIntensity === 0.65;
}

function testPorterGershwinIntensityGap(): boolean {
  const gap =
    SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.swingIntensity -
    SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingIntensity;
  return gap >= 0.1;
}

function testPorterPresetAnticipation(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.anticipationRateMax === 0.1;
}

function testGershwinPresetAnticipation(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.anticipationRateMax === 0.14;
}

function testTurtleIslandPresetUnchanged(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.turtle_island.swingIntensity === 0.8;
}

function testPorterBundleIntensity(): boolean {
  return getVoiceRuleBundle('cole_porter').swingIntensity === 0.52;
}

function testGershwinBundleIntensity(): boolean {
  return getVoiceRuleBundle('gershwin').swingIntensity === 0.65;
}

function testPorterBundleAnticipation(): boolean {
  return getVoiceRuleBundle('cole_porter').anticipationRateMax === 0.1;
}

function testGershwinBundleAnticipation(): boolean {
  return getVoiceRuleBundle('gershwin').anticipationRateMax === 0.14;
}

function testPorterGershwinGapAllTempos(): boolean {
  const porterPreset = SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter;
  const gershwinPreset = SQ_SWING_RHYTHM_BY_VRB_ID.gershwin;
  for (const bpm of [80, 120, 160, 200]) {
    const p = computeSwingIntensityForTempo(porterPreset, bpm);
    const g = computeSwingIntensityForTempo(gershwinPreset, bpm);
    if (g - p < 0.1) return false;
  }
  return true;
}

export function runSqSwingRhythmTests(): { name: string; ok: boolean }[] {
  return [
    ['sq_swing: swingRatio 80 BPM ∈ [2.5, 3.5]', testSwingRatio80],
    ['sq_swing: swingRatio 240 BPM ∈ [1.0, 1.5]', testSwingRatio240],
    ['sq_swing: swingRatio 140 BPM ≈ 2.0 (±0.3)', testSwingRatio140],
    ['sq_swing: swingRatio clamped [1.0, 3.5]', testSwingRatioClamped],
    ["sq_swing: swingStyle 'none' leaves notes unchanged", testNoneUnchanged],
    ["sq_swing: swingStyle 'jazz' shifts offbeats past 0.5", testJazzShiftsLaterThanHalf],
    ["sq_swing: concert shift < jazz at same bpm", testConcertLessThanJazz],
    ["sq_swing: folk_jazz shift < concert at same bpm", testFolkJazzLessThanConcert],
    ['sq_swing: durationBars preserved', testDurationUnchanged],
    ['sq_swing: pitchMidi preserved', testPitchUnchanged],
    ['sq_swing: buildSwingPolicy swingFeel true → concert', testBuildPolicySwingFeelTrue],
    ['sq_swing: buildSwingPolicy swingFeel false → none', testBuildPolicySwingFeelFalse],
    ['sq_swing: sqSwingRhythmEngineId()', testEngineId],
    ['sq_swing: SHIPPED_SQ_RHYTHM_ENGINE_IDS includes sq_swing', testShippedRegistry],
    ['sq_swing: rhythmExpectationForVrb gershwin swing', testRhythmExpGershwin],
    ['sq_swing: rhythmExpectationForVrb satie grid', testRhythmExpSatie],
    ['sq_swing: rhythmExpectationForVrb shostakovich anti_metric', testRhythmExpShostakovich],
    ['sq_swing: rhythmExpectationForVrb ravel undefined', testRhythmExpRavel],
    ['sq_swing: scoreRhythmicIdentity no expectation unchanged', testScoreNoExpectationUnchanged],
    ['sq_swing: swing expectation favors swung offbeats', testSwingExpectationFavorsSwung],
    ['sq_swing: cole_porter swingIntensity 0.52', testPorterPresetIntensity],
    ['sq_swing: gershwin swingIntensity 0.65', testGershwinPresetIntensity],
    ['sq_swing: porter–gershwin intensity gap >= 0.10', testPorterGershwinIntensityGap],
    ['sq_swing: cole_porter anticipationRateMax 0.10', testPorterPresetAnticipation],
    ['sq_swing: gershwin anticipationRateMax 0.14', testGershwinPresetAnticipation],
    ['sq_swing: turtle_island swingIntensity 0.80 unchanged', testTurtleIslandPresetUnchanged],
    ['sq_swing: cole_porter bundle swingIntensity 0.52', testPorterBundleIntensity],
    ['sq_swing: gershwin bundle swingIntensity 0.65', testGershwinBundleIntensity],
    ['sq_swing: cole_porter bundle anticipationRateMax 0.10', testPorterBundleAnticipation],
    ['sq_swing: gershwin bundle anticipationRateMax 0.14', testGershwinBundleAnticipation],
    ['sq_swing: porter–gershwin gap >= 0.10 at all tempos', testPorterGershwinGapAllTempos],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
