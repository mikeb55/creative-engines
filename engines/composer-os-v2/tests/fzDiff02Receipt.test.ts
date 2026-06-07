/**
 * V65 P5 golden — FZ_DIFF_02 receipt (off smoke until V65 closeout).
 */

import { buildFrankZappaRiffProfile } from '../core/composer/riffVrbStubs';
import type { RiffProfile } from '../core/composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { chordTonesForChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import {
  compileReceiptMetadata,
  compileResearchReceiptLines,
  mergeRiffProfilePatch,
} from '../core/riff-generator/riffReceiptCompiler';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { RiffBarCount } from '../core/riff-generator/riffTypes';

const SEED = 84002;
const CHORDS = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'E7' : 'A7'));

function frankZappaProfileWithout(receiptId: string): RiffProfile {
  const lines = (getVoiceRuleBundle('frank_zappa').orchestrationPolicy?.fingerprintReceipts ?? []).filter(
    (line) => !line.includes(receiptId)
  );
  return mergeRiffProfilePatch(buildFrankZappaRiffProfile(), compileResearchReceiptLines(lines));
}

function buildScore(profile: RiffProfile): ScoreModel {
  return buildRiffScoreModel({
    seed: SEED,
    bars: CHORDS.length as RiffBarCount,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    bpm: 120,
    vrbId: 'frank_zappa',
    chordSymbols: CHORDS,
    riffProfile: profile,
  }).score;
}

function soloOutsidePitchCount(score: ScoreModel): number {
  const solo = score.parts.find((p) => p.id === 'solo');
  if (!solo) return 0;
  let count = 0;
  for (const m of solo.measures) {
    const tones = chordTonesForChordSymbol(m.chord ?? CHORDS[m.index - 1] ?? 'E7');
    const pcs = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => ((p % 12) + 12) % 12);
    for (const e of m.events) {
      if (e.kind === 'note' && !pcs.includes(((e.pitch % 12) + 12) % 12)) count++;
    }
  }
  return count;
}

function soloRhythmSignature(score: ScoreModel): string {
  const solo = score.parts.find((p) => p.id === 'solo');
  if (!solo) return '';
  return solo.measures
    .map((m) =>
      m.events
        .filter((e) => e.kind === 'note')
        .map((e) => `${e.startBeat.toFixed(3)}:${e.duration.toFixed(3)}`)
        .join(',')
    )
    .join('|');
}

function testFzDiff02ReceiptCompiled(): boolean {
  const meta = compileReceiptMetadata('frank_zappa');
  return meta.FZ_DIFF_02?.metadataOnly === false;
}

function testFzDiff02ProfilePatch(): boolean {
  const rp = getVoiceRuleBundle('frank_zappa').riffProfile;
  return (
    (rp?.chromaticBudget ?? 0) >= 0.62 &&
    (rp?.metricDisplacement ?? 0) >= 0.68 &&
    (rp?.variationOperators ?? []).includes('harmonicColourSwap') &&
    (rp?.soloGeneratorProfile?.chromaticBudget ?? 0) >= 0.68 &&
    JSON.stringify(rp?.soloGeneratorProfile?.rhythmicCellEighths) === JSON.stringify([5, 3])
  );
}

function testFzDiff02OutputDiffersFromBase(): boolean {
  const active = buildScore(getVoiceRuleBundle('frank_zappa').riffProfile!);
  const base = buildScore(frankZappaProfileWithout('FZ_DIFF_02'));
  return (
    soloRhythmSignature(active) !== soloRhythmSignature(base) &&
    soloOutsidePitchCount(active) >= soloOutsidePitchCount(base)
  );
}

export function runFzDiff02ReceiptTests(): { name: string; ok: boolean }[] {
  return [
    ['FZ_DIFF_02 — receipt compiles to runtime patch', testFzDiff02ReceiptCompiled],
    ['FZ_DIFF_02 — merged profile has style-boundary signal', testFzDiff02ProfilePatch],
    ['FZ_DIFF_02 — output differs from base Zappa (seed 84002)', testFzDiff02OutputDiffersFromBase],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
