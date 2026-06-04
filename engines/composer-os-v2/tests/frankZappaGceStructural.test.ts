/**
 * Frank Zappa GCE structural fingerprint — declarative profile + duo gate wiring.
 */

import type { CompositionContext } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { getBestFingerprintId } from '../core/gce/gceMemoryRegistry';
import {
  FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID,
  FRANK_ZAPPA_STRUCTURAL_FINGERPRINT,
  ZAPPA_GCE_METER_SPLICE,
  isFrankZappaSongwriterId,
  scoreFrankZappaHarmonicNonResolution,
  scoreFrankZappaIonianLydianModeCoverage,
  scoreFrankZappaIonianAvoidTonic,
  scoreFrankZappaLydianIronic,
  scoreFrankZappaMeterDisruption,
  scoreFrankZappaModeMetricDisplacement,
  scoreFrankZappaStructuralPillars,
} from '../core/gce/frankZappaStructuralFingerprint';
import { rhythmExpectationForVrb } from '../core/gce/gceAutoScorers';
import { scoreFrankZappaResultForGce } from '../core/gce/gceGate';
import {
  SLONIMSKY_STYLE_PROFILE_MAP,
  getFrankZappaBluesrockFerociousProfile,
} from '../core/slonimsky/slonimskyEngine';
import { resolveZappaStyleMode } from '../core/song-mode/frankZappaSlice';

function minimalZappaContext(totalBars = 8): CompositionContext {
  return {
    form: {
      totalBars,
      sections: [
        { label: 'a', startBar: 1, length: 4 },
        { label: 'b', startBar: 5, length: 4 },
      ],
    },
    generationMetadata: {
      songwriterStyleId: 'frank_zappa',
      barMeterMap: {
        1: { numerator: 7, denominator: 8 },
        2: { numerator: 4, denominator: 4 },
        3: { numerator: 5, denominator: 4 },
        4: { numerator: 4, denominator: 4 },
        5: { numerator: 7, denominator: 8 },
        6: { numerator: 4, denominator: 4 },
        7: { numerator: 5, denominator: 4 },
        8: { numerator: 4, denominator: 4 },
      },
    },
  } as unknown as CompositionContext;
}

function minimalZappaScore(totalBars = 8): ScoreModel {
  const measures = Array.from({ length: totalBars }, (_, i) => ({
    index: i + 1,
    chord: i % 2 === 0 ? 'E7alt' : 'A7#11/D',
    events: [
      { kind: 'note' as const, pitch: 64 + (i % 3), startBeat: 0, duration: 1, voice: 1 },
      { kind: 'note' as const, pitch: 67, startBeat: 2, duration: 1, voice: 1 },
    ],
  }));
  return {
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures,
      },
    ],
  } as ScoreModel;
}

function testFrankZappaStructuralFingerprintShape(): boolean {
  return (
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.id === FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.phraseFragmentation === 'high' &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.meterMapId === 'zappa_meter_map' &&
    ZAPPA_GCE_METER_SPLICE.length === 3 &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.harmonicCadenceTargets.length === 3 &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.quoteCollage.metadataOnly === true &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.metricDisruption === true &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.registerShiftProbability === 0.65 &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.absurdistJuxtaposition === true &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.styleCollisionWeight === 0.7
  );
}

function testFrankZappaGceRegistryHook(): boolean {
  return getBestFingerprintId('duo', 'frank_zappa') === FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID;
}

function testFrankZappaRhythmExpectation(): boolean {
  const exp = rhythmExpectationForVrb('frank_zappa');
  return exp?.placementMode === 'anti_metric';
}

function testFrankZappaIonianLydianModeScorers(): boolean {
  const lydChords = ['Dmaj7#11', 'Dmaj7#11', 'A7alt', 'Gmaj7', 'F#7', 'Bmaj7'];
  const lyd = scoreFrankZappaLydianIronic(lydChords);
  const melody: import('../core/gce/gce_melody_eval').MelodicNote[] = [
    { midi: 62, beats: 1, bar: 1, beat: 0.5 },
    { midi: 66, beats: 1, bar: 1, beat: 2.5 },
    { midi: 69, beats: 1, bar: 2, beat: 1.25 },
    { midi: 71, beats: 1, bar: 4, beat: 3.5 },
  ];
  const ion = scoreFrankZappaIonianAvoidTonic(lydChords, melody);
  const disp = scoreFrankZappaModeMetricDisplacement(melody);
  const composite = scoreFrankZappaIonianLydianModeCoverage(lydChords, melody);
  return lyd.score >= 5 && ion.score >= 4 && disp.score >= 5 && composite.score >= 5;
}

function testFrankZappaStructuralPillarsIncludeModeCoverage(): boolean {
  const ctx = minimalZappaContext();
  const score = minimalZappaScore();
  const pillars = scoreFrankZappaStructuralPillars({
    score,
    context: ctx,
    chords: ['Dmaj7#11', 'A7alt', 'Gmaj7', 'F#7'],
    sections: [{ label: 'a', barStart: 1, barEnd: 4, role: 'verse' }],
    melody: [{ midi: 62, beats: 1, bar: 1, beat: 0.5 }],
  });
  return pillars.some((p) => p.name.includes('Ionian/Lydian'));
}

