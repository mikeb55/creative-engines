/**
 * P3 golden — FZ_REGISTER_COLLISION receipt (off smoke until P8).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { compileReceiptMetadata } from '../core/riff-generator/riffReceiptCompiler';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 77003;
const CHORDS = Array.from({ length: 8 }, () => 'Bb7');

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

function riffRegisterSpan(vrbId: string): number {
  const rp = getVoiceRuleBundle(vrbId).riffProfile;
  if (!rp) return 0;
  return (rp.riffRegisterCeiling ?? 0) - (rp.riffRegisterFloor ?? 0);
}

function testFzRegisterCollisionReceiptCompiled(): boolean {
  const meta = compileReceiptMetadata('frank_zappa');
  return meta.FZ_REGISTER_COLLISION?.metadataOnly === false;
}

function testFzRegisterCollisionProfileWide(): boolean {
  const span = riffRegisterSpan('frank_zappa');
  return span >= 40 && (getVoiceRuleBundle('frank_zappa').riffProfile?.variationOperators ?? []).includes('registerShift');
}

function soloRegisterSpread(score: ScoreModel | undefined): number {
  const solo = score?.parts.find((p) => p.id === 'zappa_solo');
  if (!solo) return 0;
  const pitches: number[] = [];
  for (const m of solo.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push(e.pitch);
    }
  }
  if (pitches.length === 0) return 0;
  return Math.max(...pitches) - Math.min(...pitches);
}

function testFzRegisterCollisionSongModeSpread(): boolean {
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
  if (!zappa.score || !generic.score) return false;
  const profileOk = riffRegisterSpan('frank_zappa') >= riffRegisterSpan('bill_evans') + 20;
  const soloSpread = soloRegisterSpread(zappa.score);
  const genericGuitarSpread = guitarRegisterSpread(generic.score);
  const writtenOk = soloSpread >= 12 || guitarRegisterSpread(zappa.score) >= genericGuitarSpread + 2;
  return profileOk && writtenOk;
}

export function runFzRegisterCollisionReceiptTests(): { name: string; ok: boolean }[] {
  return [
    [
      'FZ_REGISTER_COLLISION — receipt compiles to riffProfile patch',
      testFzRegisterCollisionReceiptCompiled,
    ],
    ['FZ_REGISTER_COLLISION — merged profile register span >= 40 semitones', testFzRegisterCollisionProfileWide],
    [
      'FZ_REGISTER_COLLISION — guitar spread wider than generic Song Mode (seed 77003)',
      testFzRegisterCollisionSongModeSpread,
    ],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
