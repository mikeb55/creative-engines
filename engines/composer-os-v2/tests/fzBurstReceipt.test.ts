/**
 * P3 golden — FZ_BURST receipt (off smoke until P8).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { compileReceiptMetadata } from '../core/riff-generator/riffReceiptCompiler';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 77001;
const CHORDS = Array.from({ length: 16 }, () => 'Bb7');

function notesPerBarForPart(score: ScoreModel | undefined, partId: string): number[] {
  const part = score?.parts.find((p) => p.id === partId);
  if (!part) return [];
  return part.measures.map((m) => m.events.filter((e) => e.kind === 'note').length);
}

function hasDensitySpikeThenSilenceTail(counts: number[]): boolean {
  for (let i = 1; i < counts.length - 1; i++) {
    const prev = counts[i - 1] ?? 0;
    const cur = counts[i] ?? 0;
    const next = counts[i + 1] ?? 0;
    if (cur >= 4 && cur > prev + 1 && next <= 1) return true;
  }
  if (counts.length < 2) return false;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max >= 4 && min <= 1 && max - min >= 3;
}

function testFzBurstReceiptCompiled(): boolean {
  const meta = compileReceiptMetadata('frank_zappa');
  return meta.FZ_BURST?.metadataOnly === false;
}

function testFzBurstProfilePatch(): boolean {
  const rp = getVoiceRuleBundle('frank_zappa').riffProfile;
  return (
    (rp?.sectionDensityPolicy?.transitions?.length ?? 0) >= 2 &&
    (rp?.cadenceTypes?.hard_stop_rest ?? 0) >= 0.7
  );
}

function hasZappaPhraseBreathRest(score: ScoreModel | undefined): boolean {
  const solo = score?.parts.find((p) => p.id === 'zappa_solo');
  if (!solo) return false;
  for (const m of solo.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e as { marker?: string }).marker === 'zappa_phrase_breath_rest') return true;
    }
  }
  return false;
}

function testFzBurstSongModeOutput(): boolean {
  const r = runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 16,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS,
    parsedChordBars: CHORDS,
  });
  if (!r.score) return false;
  const soloCounts = notesPerBarForPart(r.score, 'zappa_solo');
  const soloMax = soloCounts.length ? Math.max(...soloCounts) : 0;
  const densityWired =
    (getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile?.noteDensityRange?.max ?? 0) >= 28;
  const contrast =
    soloCounts.length > 0 &&
    (hasDensitySpikeThenSilenceTail(soloCounts) || (soloMax >= 3 && hasZappaPhraseBreathRest(r.score)));
  return densityWired && contrast;
}

export function runFzBurstReceiptTests(): { name: string; ok: boolean }[] {
  return [
    ['FZ_BURST — receipt compiles to riffProfile patch', testFzBurstReceiptCompiled],
    ['FZ_BURST — merged frank_zappa riffProfile has density + hard_stop_rest', testFzBurstProfilePatch],
    [
      'FZ_BURST — Song Mode zappa_solo density contrast + breath rest (seed 77001)',
      testFzBurstSongModeOutput,
    ],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