function testFrankZappaStructuralScorers(): boolean {
  const ctx = minimalZappaContext();
  const score = minimalZappaScore();
  const chords = ['E7alt', 'A7#11/D', 'B7', 'F7alt', 'E7#9', 'A7sus4', 'D7alt', 'G7'];
  const sections = [
    { label: 'intro', barStart: 1, barEnd: 4, role: 'intro' },
    { label: 'verse', barStart: 5, barEnd: 8, role: 'verse' },
  ];
  const meter = scoreFrankZappaMeterDisruption(ctx, score, 8);
  const harm = scoreFrankZappaHarmonicNonResolution(chords);
  const pillars = scoreFrankZappaStructuralPillars({ score, context: ctx, chords, sections, melody: [] });
  return (
    meter.score >= 5 &&
    harm.score >= 4 &&
    pillars.some((p) => p.name.includes('Fragmentation')) &&
    pillars.some((p) => p.name.includes('Quote/Collage'))
  );
}

function testFrankZappaGceGateFinite(): boolean {
  const ctx = minimalZappaContext();
  const score = minimalZappaScore();
  const gate = scoreFrankZappaResultForGce(score, ctx);
  return Number.isFinite(gate.overallScore) && gate.overallScore > 0;
}

function testFrankZappaSongwriterAliases(): boolean {
  return (
    isFrankZappaSongwriterId('frank_zappa') &&
    isFrankZappaSongwriterId('zappa') &&
    isFrankZappaSongwriterId('fz') &&
    !isFrankZappaSongwriterId('led_zeppelin')
  );
}

function testFrankZappaBluesrockFerociousInSlonimskyMap(): boolean {
  const row = SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.bluesrockFerocious;
  const viaGetter = getFrankZappaBluesrockFerociousProfile();
  return (
    row !== undefined &&
    row.modalBase[0] === 'Dorian' &&
    row.noteDensityRange.min === 8 &&
    row.noteDensityRange.max === 24 &&
    row.rhythmicGroupings.includes('hemiola') &&
    row.phraseEndingPolicy.hardCut === true &&
    viaGetter.vampType === 'pedalOrTwoChord' &&
    row.variationOperators.length === 5
  );
}

function testZappaStyleModeResolveDefault(): boolean {
  const ctx = minimalZappaContext();
  return (
    resolveZappaStyleMode(ctx) === 'compositional' &&
    resolveZappaStyleMode({ zappaStyleMode: 'bluesrockFerocious' }) === 'bluesrockFerocious'
  );
}

function testFrankZappaCompositionalGateUnchanged(): boolean {
  const ctx = minimalZappaContext();
  const score = minimalZappaScore();
  const pillars = scoreFrankZappaStructuralPillars({
    score,
    context: ctx,
    chords: ['E7alt', 'A7#11/D'],
    sections: [{ label: 'a', barStart: 1, barEnd: 8, role: 'verse' }],
    melody: [],
  });
  return (
    resolveZappaStyleMode(ctx) === 'compositional' &&
    pillars.some((p) => p.name.includes('Fragmentation')) &&
    pillars.some((p) => p.name.includes('Meter Disruption'))
  );
}

function testFrankZappaBluesrockGateBypassesStructural(): boolean {
  const ctx = {
    ...minimalZappaContext(),
    generationMetadata: {
      ...minimalZappaContext().generationMetadata,
      zappaStyleMode: 'bluesrockFerocious' as const,
    },
  };
  const gate = scoreFrankZappaResultForGce(minimalZappaScore(), ctx);
  const compGate = scoreFrankZappaResultForGce(minimalZappaScore(), minimalZappaContext());
  return (
    resolveZappaStyleMode(ctx) === 'bluesrockFerocious' &&
    Number.isFinite(gate.overallScore) &&
    gate.overallScore > 0 &&
    Number.isFinite(compGate.overallScore)
  );
}

export function runFrankZappaGceStructuralTests(): { name: string; ok: boolean }[] {
  return [
    ['Zappa GCE — structural fingerprint shape', testFrankZappaStructuralFingerprintShape],
    ['Zappa GCE — duo registry hook', testFrankZappaGceRegistryHook],
    ['Zappa GCE — rhythmExpectation anti_metric', testFrankZappaRhythmExpectation],
    ['Zappa GCE — structural scorers + pillars', testFrankZappaStructuralScorers],
    ['Zappa GCE — Ionian/Lydian ironic mode scorers', testFrankZappaIonianLydianModeScorers],
    ['Zappa GCE — structural pillars include Ionian/Lydian', testFrankZappaStructuralPillarsIncludeModeCoverage],
    ['Zappa GCE — scoreFrankZappaResultForGce finite', testFrankZappaGceGateFinite],
    ['Zappa GCE — songwriter id aliases', testFrankZappaSongwriterAliases],
    ['Zappa GCE — bluesrockFerocious in SLONIMSKY map', testFrankZappaBluesrockFerociousInSlonimskyMap],
    ['Zappa GCE — zappaStyleMode resolve (frankZappaSlice)', testZappaStyleModeResolveDefault],
    ['Zappa GCE — compositional structural pillars unchanged', testFrankZappaCompositionalGateUnchanged],
    ['Zappa GCE — bluesrock gate bypasses structural scorers', testFrankZappaBluesrockGateBypassesStructural],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
