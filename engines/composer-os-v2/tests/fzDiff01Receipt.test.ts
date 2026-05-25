/**
 * V65 P5 golden — FZ_DIFF_01 receipt (off smoke until V65 closeout).
 */

import { buildFrankZappaRiffProfile } from '../core/composer/riffVrbStubs';
import type { RiffProfile } from '../core/composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import {
  compileReceiptMetadata,
  compileResearchReceiptLines,
  mergeRiffProfilePatch,
} from '../core/riff-generator/riffReceiptCompiler';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const SEED = 84001;
const CHORDS = Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? 'Bb7' : 'Bb7#11'));

function frankZappaProfileWithout(receiptId: string): RiffProfile {
  const lines = (getVoiceRuleBundle('frank_zappa').orchestrationPolicy?.fingerprintReceipts ?? []).filter(
    (line) => !line.includes(receiptId)
  );
  return mergeRiffProfilePatch(buildFrankZappaRiffProfile(), compileResearchReceiptLines(lines));
}

function buildScore(profile: RiffProfile): ScoreModel {
  return buildRiffScoreModel({
    seed: SEED,
    bars: CHORDS.length,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    vrbId: 'frank_zappa',
    chordSymbols: CHORDS,
    riffProfile: profile,
  }).score;
}

function ghostNoteCount(score: ScoreModel): number {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return 0;
  let count = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note' && (e as { velocity?: number }).velocity === 42) count++;
    }
  }
  return count;
}

function guitarNoteCount(score: ScoreModel): number {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return 0;
  return guitar.measures.reduce((sum, m) => sum + m.events.filter((e) => e.kind === 'note').length, 0);
}

function testFzDiff01ReceiptCompiled(): boolean {
  const meta = compileReceiptMetadata('frank_zappa');
  return meta.FZ_DIFF_01?.metadataOnly === false;
}

function testFzDiff01ProfilePatch(): boolean {
  const rp = getVoiceRuleBundle('frank_zappa').riffProfile;
  return (
    rp?.spacePolicy?.callResponsePattern === 'zappa_structural_contrast_rest_window' &&
    (rp?.sectionDensityPolicy?.transitions ?? []).some((t) => t.receiptId === 'FZ_DIFF_01') &&
    rp?.repetitionPolicy?.exactLoopAllowed === false
  );
}

function testFzDiff01OutputDiffersFromBase(): boolean {
  const active = buildScore(getVoiceRuleBundle('frank_zappa').riffProfile!);
  const base = buildScore(frankZappaProfileWithout('FZ_DIFF_01'));
  return ghostNoteCount(active) > ghostNoteCount(base) || guitarNoteCount(active) < guitarNoteCount(base);
}

export function runFzDiff01ReceiptTests(): { name: string; ok: boolean }[] {
  return [
    ['FZ_DIFF_01 — receipt compiles to runtime patch', testFzDiff01ReceiptCompiled],
    ['FZ_DIFF_01 — merged profile has structural contrast marker', testFzDiff01ProfilePatch],
    ['FZ_DIFF_01 — output differs from base Zappa (seed 84001)', testFzDiff01OutputDiffersFromBase],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
