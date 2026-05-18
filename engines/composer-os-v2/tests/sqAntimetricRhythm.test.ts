/**
 * SQ anti-metric rhythm engine — Shostakovich + Ligeti presets.
 */

import { SHIPPED_SQ_RHYTHM_ENGINE_IDS } from '../app-api/composerOsAppGeneration';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { NoteEvent } from '../core/counterpoint/abstractLineSet';
import { rhythmExpectationForVrb } from '../core/gce/gceAutoScorers';
import {
  applyAntimetricTransform,
  buildAntimetricPolicy,
  sqAntimetricRhythmEngineId,
  type SqAntimetricRhythmEnginePolicy,
} from '../core/rhythm/sqAntimetricRhythmEngine';

function stubBundle(voiceId: string): VoiceRuleBundle {
  return {
    voiceId,
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
  };
}

function policy(preset: 'shostakovich' | 'ligeti', intensity: number): SqAntimetricRhythmEnginePolicy {
  return { preset, intensity, bpm: 120 };
}

function testEngineId(): boolean {
  return sqAntimetricRhythmEngineId() === 'sq_antimetric';
}

function testShippedRegistry(): boolean {
  return (SHIPPED_SQ_RHYTHM_ENGINE_IDS as readonly string[]).includes('sq_antimetric');
}

function testBuildPolicyShostakovich(): boolean {
  return buildAntimetricPolicy(stubBundle('shostakovich'), 120).preset === 'shostakovich';
}

function testBuildPolicyLigeti(): boolean {
  return buildAntimetricPolicy(stubBundle('ligeti'), 120).preset === 'ligeti';
}

function testBuildPolicyFallback(): boolean {
  return buildAntimetricPolicy(stubBundle('unknown_composer'), 120).preset === 'shostakovich';
}

function testShostakovichIntensityZero(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 0 }];
  const out = applyAntimetricTransform(notes, policy('shostakovich', 0));
  return out[0]!.offsetBars === 0;
}

function testShostakovichDownbeatLater(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 2 }];
  const out = applyAntimetricTransform(notes, policy('shostakovich', 1));
  return out[0]!.offsetBars > 2;
}

function testShostakovichBarRange(): boolean {
  const notes: NoteEvent[] = [
    { pitchMidi: 60, durationBars: 0.25, offsetBars: 0 },
    { pitchMidi: 62, durationBars: 0.25, offsetBars: 0.25 },
    { pitchMidi: 64, durationBars: 0.25, offsetBars: 1 },
  ];
  const out = applyAntimetricTransform(notes, policy('shostakovich', 1));
  return out.every((n) => {
    const bar = Math.floor(n.offsetBars);
    return n.offsetBars >= bar && n.offsetBars < bar + 1;
  });
}

function testShostakovichDuration(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.5, offsetBars: 0 }];
  const out = applyAntimetricTransform(notes, policy('shostakovich', 1));
  return out[0]!.durationBars === 0.5;
}

function testShostakovichPitch(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 72, durationBars: 0.25, offsetBars: 0 }];
  const out = applyAntimetricTransform(notes, policy('shostakovich', 1));
  return out[0]!.pitchMidi === 72;
}

function testLigetiIntensityZero(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 8 }];
  const out = applyAntimetricTransform(notes, policy('ligeti', 0), 3);
  return out[0]!.offsetBars === 8;
}

function testLigetiVoiceDriftOrdering(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 8 }];
  const v0 = applyAntimetricTransform(notes, policy('ligeti', 1), 0)[0]!.offsetBars;
  const v1 = applyAntimetricTransform(notes, policy('ligeti', 1), 1)[0]!.offsetBars;
  const v3 = applyAntimetricTransform(notes, policy('ligeti', 1), 3)[0]!.offsetBars;
  return v0 === 8 && v3 > v1 && v1 > v0;
}

