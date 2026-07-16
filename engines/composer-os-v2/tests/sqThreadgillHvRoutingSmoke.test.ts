/**
 * Phase 2 widen - SQ Henry Threadgill HV-only non-mosaic harmony bridge.
 *
 * - HV=henry_threadgill: precompute fires, henryThreadgillDeviceReceipts / effective bars on meta
 * - Primary henry_threadgill without HV: wall does NOT fire
 * - Unwired HV (badalamenti): chord parity with baseline
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { isHenryThreadgillHvOnlyEnsembleWall } from '../core/song-mode/henryThreadgillSlice';

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function thrReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & { henryThreadgillDeviceReceipts?: string[] })
    | undefined;
  return meta?.henryThreadgillDeviceReceipts ?? [];
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
    seed: opts.seed ?? 96092,
    title: 'SQ Threadgill HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function testGateHvOnly(): boolean {
  return (
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'henry_threadgill',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: undefined,
      songwriterStyleId: 'henry_threadgill',
    }) === false &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'henry_threadgill',
      songwriterStyleId: 'frank_zappa',
    }) === false
  );
}

function testHvThreadgillFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'henry_threadgill' });
  if (!r.score) return false;
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & {
        henryThreadgillEffectiveHarmonyBars?: string[];
        henryThreadgillDeviceReceipts?: string[];
      })
    | undefined;
  const bars = meta?.henryThreadgillEffectiveHarmonyBars ?? [];
  const receipts = thrReceipts(r);
  return (
    meta?.harmonicVoice === 'henry_threadgill' &&
    bars.length === 16 &&
    receipts.some((x) => x.startsWith('ht:'))
  );
}

function testPrimaryThreadgillNoHv(): boolean {
  const r = realise({ primary: 'henry_threadgill' });
  return thrReceipts(r).length === 0;
}

function testSpotCheckOtherHv(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const fela = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if (
    thrReceipts(berg).length !== 0 ||
    thrReceipts(beef).length !== 0 ||
    thrReceipts(fela).length !== 0 ||
    thrReceipts(badalamenti).length !== 0
  ) {
    return false;
  }
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(beef.score).length > 0 &&
    scoreChords(fela.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

export function runSqThreadgillHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Threadgill HV: isHenryThreadgillHvOnlyEnsembleWall gate',
      ok: testGateHvOnly(),
    },
    {
      name: 'SQ Threadgill HV: HV=henry_threadgill fires wall + ht:* / effective bars',
      ok: testHvThreadgillFires(),
    },
    {
      name: 'SQ Threadgill HV: primary henry_threadgill without HV does not fire wall',
      ok: testPrimaryThreadgillNoHv(),
    },
    {
      name: 'SQ Threadgill HV: berg/beefheart/fela/badalamenti HV spot-check - zero Threadgill rewrite',
      ok: testSpotCheckOtherHv(),
    },
  ];
}
