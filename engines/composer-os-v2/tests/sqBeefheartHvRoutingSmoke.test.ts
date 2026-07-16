/**
 * Phase 2 widen — SQ Beefheart HV-only non-mosaic harmony bridge.
 *
 * - HV=beefheart: precompute fires, beefheartDeviceReceipts / effective bars on meta
 * - Primary beefheart without HV: wall does NOT fire
 * - Unwired HV (berg / badalamenti): zero Beefheart rewrite
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { isBeefheartHvOnlyEnsembleWall } from '../core/song-mode/beefheartFragmentSlice';

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function beefReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & { beefheartDeviceReceipts?: string[] })
    | undefined;
  return meta?.beefheartDeviceReceipts ?? [];
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = opts.bars ?? 16;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return runQuartetRealisation({
    seed: opts.seed ?? 96072,
    title: 'SQ Beefheart HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function testGateHvOnly(): boolean {
  return (
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isBeefheartHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'beefheart' }) ===
      false &&
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart',
      songwriterStyleId: 'frank_zappa',
    }) === false
  );
}

function testHvBeefheartFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  if (!r.score) return false;
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & {
        beefheartEffectiveHarmonyBars?: string[];
        beefheartDeviceReceipts?: string[];
      })
    | undefined;
  const bars = meta?.beefheartEffectiveHarmonyBars ?? [];
  const receipts = beefReceipts(r);
  return (
    meta?.harmonicVoice === 'beefheart' &&
    bars.length === 16 &&
    bars.join('|') !== [...Array(16).fill('Cmaj7')].join('|') &&
    receipts.some((x) => x.startsWith('cbf:'))
  );
}

function testPrimaryBeefheartNoHv(): boolean {
  const r = realise({ primary: 'beefheart' });
  return beefReceipts(r).length === 0;
}

function testSpotCheckOtherHv(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if (beefReceipts(berg).length !== 0 || beefReceipts(badalamenti).length !== 0) return false;
  const bc = scoreChords(baseline.score);
  // Berg HV rewrites chords (Batch 6); Badalamenti still unwired → chord parity with baseline.
  return scoreChords(berg.score).length > 0 && bc === scoreChords(badalamenti.score) && bc.length > 0;
}

export function runSqBeefheartHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Beefheart HV: isBeefheartHvOnlyEnsembleWall gate',
      ok: testGateHvOnly(),
    },
    {
      name: 'SQ Beefheart HV: HV=beefheart fires wall + cbf:* / effective bars',
      ok: testHvBeefheartFires(),
    },
    {
      name: 'SQ Beefheart HV: primary beefheart without HV does not fire wall',
      ok: testPrimaryBeefheartNoHv(),
    },
    {
      name: 'SQ Beefheart HV: berg/badalamenti HV spot-check - zero Beefheart rewrite',
      ok: testSpotCheckOtherHv(),
    },
  ];
}