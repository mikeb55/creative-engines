/**
 * Guitar–Bass Duo 8-bar golden path: hard gates for input → score → written MusicXML agreement.
 * No silent harmony fallback when custom mode is requested.
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordSymbolPlan } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordSymbolsEqualForPipelineTruth, extractHarmoniesFromFirstPartXml } from '../export/chordSymbolMusicXml';
import { validateWrittenMusicXmlComplete } from '../export/validateMusicXmlWrittenStrict';
import { resolveEffectiveHarmonyTruth } from '../goldenPath/customLockedHarmonyRouting';
import { validateStrictBarMath } from './strictBarMath';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { isDuoLongFormLockedTruthBarCount } from '../harmony/songFormBarCounts';

/** Matches BUILTIN_CHORD_SYMBOL_PLAN in runGoldenPath (one chord per bar, 8 bars). */
export const DUO_BUILTIN_EIGHT_BARS: readonly string[] = [
  'Dmin9',
  'Dmin9',
  'G13',
  'G13',
  'Cmaj9',
  'Cmaj9',
  'A7alt',
  'A7alt',
];

export interface PipelineTruthGoldenPathOptions {
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  chordProgressionText?: string;
  parsedChordBars?: string[];
}

export type PipelineTruthStageResult = 'pass' | 'fail' | 'skip';

export interface PipelineTruthReport {
  submittedChordString: string | null;
  parsedBars: string[] | null;
  scoreBars: string[] | null;
  writtenXmlBars: string[] | null;
  inputStage: PipelineTruthStageResult;
  scoreStage: PipelineTruthStageResult;
  exportStage: PipelineTruthStageResult;
  errors: string[];
}

export function expandChordSymbolPlanToBars(plan: ChordSymbolPlan): string[] {
  const sorted = [...plan.segments].sort((a, b) => a.startBar - b.startBar);
  const out: string[] = [];
  for (const seg of sorted) {
    for (let i = 0; i < seg.bars; i++) {
      out.push(seg.chord);
    }
  }
  return out;
}

export function resolveHarmonyModeForTruth(options?: PipelineTruthGoldenPathOptions): 'builtin' | 'custom' {
  if (!options) return 'builtin';
  const inferred = !!(options.chordProgressionText?.trim());
  const raw = options.harmonyMode ?? (inferred ? 'custom' : 'builtin');
  /** Locked Song Mode uses the same input/score/XML checks as custom for 8-bar truth. */
  return raw === 'custom_locked' ? 'custom' : raw;
}

export function shouldRunDuoEightBarPipelineTruth(context: CompositionContext): boolean {
  if (!isGuitarBassDuoFamily(context.presetId) || context.form.totalBars !== 8) return false;
  if (context.generationMetadata.chordProgressionParseFailed) return false;
  return true;
}

/** Song Mode / custom_locked 32–64-bar: full input → score → MusicXML chord agreement */
export function shouldRunDuo32LockedPipelineTruth(
  context: CompositionContext,
  options?: PipelineTruthGoldenPathOptions
): boolean {
  const lockedN = context.form.totalBars;
  if (!isGuitarBassDuoFamily(context.presetId) || !isDuoLongFormLockedTruthBarCount(lockedN)) return false;
  if (context.generationMetadata.chordProgressionParseFailed) return false;
  if (context.generationMetadata.harmonySource !== 'custom' || context.generationMetadata.customHarmonyLocked !== true) {
    return false;
  }
  return (options?.parsedChordBars?.length ?? 0) === lockedN;
}

