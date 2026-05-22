import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import {
  compileReceiptsToRiffProfilePatch,
  FRANK_ZAPPA_RESEARCH_RECEIPT_IDS,
} from '../core/riff-generator/riffReceiptCompiler';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { isRiffGeneratorVrbId, resolveRiffFamilyTag } from '../core/riff-generator/riffVrbRegistry';

function testFrankZappaRiffRegistry(): boolean {
  if (!isRiffGeneratorVrbId('frank_zappa')) return false;
  const b = getVoiceRuleBundle('frank_zappa');
  if (b.family !== 'rock' || b.sigma !== 29) return false;
  if (!b.riffProfile?.soloGeneratorProfile?.enabled) return false;
  return resolveRiffFamilyTag('zappa') === 'rock' && resolveRiffFamilyTag('mothers') === 'rock';
}

function testZappaResearchReceiptCompile(): boolean {
  const patch = compileReceiptsToRiffProfilePatch('frank_zappa');
  if (!patch.soloGeneratorProfile?.enabled) return false;
  for (const id of FRANK_ZAPPA_RESEARCH_RECEIPT_IDS) {
    const receipts = getVoiceRuleBundle('frank_zappa').orchestrationPolicy?.fingerprintReceipts ?? [];
    if (!receipts.some((line) => line.includes(id))) return false;
  }
  return true;
}

function testSoloPartWhenEnabled(): boolean {
  const profile = resolveRiffGeneratorProfile({
    vrbId: 'frank_zappa',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
  });
  const off = buildRiffScoreModel({
    seed: 424242,
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: false,
    vrbId: 'frank_zappa',
    chordSymbols: ['E7', 'A7', 'D7', 'G7'],
    riffProfile: profile,
  });
  const on = buildRiffScoreModel({
    seed: 424242,
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    vrbId: 'frank_zappa',
    chordSymbols: ['E7', 'A7', 'D7', 'G7'],
    riffProfile: profile,
  });
  const soloOff = off.score.parts.find((p) => p.id === 'solo');
  const soloOn = on.score.parts.find((p) => p.id === 'solo');
  if (soloOff) return false;
  if (!soloOn) return false;
  const notes = soloOn.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note'));
  return notes.length >= 4 && on.generationMetadata.multiVoiceBadges?.solo === true;
}

export function runRiffZappaSoloTests(): { name: string; ok: boolean }[] {
  return [
    ['Riff Zappa — frank_zappa VRB registry + solo profile', testFrankZappaRiffRegistry],
    ['Riff Zappa — research receipts compile to soloGeneratorProfile', testZappaResearchReceiptCompile],
    ['Riff Zappa — solo MIDI part when riffSolo enabled', testSoloPartWhenEnabled],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
