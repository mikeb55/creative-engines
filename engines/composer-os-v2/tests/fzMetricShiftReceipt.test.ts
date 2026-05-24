/**
 * P3 golden — FZ_METRIC_SHIFT receipt (off smoke until P8).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { compileReceiptMetadata } from '../core/riff-generator/riffReceiptCompiler';
import { buildFrankZappaRiffProfile } from '../core/composer/riffVrbStubs';

const SEED = 77002;
const CHORDS = Array.from({ length: 8 }, () => 'Bb7');

function testFzMetricShiftReceiptCompiled(): boolean {
  const meta = compileReceiptMetadata('frank_zappa');
  return meta.FZ_METRIC_SHIFT?.metadataOnly === false;
}

function testFzMetricShiftElevatedVsStub(): boolean {
  const stub = buildFrankZappaRiffProfile();
  const merged = getVoiceRuleBundle('frank_zappa').riffProfile;
  const stubDisp = stub.metricDisplacement ?? 0;
  const mergedDisp = merged?.metricDisplacement ?? 0;
  return mergedDisp >= stubDisp + 0.24 && mergedDisp >= 0.75;
}

function testFzMetricShiftVsGenericSongMode(): boolean {
  const zappa = runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS,
    parsedChordBars: CHORDS,
  });
  const generic = runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bill_evans',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS,
    parsedChordBars: CHORDS,
  });
  const zappaDisp = getVoiceRuleBundle('frank_zappa').riffProfile?.metricDisplacement ?? 0;
  const genericDisp = getVoiceRuleBundle('bill_evans').riffProfile?.metricDisplacement ?? 0;
  return (
    !!zappa.score &&
    !!generic.score &&
    zappaDisp > genericDisp &&
    (zappa.context?.generationMetadata?.zappaGceStructuralFingerprintApplied === true ||
      zappaDisp >= 0.75)
  );
}

export function runFzMetricShiftReceiptTests(): { name: string; ok: boolean }[] {
  return [
    ['FZ_METRIC_SHIFT — receipt compiles to riffProfile patch', testFzMetricShiftReceiptCompiled],
    ['FZ_METRIC_SHIFT — metricDisplacement elevated vs stub base', testFzMetricShiftElevatedVsStub],
    ['FZ_METRIC_SHIFT — profile displacement above generic (seed 77002)', testFzMetricShiftVsGenericSongMode],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
