/**
 * V66 — promoted FZ_* stub receipt fingerprints (12 of 15; P3 shipped BURST/METRIC/MREGISTER).
 */

import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import {
  compileReceiptMetadata,
} from '../core/riff-generator/riffReceiptCompiler';
import {
  ZAPPA_FZ_STUB_RECEIPT_IDS,
  detectZappaFzReceipt,
  profileFieldCheckForFzReceipt,
  scoreZappaFzReceiptContribution,
  type ZappaFzStubReceiptId,
} from '../core/riff-generator/zappaFzReceiptFingerprints';
import type { RiffProfile } from '../core/composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const CHORDS = Array.from({ length: 12 }, (_, i) =>
  i % 3 === 0 ? 'Dmaj7#11' : i % 3 === 1 ? 'A7alt/D' : 'Gmaj7'
);

function seedForReceipt(id: ZappaFzStubReceiptId): number {
  let h = 85000;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i) * 17;
  return h;
}

function buildScore(profile: RiffProfile, seed: number): ScoreModel {
  return buildRiffScoreModel({
    seed,
    bars: CHORDS.length,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: true,
    soloEnabled: true,
    vrbId: 'frank_zappa',
    chordSymbols: CHORDS,
    riffProfile: profile,
  }).score;
}

function runReceiptSuite(id: ZappaFzStubReceiptId): { name: string; ok: boolean }[] {
  const seed = seedForReceipt(id);
  const meta = compileReceiptMetadata('frank_zappa');
  const profile = getVoiceRuleBundle('frank_zappa').riffProfile;
  const active = buildScore(profile!, seed);
  const input = { score: active, chords: CHORDS, profile: profile ?? undefined };

  return [
    {
      name: `${id} — receipt compiles (metadataOnly=false)`,
      ok: meta[id]?.metadataOnly === false,
    },
    {
      name: `${id} — merged profile field check`,
      ok: profileFieldCheckForFzReceipt(id, profile),
    },
    {
      name: `${id} — detect + score contribution (seed ${seed})`,
      ok: detectZappaFzReceipt(id, input) && scoreZappaFzReceiptContribution(id, input) >= 5,
    },
  ];
}

export function runZappaFzReceiptFingerprintTests(): { name: string; ok: boolean }[] {
  return ZAPPA_FZ_STUB_RECEIPT_IDS.flatMap((id) => runReceiptSuite(id));
}