function testLigetiCumulativeDrift(): boolean {
  const notesBar1: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 1 }];
  const notesBar16: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 16 }];
  const d1 = applyAntimetricTransform(notesBar1, policy('ligeti', 1), 3)[0]!.offsetBars - 1;
  const d16 = applyAntimetricTransform(notesBar16, policy('ligeti', 1), 3)[0]!.offsetBars - 16;
  return d16 > d1;
}

function testLigetiDriftCap(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.25, offsetBars: 100 }];
  const out = applyAntimetricTransform(notes, policy('ligeti', 1), 3)[0]!;
  return out.offsetBars - 100 <= 0.45 + 1e-9;
}

function testLigetiDuration(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 60, durationBars: 0.375, offsetBars: 4 }];
  const out = applyAntimetricTransform(notes, policy('ligeti', 1), 2);
  return out[0]!.durationBars === 0.375;
}

function testLigetiPitch(): boolean {
  const notes: NoteEvent[] = [{ pitchMidi: 55, durationBars: 0.25, offsetBars: 4 }];
  const out = applyAntimetricTransform(notes, policy('ligeti', 1), 2);
  return out[0]!.pitchMidi === 55;
}

function testRhythmExpShostakovich(): boolean {
  return rhythmExpectationForVrb('shostakovich')?.placementMode === 'anti_metric';
}

function testRhythmExpLigeti(): boolean {
  return rhythmExpectationForVrb('ligeti')?.placementMode === 'anti_metric';
}

function testVrbShostakovichWired(): boolean {
  return getVoiceRuleBundle('shostakovich').sqRhythmEngineId === 'sq_antimetric';
}

function testVrbLigetiWired(): boolean {
  return getVoiceRuleBundle('ligeti').sqRhythmEngineId === 'sq_antimetric';
}

export function runSqAntimetricRhythmTests(): { name: string; ok: boolean }[] {
  return [
    ['sq_antimetric: sqAntimetricRhythmEngineId()', testEngineId],
    ['sq_antimetric: SHIPPED_SQ_RHYTHM_ENGINE_IDS includes sq_antimetric', testShippedRegistry],
    ['sq_antimetric: buildAntimetricPolicy shostakovich preset', testBuildPolicyShostakovich],
    ['sq_antimetric: buildAntimetricPolicy ligeti preset', testBuildPolicyLigeti],
    ['sq_antimetric: buildAntimetricPolicy fallback shostakovich', testBuildPolicyFallback],
    ['sq_antimetric: shostakovich intensity 0 unchanged', testShostakovichIntensityZero],
    ['sq_antimetric: shostakovich downbeat shifted later', testShostakovichDownbeatLater],
    ['sq_antimetric: shostakovich bar range clamped', testShostakovichBarRange],
    ['sq_antimetric: shostakovich durationBars preserved', testShostakovichDuration],
    ['sq_antimetric: shostakovich pitchMidi preserved', testShostakovichPitch],
    ['sq_antimetric: ligeti intensity 0 unchanged', testLigetiIntensityZero],
    ['sq_antimetric: ligeti voice 0 < 1 < 3 drift', testLigetiVoiceDriftOrdering],
    ['sq_antimetric: ligeti cumulative drift bar 16 > bar 1', testLigetiCumulativeDrift],
    ['sq_antimetric: ligeti drift capped 0.45 bars', testLigetiDriftCap],
    ['sq_antimetric: ligeti durationBars preserved', testLigetiDuration],
    ['sq_antimetric: ligeti pitchMidi preserved', testLigetiPitch],
    ['sq_antimetric: rhythmExpectationForVrb shostakovich anti_metric', testRhythmExpShostakovich],
    ['sq_antimetric: rhythmExpectationForVrb ligeti anti_metric', testRhythmExpLigeti],
    ['sq_antimetric: shostakovich bundle sqRhythmEngineId wired', testVrbShostakovichWired],
    ['sq_antimetric: ligeti bundle sqRhythmEngineId wired', testVrbLigetiWired],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