function validateDuo32LockedInputStage(
  context: CompositionContext,
  options?: PipelineTruthGoldenPathOptions
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const lockedN = context.form.totalBars;
  const meta = context.generationMetadata;
  if (meta.builtInHarmonyFallbackOccurred) {
    errors.push(
      `Input truth (${lockedN} locked): builtInHarmonyFallbackOccurred is set — aborting (no silent builtin fallback).`
    );
  }
  const bars = options?.parsedChordBars;
  if (!bars || bars.length !== lockedN) {
    errors.push(`Input truth (${lockedN} locked): requires exactly ${lockedN} parsedChordBars on options.`);
  }
  if (meta.harmonySource !== 'custom') {
    errors.push(`Input truth (${lockedN} locked): harmonySource must be "custom".`);
  }
  if (bars && bars.length === lockedN) {
    const fromPlan = expandChordSymbolPlanToBars(context.chordSymbolPlan);
    if (fromPlan.length !== lockedN) {
      errors.push(
        `Input truth (${lockedN} locked): chord symbol plan expands to ${fromPlan.length} bars, expected ${lockedN}.`
      );
    } else {
      for (let i = 0; i < lockedN; i++) {
        if (!chordSymbolsEqualForPipelineTruth(bars[i] ?? '', fromPlan[i] ?? '')) {
          errors.push(
            `Input truth (${lockedN} locked): bar ${i + 1} parsed "${bars[i]}" does not match chordSymbolPlan "${fromPlan[i]}".`
          );
        }
      }
    }
    const receipt = meta.parsedCustomProgressionBars;
    if (receipt && receipt.length === lockedN) {
      for (let i = 0; i < lockedN; i++) {
        if (normalizeChordToken(receipt[i] ?? '') !== normalizeChordToken(bars[i] ?? '')) {
          errors.push(`Input truth (${lockedN} locked): receipt parsed bar ${i + 1} mismatch vs parsedChordBars.`);
        }
      }
    } else if (meta.harmonySource === 'custom') {
      errors.push(`Input truth (${lockedN} locked): missing parsedCustomProgressionBars[${lockedN}] on receipt.`);
    }
    const locked = context.lockedHarmonyBarsRaw;
    if (!locked || locked.length !== lockedN) {
      errors.push(`Input truth (${lockedN} locked): context.lockedHarmonyBarsRaw must have length ${lockedN}.`);
    } else {
      for (let i = 0; i < lockedN; i++) {
        if (normalizeChordToken(locked[i] ?? '') !== normalizeChordToken(bars[i] ?? '')) {
          errors.push(`Input truth (${lockedN} locked): lockedHarmonyBarsRaw bar ${i + 1} mismatch vs parsedChordBars.`);
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateScoreStage32(score: ScoreModel, expected: string[]): { ok: boolean; errors: string[]; scoreBars: string[] } {
  const errors: string[] = [];
  const lockedN = expected.length;
  const byBar = collectScoreChordsByBarIndex(score);
  const scoreBars: string[] = [];
  for (let b = 1; b <= lockedN; b++) {
    const c = byBar.get(b);
    if (!c) {
      errors.push(`Score truth (${lockedN} locked): missing chord on bar ${b}.`);
      scoreBars.push('');
      continue;
    }
    scoreBars.push(c);
    if (!chordSymbolsEqualForPipelineTruth(c, expected[b - 1] ?? '')) {
      errors.push(`Score truth (${lockedN} locked): bar ${b} chord "${c}" does not match expected "${expected[b - 1]}".`);
    }
  }
  const barMath = validateStrictBarMath(score);
  if (!barMath.valid) {
    errors.push(...barMath.errors.map((e) => `Score truth (${lockedN} locked) (bar math): ${e}`));
  }
  return { ok: errors.length === 0, errors, scoreBars };
}

function barMeterMapFromContext(context: CompositionContext): BarMeterMap | undefined {
  return context.generationMetadata.barMeterMap ?? context.barMeterMap;
}

function validateExportStage32(
  score: ScoreModel,
  xml: string,
  expected: string[],
  barMeterMap?: BarMeterMap
): { ok: boolean; errors: string[]; writtenXmlBars: string[] } {
  const errors: string[] = [];
  const writtenXmlBars: string[] = [];
  const complete = validateWrittenMusicXmlComplete(score, xml, barMeterMap);
  if (!complete.valid) {
    errors.push(...complete.errors.map((e) => `Export truth (${expected.length} locked) (written XML structure): ${e}`));
  }
  const lockedN = expected.length;
  const harmMap = extractHarmoniesFromFirstPartXml(xml);
  for (let b = 1; b <= lockedN; b++) {
    const h = harmMap.get(b);
    if (!h) {
      errors.push(`Export truth (${lockedN} locked): missing <harmony> in first part measure ${b}.`);
      writtenXmlBars.push('');
      continue;
    }
    writtenXmlBars.push(h);
    if (!chordSymbolsEqualForPipelineTruth(h, expected[b - 1] ?? '')) {
      errors.push(
        `Export truth (${lockedN} locked): measure ${b} written harmony "${h}" does not match expected "${expected[b - 1]}".`
      );
    }
  }
  return { ok: errors.length === 0, errors, writtenXmlBars };
}

/**
 * 8-bar style-transfer: score/XML must match post-slice applied harmony (BH effective), not wire import.
 * Mirrors {@link runPipelineTruthGates} duo-32 locked `barryHarrisEffectiveHarmonyBars` branch.
 */
function isEightBarStyleTransferTruthContext(context: CompositionContext): boolean {
  return context.form.totalBars === 8 && context.generationMetadata.styleTransferResult != null;
}

function expectedBarsForEightBarStyleTransferTruth(context: CompositionContext): string[] | undefined {
  const md = context.generationMetadata;
  if (!md.styleTransferResult || context.form.totalBars !== 8) return undefined;

  const applied = md.styleTransferResult.appliedHarmonyBars;
  if (applied.length === 8) {
    return [...applied];
  }

  const bhT = md.barryHarrisEffectiveHarmonyBars;
  if (md.songwriterStyleId === 'barry_harris' && Array.isArray(bhT) && bhT.length === 8) {
    return [...bhT];
  }

  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === 8) {
    return [...locked];
  }

  const parsed = md.parsedCustomProgressionBars;
  if (parsed && parsed.length === 8) {
    return [...parsed];
  }

  return undefined;
}

/**
 * Score/XML expected bars: prefer full-length slice/HV effective truth; fall back to wire/plan.
 * Input-stage checks still validate submitted parse separately (ingest, not post-slice rewrite).
 */
function resolvePipelineExpectedBars(
  context: CompositionContext,
  totalBars: number,
  wireFallback: readonly string[]
): string[] {
  const effective = resolveEffectiveHarmonyTruth(context.generationMetadata, {
    totalBars,
    expectedLength: totalBars,
    harmonyContext: context.harmonyContext,
  });
  if (effective && effective.length === totalBars) {
    return effective;
  }
  return [...wireFallback];
}

function expectedBarsForTruth(
  context: CompositionContext,
  options?: PipelineTruthGoldenPathOptions
): string[] {
  const styleTransferExpected = expectedBarsForEightBarStyleTransferTruth(context);
  if (styleTransferExpected) {
    return styleTransferExpected;
  }

  const hm = resolveHarmonyModeForTruth(options);
  if (hm === 'custom') {
    const bars = options?.parsedChordBars;
    if (!bars || bars.length !== 8) {
      throw new Error('PIPELINE_TRUTH: custom harmony requires exactly 8 parsedChordBars.');
    }
    return resolvePipelineExpectedBars(context, 8, bars);
  }
  return resolvePipelineExpectedBars(context, 8, DUO_BUILTIN_EIGHT_BARS);
}

function collectScoreChordsByBarIndex(score: ScoreModel): Map<number, string> {
  const map = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord && !map.has(m.index)) {
        map.set(m.index, m.chord);
      }
    }
  }
  return map;
}

function extractRehearsalMarksFromFirstPartXml(xml: string): Map<number, string> {
  const parts = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/g) ?? [];
  const firstPart = parts[0];
  if (!firstPart) return new Map();
  const measures = firstPart.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
  const map = new Map<number, string>();
  for (const mb of measures) {
    const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
    const num = numMatch ? parseInt(numMatch[1], 10) : -1;
    /** Exporter uses `<rehearsal enclosure="rectangle">…` — attributes must be allowed. */
    const rm = mb.match(/<rehearsal[^>]*>([^<]*)<\/rehearsal>/);
    if (rm && num >= 1) {
      map.set(num, rm[1].trim());
    }
  }
  return map;
}

