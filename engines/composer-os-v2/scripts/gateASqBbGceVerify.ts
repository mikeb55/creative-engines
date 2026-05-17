/**
 * Phase A Gate — SQ→BB GCE quality gates (unit-testable invariants).
 * Run: npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildDuoLongFormCompositionContext } from '../core/form/buildLongFormFromDuoSections';
import { attachVoiceRuleBundleAndHarmonicScenes } from '../core/composer/attachVoiceRuleBundle';
import { precomputeContrapuntalLines } from '../core/counterpoint/precomputeContrapuntalLines';
import { extractQuartetFeatures } from '../core/counterpoint/extractQuartetFeatures';
import {
  quantizePhrasesForOrchestration,
  verifyQuantizedPhraseSpans,
} from '../core/counterpoint/quantizePhrasesForOrchestration';
import { wireBigBandSectionRendererOnContext } from '../core/composer/bigBandSectionPlanRenderer';
import {
  SQ_BB_GCE_GATE1_CATEGORY_MIN,
  SQ_BB_GCE_GATE2_OVERALL_REVIEW_MIN,
  SQ_BB_HIERARCHY_CLARITY_HARD_FAIL,
  abstractLineSetPrimaryMelodicLine,
  dcrRefineAbstractLineSetForSqGate,
  runSqBbGceGate1,
  runSqBbGceGate2,
  scoreModelFromSqBbSectionRender,
  scoreSqBbGate1Categories,
  scoreSqBbMelodicPillarsRaw,
  shouldApplySqToBbGceGates,
} from '../core/counterpoint/sqToBbGceGates';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { computeArrangementHierarchyClarityBigBand } from '../core/gce/gceAutoScorers';
import { BEATS_PER_MEASURE } from '../core/score-model/scoreModelTypes';
import type { MeasureModel, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { createNote } from '../core/score-model/scoreEventBuilder';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function minimalContext(vrbId: string): CompositionContext {
  return {
    seed: 42,
    presetId: 'guitar_bass_duo',
    form: { totalBars: 8, sections: [{ label: 'a', startBar: 1, length: 8 }] },
    voiceBundle: getVoiceRuleBundle(vrbId),
    generationMetadata: { songwriterStyleId: vrbId },
  } as CompositionContext;
}

function syntheticGate1PassLines(): AbstractLineSet {
  const sopranoNotes: AbstractLineSet['voices'][0]['notes'] = [
    { pitchMidi: 67, durationBars: 0.18, offsetBars: 0 },
    { pitchMidi: 69, durationBars: 0.18, offsetBars: 0.2 },
    { pitchMidi: 71, durationBars: 0.22, offsetBars: 0.4 },
    { pitchMidi: 72, durationBars: 0.18, offsetBars: 1.02 },
    { pitchMidi: 74, durationBars: 0.18, offsetBars: 1.22 },
    { pitchMidi: 76, durationBars: 0.22, offsetBars: 1.42 },
    { pitchMidi: 75, durationBars: 0.18, offsetBars: 2.04 },
    { pitchMidi: 73, durationBars: 0.18, offsetBars: 2.24 },
    { pitchMidi: 71, durationBars: 0.22, offsetBars: 2.44 },
    { pitchMidi: 69, durationBars: 0.18, offsetBars: 3.06 },
    { pitchMidi: 67, durationBars: 0.5, offsetBars: 3.26 },
  ];
  const whole = (pitchMidi: number) => ({ pitchMidi, durationBars: 4, offsetBars: 0 });
  return {
    voices: [
      { role: 'soprano', notes: sopranoNotes, tags: ['melodic_lead'] },
      { role: 'alto', notes: [whole(67)], tags: ['harmonic_fill'] },
      { role: 'tenor', notes: [whole(64)], tags: ['harmonic_fill'] },
      { role: 'bass', notes: [whole(48)], tags: ['bass_anchor'] },
    ],
    cadenceTags: [],
    densityEnvelope: { segments: [{ startBar: 0, endBar: 4, density: 'sparse' }] },
    dissonanceProfile: {
      allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      forbiddenIntervals: [],
      parallelFifthsAllowed: false,
      parallelOctavesAllowed: false,
      resolveByStep: true,
    },
    sourceMode: 'chords_only',
    lengthBars: 4,
    styleSourceVrbId: 'bob_brookmeyer',
  };
}

function syntheticChoraleLines(): AbstractLineSet {
  const whole = (pitchMidi: number) => ({ pitchMidi, durationBars: 4, offsetBars: 0 });
  return {
    voices: [
      { role: 'soprano', notes: [whole(72)], tags: ['harmonic_fill'] },
      { role: 'alto', notes: [whole(67)], tags: ['harmonic_fill'] },
      { role: 'tenor', notes: [whole(64)], tags: ['harmonic_fill'] },
      { role: 'bass', notes: [whole(48)], tags: ['bass_anchor'] },
    ],
    cadenceTags: [],
    densityEnvelope: { segments: [{ startBar: 0, endBar: 4, density: 'sparse' }] },
    dissonanceProfile: {
      allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      forbiddenIntervals: [],
      parallelFifthsAllowed: false,
      parallelOctavesAllowed: false,
      resolveByStep: true,
    },
    sourceMode: 'chords_only',
    lengthBars: 4,
    styleSourceVrbId: 'bob_brookmeyer',
  };
}

function linesFailMelodicOnly(): AbstractLineSet {
  const base = syntheticGate1PassLines();
  return {
    ...base,
    voices: base.voices.map((v) => {
      if (v.role !== 'soprano') return v;
      return {
        ...v,
        notes: v.notes.map((n, i) => ({
          ...n,
          pitchMidi: i === 1 ? n.pitchMidi + 16 : n.pitchMidi,
        })),
      };
    }),
  };
}

function flatHierarchyBbScore(barCount: number): ScoreModel {
  const specs = [
    { id: 'bb_alto_sax', name: 'Alto', instrumentIdentity: 'alto_sax', midiProgram: 65, clef: 'treble' as const },
    { id: 'bb_tenor_sax', name: 'Tenor', instrumentIdentity: 'tenor_sax', midiProgram: 66, clef: 'treble' as const },
    { id: 'bb_trumpets', name: 'Tpt', instrumentIdentity: 'trumpet', midiProgram: 56, clef: 'treble' as const },
    { id: 'bb_trombones', name: 'Tbn', instrumentIdentity: 'trombone', midiProgram: 57, clef: 'bass' as const },
    { id: 'bb_piano', name: 'Pno', instrumentIdentity: 'piano', midiProgram: 0, clef: 'treble' as const },
  ];
  const parts: PartModel[] = specs.map((spec) => {
    const measures: MeasureModel[] = [];
    for (let b = 1; b <= barCount; b++) {
      measures.push({
        index: b,
        events: [createNote(60 + (b % 3), 0, BEATS_PER_MEASURE, 1)],
      });
    }
    return { ...spec, measures };
  });
  return { title: 'flat hierarchy fixture', parts };
}

function checkGate1Pass(): boolean {
  const ctx = minimalContext('bob_brookmeyer');
  const lines = syntheticGate1PassLines();
  const { record } = runSqBbGceGate1(lines, ctx);
  return record.outcome === 'pass' && record.proceedToRenderer;
}

function checkGate1RetryPass(): boolean {
  const ctx = minimalContext('bob_brookmeyer');
  const lines = linesFailMelodicOnly();
  const before = scoreSqBbGate1Categories(lines);
  const failsFirst = !(
    before.melodicIdentity >= SQ_BB_GCE_GATE1_CATEGORY_MIN &&
    before.phraseGrammar >= SQ_BB_GCE_GATE1_CATEGORY_MIN
  );
  const refined = dcrRefineAbstractLineSetForSqGate(lines);
  const after = scoreSqBbGate1Categories(refined);
  const passesAfter =
    after.melodicIdentity >= SQ_BB_GCE_GATE1_CATEGORY_MIN &&
    after.phraseGrammar >= SQ_BB_GCE_GATE1_CATEGORY_MIN;
  const { record } = runSqBbGceGate1(lines, ctx);
  return (
    failsFirst &&
    before.phraseGrammar >= SQ_BB_GCE_GATE1_CATEGORY_MIN &&
    passesAfter &&
    record.outcome === 'retry_pass'
  );
}

function checkGate1RetryFail(): boolean {
  const ctx = minimalContext('bob_brookmeyer');
  const lines: AbstractLineSet = {
    ...syntheticChoraleLines(),
    voices: [
      {
        role: 'soprano',
        notes: [{ pitchMidi: 60, durationBars: 4, offsetBars: 0 }],
        tags: ['melodic_lead'],
      },
      ...syntheticChoraleLines().voices.filter((v) => v.role !== 'soprano'),
    ],
  };
  const { record } = runSqBbGceGate1(lines, ctx);
  return record.outcome === 'fail' && !record.proceedToRenderer;
}

function flatBalancedSectionRender(barCount: number) {
  const sections = ['saxes', 'trumpets', 'trombones', 'rhythm', 'mixed_reeds_brass'] as const;
  const notes: Array<{
    section: (typeof sections)[number];
    role: 'pad';
    pitchMidi: number;
    startBeat: number;
    durationBeats: number;
    lineDerived: boolean;
  }> = [];
  for (let b = 0; b < barCount; b++) {
    for (let i = 0; i < sections.length; i++) {
      notes.push({
        section: sections[i]!,
        role: 'pad',
        pitchMidi: 60 + i,
        startBeat: b,
        durationBeats: 1,
        lineDerived: true,
      });
    }
  }
  return {
    phrases: [
      {
        phraseId: 'flat-hierarchy',
        startBeat: 0,
        endBeat: barCount,
        soliDurationsBeats: [1],
        backgroundsRhythm: 'half' as const,
        geometryShape: 'spread' as const,
        assignments: [],
        notes,
      },
    ],
  };
}

function checkGate2HardFail(): boolean {
  const flat = flatHierarchyBbScore(8);
  const h = computeArrangementHierarchyClarityBigBand(flat);
  if (h >= SQ_BB_HIERARCHY_CLARITY_HARD_FAIL) return false;

  const ctx = minimalContext('bob_brookmeyer');
  const lines = syntheticGate1PassLines();
  const flatRender = flatBalancedSectionRender(lines.lengthBars);
  const flatStub = scoreModelFromSqBbSectionRender(flatRender, lines.lengthBars);
  const flatH = computeArrangementHierarchyClarityBigBand(flatStub);
  if (flatH >= SQ_BB_HIERARCHY_CLARITY_HARD_FAIL) return false;

  const gate2 = runSqBbGceGate2(
    {
      format: 'big_band',
      sectionLeaders: ['lead_trumpet_or_lead_alto'],
      sectionRender: flatRender,
    },
    lines,
    ctx,
  );
  return gate2.outcome === 'fail' && gate2.hardFail;
}

function checkNonSqUnaffected(): boolean {
  const ctxSq = minimalContext('bob_brookmeyer');
  const ctxNon = minimalContext('gil_evans');
  ctxNon.voiceBundle = getVoiceRuleBundle('gil_evans');
  return (
    shouldApplySqToBbGceGates(ctxSq, 'bob_brookmeyer') &&
    !shouldApplySqToBbGceGates(ctxNon, 'gil_evans')
  );
}

const SQ_BB_BARTOK_MI_RAW_MIN = 6.5;
const SQ_BB_BARTOK_PG_RAW_MIN = 6.0;

function checkBartok50021MiPgRawAndGate2Pass(): boolean {
  const seed = 50021;
  const vrbId = 'bartok';
  const { context } = buildDuoLongFormCompositionContext(seed, {
    targetTotalBars: 32,
    presetId: 'guitar_bass_duo',
  });
  context.generationMetadata = {
    ...context.generationMetadata,
    songwriterStyleId: vrbId,
    harmonyModeRequested: 'builtin',
  };
  attachVoiceRuleBundleAndHarmonicScenes(context, { harmonicVoice: vrbId }, { skipHarmonicSceneLog: true });
  const lines = precomputeContrapuntalLines(context, vrbId);
  if (!lines) return false;

  const soprano = abstractLineSetPrimaryMelodicLine(lines);
  const gate1Raw = scoreSqBbMelodicPillarsRaw(soprano, lines, context, vrbId);
  if (
    gate1Raw.melodicIdentity < SQ_BB_BARTOK_MI_RAW_MIN ||
    gate1Raw.phraseGrammar < SQ_BB_BARTOK_PG_RAW_MIN
  ) {
    return false;
  }

  const wired = wireBigBandSectionRendererOnContext(context);
  if (!wired?.sectionRender) return false;

  const gate2 = (
    context.generationMetadata as { sqBbGceGate2?: { outcome: string; overallGce: number } }
  ).sqBbGceGate2;
  if (
    !gate2 ||
    gate2.outcome !== 'pass' ||
    gate2.overallGce < SQ_BB_GCE_GATE2_OVERALL_REVIEW_MIN
  ) {
    return false;
  }

  const barCount = Math.max(1, Math.ceil(lines.lengthBars));
  const score = scoreModelFromSqBbSectionRender(wired.sectionRender, barCount);
  const bbMelody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const gate2Raw = scoreSqBbMelodicPillarsRaw(
    bbMelody,
    lines,
    context,
    vrbId,
    wired.quartetFeatures,
  );
  return (
    gate2Raw.melodicIdentity >= SQ_BB_BARTOK_MI_RAW_MIN &&
    gate2Raw.phraseGrammar >= SQ_BB_BARTOK_PG_RAW_MIN
  );
}

function checkPhraseQuantizerInvariants(): boolean {
  const seed = 50021;
  const vrbId = 'bartok';
  const { context } = buildDuoLongFormCompositionContext(seed, {
    targetTotalBars: 32,
    presetId: 'guitar_bass_duo',
  });
  context.generationMetadata = {
    ...context.generationMetadata,
    songwriterStyleId: vrbId,
    harmonyModeRequested: 'builtin',
  };
  attachVoiceRuleBundleAndHarmonicScenes(context, { harmonicVoice: vrbId }, { skipHarmonicSceneLog: true });
  const lines = precomputeContrapuntalLines(context, vrbId);
  if (!lines) return false;
  const raw = extractQuartetFeatures(lines);
  const meso = quantizePhrasesForOrchestration(lines, raw);
  const v = verifyQuantizedPhraseSpans(lines, raw, meso);
  return v.ok && meso.length <= raw.length && meso.length >= 4;
}

function checkSystemSmoke(): boolean {
  try {
    const out = execSync('npm run test:composer-smoke', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return /Passed:\s*248/.test(out) && /Failed:\s*0/.test(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return /Passed:\s*248/.test(msg) && /Failed:\s*0/.test(msg);
  }
}

function main(): void {
  const checks: Array<{ name: string; ok: boolean }> = [
    { name: 'GATE1_PASS', ok: checkGate1Pass() },
    { name: 'GATE1_RETRY_PASS', ok: checkGate1RetryPass() },
    { name: 'GATE1_RETRY_FAIL', ok: checkGate1RetryFail() },
    { name: 'GATE2_HARD_FAIL', ok: checkGate2HardFail() },
    { name: 'NON_SQ_POLICY', ok: checkNonSqUnaffected() },
    { name: 'PHRASE_QUANTIZER', ok: checkPhraseQuantizerInvariants() },
    { name: 'BARTOK_50021_MI_PG_RAW_GATE2', ok: checkBartok50021MiPgRawAndGate2Pass() },
    { name: 'SYSTEM', ok: checkSystemSmoke() },
  ];
  let bad = 0;
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}: ${c.name}`);
    if (!c.ok) bad++;
  }
  if (bad > 0) {
    process.exit(1);
  }
  console.log('Gate A SQ→BB GCE: all checks passed');
}

main();
