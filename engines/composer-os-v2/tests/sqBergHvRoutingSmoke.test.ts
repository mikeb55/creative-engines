/**
 * Phase 2 Batch 6 - SQ Berg HV-only non-mosaic harmony bridge.
 *
 * - HV=berg: precompute fires, bergDeviceReceipts / effective bars on meta
 * - Primary berg without HV: wall does NOT fire
 * - Other HV (beefheart / threadgill): zero Berg receipts; Badalamenti still unwired → chord parity
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { isBergHvOnlyEnsembleWall } from '../core/song-mode/bergSlice';

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function bergReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & { bergDeviceReceipts?: string[] })
    | undefined;
  return meta?.bergDeviceReceipts ?? [];
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
    seed: opts.seed ?? 96062,
    title: 'SQ Berg HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function testGateHvOnly(): boolean {
  return (
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'berg', songwriterStyleId: 'wayne_shorter' }) === true &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'berg' }) === false &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'berg', songwriterStyleId: 'frank_zappa' }) === false
  );
}

function testHvBergFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  if (!r.score) return false;
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & {
        bergEffectiveHarmonyBars?: string[];
        bergDeviceReceipts?: string[];
      })
    | undefined;
  const bars = meta?.bergEffectiveHarmonyBars ?? [];
  const receipts = bergReceipts(r);
  return (
    meta?.harmonicVoice === 'berg' &&
    bars.length === 16 &&
    bars.join('|') !== [...Array(16).fill('Cmaj7')].join('|') &&
    receipts.some((x) => x.startsWith('bg:'))
  );
}

function testPrimaryBergNoHv(): boolean {
  const r = realise({ primary: 'berg' });
  return bergReceipts(r).length === 0;
}

function testSpotCheckOtherHv(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if (bergReceipts(beef).length !== 0 || bergReceipts(badalamenti).length !== 0) return false;
  const bc = scoreChords(baseline.score);
  // Beefheart HV rewrites chords (Phase 2 widen); Badalamenti still unwired → chord parity with baseline.
  return scoreChords(beef.score).length > 0 && bc === scoreChords(badalamenti.score) && bc.length > 0;
}

export function runSqBergHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Berg HV: isBergHvOnlyEnsembleWall gate',
      ok: testGateHvOnly(),
    },
    {
      name: 'SQ Berg HV: HV=berg fires wall + bg:* / effective bars',
      ok: testHvBergFires(),
    },
    {
      name: 'SQ Berg HV: primary berg without HV does not fire wall',
      ok: testPrimaryBergNoHv(),
    },
    {
      name: 'SQ Berg HV: beefheart/badalamenti HV spot-check - zero Berg receipts',
      ok: testSpotCheckOtherHv(),
    },
  ];
}
