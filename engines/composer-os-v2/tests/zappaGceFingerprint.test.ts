/**
 * P2 golden — Zappa GCE structural fingerprint vs generic Song Mode (off smoke until P7).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { FRANK_ZAPPA_STRUCTURAL_FINGERPRINT } from '../core/gce/frankZappaStructuralFingerprint';

const SEED = 76001;
const CHORDS = Array.from({ length: 8 }, () => 'Bb7');

function runFixture(primarySongwriterStyle: string) {
  return runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS,
    parsedChordBars: CHORDS,
  });
}

function goldenRunOk(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  return !!r.score && !!r.context;
}

function countNonFourFourBars(map: BarMeterMap | undefined): number {
  if (!map) return 0;
  let n = 0;
  for (const m of Object.values(map)) {
    if (m.numerator !== 4 || m.denominator !== 4) n++;
  }
  return n;
}

function guitarRegisterSpread(score: ScoreModel | undefined): number {
  const guitar = score?.parts.find((p) => p.id === 'guitar');
  if (!guitar) return 0;
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push(e.pitch);
    }
  }
  if (pitches.length === 0) return 0;
  return Math.max(...pitches) - Math.min(...pitches);
}

function testZappaFingerprintApplied(): boolean {
  const r = runFixture('frank_zappa');
  const md = r.context?.generationMetadata;
  return (
    goldenRunOk(r) &&
    md?.zappaGceStructuralFingerprintApplied === true &&
    md?.zappaGceAutoBarMeterMap === true &&
    Array.isArray(md?.zappaSectionKindSequence) &&
    (md.zappaSectionKindSequence?.length ?? 0) >= 2
  );
}

function testZappaStructuralDiffVsGeneric(): boolean {
  const zappa = runFixture('frank_zappa');
  const generic = runFixture('bill_evans');
  if (!goldenRunOk(zappa) || !goldenRunOk(generic)) return false;

  const zappaMap = zappa.context?.generationMetadata?.barMeterMap ?? zappa.context?.barMeterMap;
  const genericMap = generic.context?.generationMetadata?.barMeterMap ?? generic.context?.barMeterMap;

  const zappaOdd = countNonFourFourBars(zappaMap);
  const genericOdd = countNonFourFourBars(genericMap);

  const zappaSpread = guitarRegisterSpread(zappa.score);
  const genericSpread = guitarRegisterSpread(generic.score);

  const zappaKinds = zappa.context?.generationMetadata?.zappaSectionKindSequence ?? [];
  const genericKinds = generic.context?.generationMetadata?.zappaSectionKindSequence ?? [];

  const meterDiff = zappaOdd >= 2 && zappaOdd > genericOdd;
  const registerDiff = Math.abs(zappaSpread - genericSpread) >= 3;
  const sectionKindDiff = zappaKinds.length >= 2 && genericKinds.length === 0;

  return meterDiff || registerDiff || sectionKindDiff;
}

function testFingerprintParamsShape(): boolean {
  const fp = FRANK_ZAPPA_STRUCTURAL_FINGERPRINT;
  return (
    fp.metricDisruption === true &&
    fp.registerShiftProbability === 0.65 &&
    fp.absurdistJuxtaposition === true &&
    fp.styleCollisionWeight === 0.7
  );
}

export function runZappaGceFingerprintTests(): { name: string; ok: boolean }[] {
  return [
    ['Zappa GCE fingerprint — 4 structural params on profile', testFingerprintParamsShape],
    ['Zappa GCE fingerprint — generation pass applied (seed 76001)', testZappaFingerprintApplied],
    [
      'Zappa GCE fingerprint — structural diff vs generic Song Mode (Bb7×8)',
      testZappaStructuralDiffVsGeneric,
    ],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
