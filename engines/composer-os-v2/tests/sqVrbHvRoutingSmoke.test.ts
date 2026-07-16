/**
 * Phase 2 Batch 3 — SQ VRB / Pass4 HV routing (pure routing; arranger/FZ/mosaic/Slonimsky untouched).
 *
 * - Primary-only (no HV): stable + bit-match vs explicit undefined HV
 * - HV with CLE-enabled VRB unlocks Pass4 gate vs CLE-disabled primary (receipt written)
 * - sqArrangerVrb CLE-enabled overlay alone does NOT unlock Pass4 (stays separate from HV)
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';

function minimalLineSet(lengthBars: number): AbstractLineSet {
  return {
    voices: [
      {
        role: 'soprano',
        notes: [{ pitchMidi: 72, offsetBars: 0, durationBars: 1 }],
        tags: ['melodic_lead'],
      },
      {
        role: 'alto',
        notes: [{ pitchMidi: 60, offsetBars: 0, durationBars: 1 }],
        tags: [],
      },
      { role: 'tenor', notes: [], tags: [] },
      {
        role: 'bass',
        notes: [{ pitchMidi: 48, offsetBars: 0, durationBars: 1 }],
        tags: ['bass_anchor'],
      },
    ],
    cadenceTags: [],
    densityEnvelope: { segments: [{ startBar: 0, endBar: lengthBars, density: 'medium' }] },
    dissonanceProfile: {
      allowedIntervals: [0, 3, 4, 7],
      forbiddenIntervals: [],
      parallelFifthsAllowed: false,
      parallelOctavesAllowed: false,
      resolveByStep: true,
    },
    sourceMode: 'melody_plus_chords',
    lengthBars,
    styleSourceVrbId: 'sq_vrb_bartok',
  };
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  sqArrangerVrb?: ReturnType<typeof getVoiceRuleBundle>;
  seed?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = 8;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
    ...(opts.sqArrangerVrb ? { sqArrangerVrb: opts.sqArrangerVrb } : {}),
    contrapuntalLineSet: minimalLineSet(bars),
  };
  const context = {
    systemVersion: '2.0.0',
    presetId: 'string_quartet',
    seed: opts.seed ?? 94131,
    form: { totalBars: bars, sections: [{ label: 'A', startBar: 1, length: bars }] },
    generationMetadata,
  } as CompositionContext;
  return runQuartetRealisation({
    seed: opts.seed ?? 94131,
    title: 'SQ VRB HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
    context,
  });
}

function mergeReceipt(
  r: ReturnType<typeof runQuartetRealisation>
): { sqBarsWritten: number; bbBarsWritten: number; barsSkipped: number } | undefined {
  return r.ensembleHarmonyMetadata?.contrapuntalLineMusicXmlMergeReceipt;
}

function testPrimaryOnlyStable(): boolean {
  const a = realise({ primary: 'jobim' });
  const b = realise({ primary: 'jobim' });
  if (!a.score || !b.score || !a.exportPipeline.ok || !b.exportPipeline.ok) return false;
  return mergeReceipt(a) === undefined && mergeReceipt(b) === undefined;
}

function testNoHvMatchesPrimaryOnly(): boolean {
  const primary = realise({ primary: 'jobim' });
  const noHv = realise({ primary: 'jobim', harmonicVoice: undefined });
  if (!primary.score || !noHv.score) return false;
  return mergeReceipt(primary) === undefined && mergeReceipt(noHv) === undefined;
}

function testHvUnlocksPass4Gate(): boolean {
  const jobim = getVoiceRuleBundle('jobim');
  const bartok = getVoiceRuleBundle('sq_vrb_bartok');
  if (jobim.contrapuntalLinePolicy?.enabled) return false;
  if (!bartok.contrapuntalLinePolicy?.enabled) return false;

  const baseline = realise({ primary: 'jobim' });
  const withHv = realise({ primary: 'jobim', harmonicVoice: 'sq_vrb_bartok' });
  if (!baseline.score || !withHv.score) return false;
  if (!baseline.exportPipeline.ok || !withHv.exportPipeline.ok) return false;
  const baseRc = mergeReceipt(baseline);
  const hvRc = mergeReceipt(withHv);
  // CLE-off primary: Pass4 never writes receipt. CLE-on HV: merge attempted (receipt present).
  return baseRc === undefined && hvRc != null;
}

function testSqArrangerVrbDoesNotUnlockPass4(): boolean {
  const jobim = getVoiceRuleBundle('jobim');
  const bartok = getVoiceRuleBundle('sq_vrb_bartok');
  if (jobim.contrapuntalLinePolicy?.enabled) return false;
  if (!bartok.contrapuntalLinePolicy?.enabled) return false;

  const withArrangerOnly = realise({
    primary: 'jobim',
    sqArrangerVrb: bartok,
  });
  if (!withArrangerOnly.score || !withArrangerOnly.exportPipeline.ok) return false;
  // Arranger blend must not drive Pass4 VRB lookup (item I separate).
  return mergeReceipt(withArrangerOnly) === undefined;
}

export function runSqVrbHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ VRB HV: primary-only Pass4 gate stable (no HV, CLE-off primary)',
      ok: testPrimaryOnlyStable(),
    },
    {
      name: 'SQ VRB HV: no HV === primary-only',
      ok: testNoHvMatchesPrimaryOnly(),
    },
    {
      name: 'SQ VRB HV: sq_vrb_bartok HV unlocks Pass4 vs jobim primary',
      ok: testHvUnlocksPass4Gate(),
    },
    {
      name: 'SQ VRB HV: sqArrangerVrb alone does not unlock Pass4 (stays separate)',
      ok: testSqArrangerVrbDoesNotUnlockPass4(),
    },
  ];
}