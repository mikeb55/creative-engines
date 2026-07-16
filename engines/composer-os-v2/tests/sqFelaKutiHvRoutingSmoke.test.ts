/**
 * Phase 2 widen - SQ Fela Kuti HV-only non-mosaic harmony bridge.
 *
 * - HV=fela_kuti: precompute fires, felaKutiDeviceReceipts / effective bars on meta
 * - Primary fela_kuti without HV: wall does NOT fire
 * - Unwired HV (berg / badalamenti): zero Fela rewrite
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { isFelaKutiHvOnlyEnsembleWall } from '../core/song-mode/felaKutiSlice';

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function felaReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & { felaKutiDeviceReceipts?: string[] })
    | undefined;
  return meta?.felaKutiDeviceReceipts ?? [];
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = opts.bars ?? 16;
  const chords = [...Array(Math.max(0, bars - 1)).fill('Cmaj7'), 'G7'] as string[];
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return runQuartetRealisation({
    seed: opts.seed ?? 96082,
    title: 'SQ Fela Kuti HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function testGateHvOnly(): boolean {
  return (
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'fela_kuti',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isFelaKutiHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'fela_kuti' }) ===
      false &&
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'fela_kuti',
      songwriterStyleId: 'frank_zappa',
    }) === false
  );
}

function testHvFelaFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  if (!r.score) return false;
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & {
        felaKutiEffectiveHarmonyBars?: string[];
        felaKutiDeviceReceipts?: string[];
      })
    | undefined;
  const bars = meta?.felaKutiEffectiveHarmonyBars ?? [];
  const receipts = felaReceipts(r);
  return (
    meta?.harmonicVoice === 'fela_kuti' &&
    bars.length === 16 &&
    (bars[15] === 'Cmin7' || bars[15] === 'Cmin9') &&
    receipts.some((x) => x.startsWith('fk:'))
  );
}

function testPrimaryFelaNoHv(): boolean {
  const r = realise({ primary: 'fela_kuti' });
  return felaReceipts(r).length === 0;
}

function testSpotCheckOtherHv(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if (felaReceipts(berg).length !== 0 || felaReceipts(beef).length !== 0 || felaReceipts(badalamenti).length !== 0) {
    return false;
  }
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(beef.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

export function runSqFelaKutiHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Fela HV: isFelaKutiHvOnlyEnsembleWall gate',
      ok: testGateHvOnly(),
    },
    {
      name: 'SQ Fela HV: HV=fela_kuti fires wall + fk:* / effective bars',
      ok: testHvFelaFires(),
    },
    {
      name: 'SQ Fela HV: primary fela_kuti without HV does not fire wall',
      ok: testPrimaryFelaNoHv(),
    },
    {
      name: 'SQ Fela HV: berg/beefheart/badalamenti HV spot-check - zero Fela rewrite',
      ok: testSpotCheckOtherHv(),
    },
  ];
}