function validateInputStage(
  context: CompositionContext,
  options?: PipelineTruthGoldenPathOptions
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const meta = context.generationMetadata;

  if (meta.builtInHarmonyFallbackOccurred) {
    errors.push('Input truth: builtInHarmonyFallbackOccurred is set — aborting (no silent builtin fallback).');
  }

  /** Style-transfer: wire import ≠ post-slice applied bars — harmonyDelta receipt only (non-blocking). */
  if (isEightBarStyleTransferTruthContext(context)) {
    return { ok: errors.length === 0, errors };
  }

  const hm = resolveHarmonyModeForTruth(options);

  if (hm === 'custom') {
    const bars = options?.parsedChordBars;
    if (!bars || bars.length !== 8) {
      errors.push('Input truth: custom mode requires exactly 8 parsed chord bars.');
    }
    if (meta.harmonySource !== 'custom') {
      errors.push(
        'Input truth: custom harmony was requested but composition context harmonySource is not "custom" (no fallback allowed).'
      );
    }
    const raw = options?.chordProgressionText?.trim();
    if (!raw) {
      errors.push('Input truth: custom mode requires non-empty chordProgressionText on the wire.');
    }
    if (bars && bars.length === 8) {
      const fromPlan = expandChordSymbolPlanToBars(context.chordSymbolPlan);
      if (fromPlan.length !== 8) {
        errors.push(`Input truth: chord symbol plan expands to ${fromPlan.length} bars, expected 8.`);
      } else {
        for (let i = 0; i < 8; i++) {
          if (!chordSymbolsEqualForPipelineTruth(bars[i] ?? '', fromPlan[i] ?? '')) {
            errors.push(
              `Input truth: bar ${i + 1} parsed "${bars[i]}" does not match chordSymbolPlan "${fromPlan[i]}".`
            );
          }
        }
      }
      const receipt = meta.parsedCustomProgressionBars;
      if (receipt && receipt.length === 8) {
        for (let i = 0; i < 8; i++) {
          if (normalizeChordToken(receipt[i] ?? '') !== normalizeChordToken(bars[i] ?? '')) {
            errors.push(`Input truth: receipt parsed bar ${i + 1} mismatch vs parsedChordBars.`);
          }
        }
      } else if (meta.harmonySource === 'custom') {
        errors.push('Input truth: custom harmony missing parsedCustomProgressionBars[8] on receipt.');
      }
    }
  } else {
    if (meta.harmonySource !== 'builtin') {
      errors.push('Input truth: builtin harmony mode but harmonySource is not "builtin".');
    }
    const fromPlan = expandChordSymbolPlanToBars(context.chordSymbolPlan);
    if (fromPlan.length !== 8) {
      errors.push(`Input truth: builtin plan must expand to 8 bars (got ${fromPlan.length}).`);
    } else {
      for (let i = 0; i < 8; i++) {
        if (!chordSymbolsEqualForPipelineTruth(DUO_BUILTIN_EIGHT_BARS[i] ?? '', fromPlan[i] ?? '')) {
          errors.push(`Input truth: builtin bar ${i + 1} plan mismatch vs canonical duo cycle.`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Run before score generation to fail fast on custom/builtin invariants (no wasted work when invalid). */
export function assertDuoEightBarInputTruthEarly(
  context: CompositionContext,
  options?: PipelineTruthGoldenPathOptions
): string[] {
  if (!shouldRunDuoEightBarPipelineTruth(context)) return [];
  return validateInputStage(context, options).errors;
}

function validateScoreStage(
  score: ScoreModel,
  expected: string[],
  opts?: { skipBarMath?: boolean }
): { ok: boolean; errors: string[]; scoreBars: string[] } {
  const errors: string[] = [];
  const byBar = collectScoreChordsByBarIndex(score);
  const scoreBars: string[] = [];
  for (let b = 1; b <= 8; b++) {
    const c = byBar.get(b);
    if (!c) {
      errors.push(`Score truth: missing chord on bar ${b}.`);
      scoreBars.push('');
      continue;
    }
    scoreBars.push(c);
    if (!chordSymbolsEqualForPipelineTruth(c, expected[b - 1] ?? '')) {
      errors.push(
        `Score truth: bar ${b} chord "${c}" does not match expected "${expected[b - 1]}".`
      );
    }
  }

  if (!opts?.skipBarMath) {
    const barMath = validateStrictBarMath(score);
    if (!barMath.valid) {
      errors.push(...barMath.errors.map((e) => `Score truth (bar math): ${e}`));
    }
  }

  return { ok: errors.length === 0, errors, scoreBars };
}

function validateExportStage(
  score: ScoreModel,
  xml: string,
  expected: string[],
  barMeterMap?: BarMeterMap
): { ok: boolean; errors: string[]; writtenXmlBars: string[] } {
  const errors: string[] = [];
  const writtenXmlBars: string[] = [];

  const complete = validateWrittenMusicXmlComplete(score, xml, barMeterMap);
  if (!complete.valid) {
    errors.push(...complete.errors.map((e) => `Export truth (written XML structure): ${e}`));
  }

  const harmMap = extractHarmoniesFromFirstPartXml(xml);
  for (let b = 1; b <= 8; b++) {
    const h = harmMap.get(b);
    if (!h) {
      errors.push(`Export truth: missing <harmony> in first part measure ${b}.`);
      writtenXmlBars.push('');
      continue;
    }
    writtenXmlBars.push(h);
    if (!chordSymbolsEqualForPipelineTruth(h, expected[b - 1] ?? '')) {
      errors.push(
        `Export truth: measure ${b} written harmony "${h}" does not match expected "${expected[b - 1]}".`
      );
    }
  }

  const maxMeasure = Math.max(0, ...[...harmMap.keys()]);
  if (harmMap.size > 0 && maxMeasure < 8) {
    errors.push(`Export truth: expected measures 1–8 with harmony; found max measure ${maxMeasure}.`);
  }

  const rehearsal = extractRehearsalMarksFromFirstPartXml(xml);
  if (rehearsal.get(1) !== 'A') {
    errors.push(`Export truth: rehearsal mark on bar 1 must be "A" (got ${JSON.stringify(rehearsal.get(1))}).`);
  }
  if (rehearsal.get(5) !== 'B') {
    errors.push(`Export truth: rehearsal mark on bar 5 must be "B" (got ${JSON.stringify(rehearsal.get(5))}).`);
  }

  return { ok: errors.length === 0, errors, writtenXmlBars };
}

export function logPipelineTruthReport(report: PipelineTruthReport): void {
  const sub = report.submittedChordString ?? '—';
  const p = report.parsedBars?.join('|') ?? '—';
  const s = report.scoreBars?.join('|') ?? '—';
  const x = report.writtenXmlBars?.join('|') ?? '—';
  console.log(
    `[pipeline-truth] input=${report.inputStage} score=${report.scoreStage} export=${report.exportStage} submitted=${sub} parsed=${p} score=${s} xml=${x}`
  );
}

export function runPipelineTruthGates(params: {
  context: CompositionContext;
  options?: PipelineTruthGoldenPathOptions;
  score: ScoreModel;
  xml: string | undefined;
}): PipelineTruthReport {
  const { context, options, score, xml } = params;

  const submitted = options?.chordProgressionText?.trim() ?? null;
  const parsed8 = options?.parsedChordBars?.length === 8 ? [...options.parsedChordBars!] : null;
  const lockedTruthN = context.form.totalBars;
  const parsedLocked =
    isDuoLongFormLockedTruthBarCount(lockedTruthN) && options?.parsedChordBars?.length === lockedTruthN
      ? [...options.parsedChordBars!]
      : null;

  if (shouldRunDuo32LockedPipelineTruth(context, options)) {
    const barMeter = barMeterMapFromContext(context);
    const lockedN = lockedTruthN;
    const parsedBars = parsedLocked ?? [];
    const inputResult = validateDuo32LockedInputStage(context, options);
    const inputStage: PipelineTruthStageResult = inputResult.ok ? 'pass' : 'fail';
    /** Score/XML: slice/HV effective via shared registry; fall back to locked/parsed wire. */
    const lockedWire =
      Array.isArray(context.lockedHarmonyBarsRaw) && context.lockedHarmonyBarsRaw.length === lockedN
        ? context.lockedHarmonyBarsRaw
        : parsedBars;
    const expected = resolvePipelineExpectedBars(context, lockedN, lockedWire);
    const scoreResult = validateScoreStage32(score, expected);
    const scoreStage: PipelineTruthStageResult = scoreResult.ok ? 'pass' : 'fail';
    let exportStage: PipelineTruthStageResult = 'fail';
    let writtenXmlBars: string[] | null = null;
    const exportErrors: string[] = [];
    if (!xml) {
      exportErrors.push(`Export truth (${lockedN} locked): no MusicXML string to verify.`);
    } else {
      const ex = validateExportStage32(score, xml, expected, barMeter);
      writtenXmlBars = ex.writtenXmlBars;
      exportErrors.push(...ex.errors);
      exportStage = ex.ok ? 'pass' : 'fail';
    }
    const errors = [...inputResult.errors, ...scoreResult.errors, ...exportErrors];
    const report: PipelineTruthReport = {
      submittedChordString: submitted,
      parsedBars: parsedBars,
      scoreBars: scoreResult.scoreBars,
      writtenXmlBars,
      inputStage,
      scoreStage,
      exportStage,
      errors,
    };
    const quiet =
      typeof process !== 'undefined' &&
      (process.env?.COMPOSER_OS_PIPELINE_TRUTH === '0' || process.env?.COMPOSER_OS_PIPELINE_TRUTH === 'quiet');
    if (!quiet && report.inputStage !== 'skip') {
      logPipelineTruthReport(report);
    }
    return report;
  }

  const parsed = parsed8;

  if (!shouldRunDuoEightBarPipelineTruth(context)) {
    return {
      submittedChordString: submitted,
      parsedBars: parsed,
      scoreBars: null,
      writtenXmlBars: null,
      inputStage: 'skip',
      scoreStage: 'skip',
      exportStage: 'skip',
      errors: [],
    };
  }

  let expected: string[];
  try {
    expected = expectedBarsForTruth(context, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      submittedChordString: submitted,
      parsedBars: parsed,
      scoreBars: null,
      writtenXmlBars: null,
      inputStage: 'fail',
      scoreStage: 'skip',
      exportStage: 'skip',
      errors: [msg],
    };
  }

  const inputResult = validateInputStage(context, options);
  const inputStage: PipelineTruthStageResult = inputResult.ok ? 'pass' : 'fail';

  const barMeter = barMeterMapFromContext(context);

  const scoreResult = validateScoreStage(score, expected, {
    skipBarMath: isEightBarStyleTransferTruthContext(context),
  });
  const scoreStage: PipelineTruthStageResult = scoreResult.ok ? 'pass' : 'fail';

  let exportStage: PipelineTruthStageResult = 'fail';
  let writtenXmlBars: string[] | null = null;
  const exportErrors: string[] = [];
  if (!xml) {
    exportErrors.push('Export truth: no MusicXML string to verify.');
  } else {
    const ex = validateExportStage(score, xml, expected, barMeter);
    writtenXmlBars = ex.writtenXmlBars;
    exportErrors.push(...ex.errors);
    exportStage = ex.ok ? 'pass' : 'fail';
  }

  const errors = [...inputResult.errors, ...scoreResult.errors, ...exportErrors];

  const report: PipelineTruthReport = {
    submittedChordString: submitted,
    parsedBars: parsed,
    scoreBars: scoreResult.scoreBars,
    writtenXmlBars,
    inputStage,
    scoreStage,
    exportStage,
    errors,
  };

  /** One compact line per golden-path attempt when gates apply; set COMPOSER_OS_PIPELINE_TRUTH=0|quiet to disable. */
  const quiet =
    typeof process !== 'undefined' &&
    (process.env?.COMPOSER_OS_PIPELINE_TRUTH === '0' || process.env?.COMPOSER_OS_PIPELINE_TRUTH === 'quiet');
  if (!quiet && report.inputStage !== 'skip') {
    logPipelineTruthReport(report);
  }

  return report;
}

export function pipelineTruthAllPassed(report: PipelineTruthReport): boolean {
  if (report.inputStage === 'skip') return true;
  return report.inputStage === 'pass' && report.scoreStage === 'pass' && report.exportStage === 'pass';
}
