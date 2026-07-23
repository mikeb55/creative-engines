/**
 * Formal GCE core — Tom Verlaine GBD writer (harmonicVoice on guitar_bass_duo).
 */

import { runGoldenPathOnce } from '../../core/goldenPath/runGoldenPath';
import { getVoiceRuleBundle } from '../../core/composer/voiceRuleBundles';
import { evaluateGce, defaultGceWeights, GCE_CATEGORY_ORDER } from '../../core/evaluation/gceEvaluator';
import { extractScoreModelFeatures } from '../../core/evaluation/featureExtractor';
import {
  GCE_EVAL_COMPOSITION_CONTEXT_KEY,
  resolveEffectiveGceStyleId,
} from '../../core/gce/resolveEffectiveGceStyle';
import {
  scoreCadentialClarity,
  scoreMelodicIdentity,
  scoreStructureAndForm,
  gceSectionsFromFormMap,
} from '../../core/gce/gceAutoScorers';
import { scoreModelToMelodicLine } from '../../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../../core/gce/resolveMelodicPartId';
import {
  evaluateFinalBarTensionGate,
  isTonicFamilyChordForFbt,
} from '../../core/gce/finalBarTensionGate';
import { getChordForBar } from '../../core/harmony/harmonyResolution';
import type { CompositionContext } from '../../core/compositionContext';
import type { ScoreModel } from '../../core/score-model/scoreModelTypes';
import type { GceCategory } from '../../core/evaluation/evaluationTypes';
import { defaultStyleProfileForPrimarySongwriter } from '../../core/song-mode/songModeStyleProfileDefaults';

export const VERLAINE_GBD_EVAL_TOTAL_BARS = 32;
export const VERLAINE_GBD_RELEASE_BAND = 7.9;

export type HardGateId =
  | 'melodicIdentity'
  | 'sectionContrast'
  | 'cadentialClarityCoverage'
  | 'finalBarTension';

export interface HardGateRow {
  id: HardGateId;
  pass: boolean;
  detail: string;
}

export function buildVerlaineGbdGoldenPathRequest(primarySongwriterStyle?: string) {
  const primary = primarySongwriterStyle ?? 'verlaine';
  return {
    presetId: 'guitar_bass_duo' as const,
    harmonicVoice: 'verlaine',
    totalBars: VERLAINE_GBD_EVAL_TOTAL_BARS,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: primary,
    creativeControlLevel: 'balanced' as const,
    styleProfile: defaultStyleProfileForPrimarySongwriter(primary) ?? 'STYLE_MODERN_JAZZ',
  };
}

export function stripFromContext(context: CompositionContext): string[] {
  const parsed = context.generationMetadata?.parsedCustomProgressionBars;
  if (parsed && parsed.length === context.form.totalBars) return [...parsed];
  const out: string[] = [];
  for (let b = 1; b <= context.form.totalBars; b++) out.push(getChordForBar(b, context).trim());
  return out;
}

/** @deprecated Prefer {@link isTonicFamilyChordForFbt} — kept for slice/eval callers. */
export function isTonicFamilyChord(symbol: string): boolean {
  return isTonicFamilyChordForFbt(symbol);
}

export function evaluateHardGates(
  score: ScoreModel,
  context: CompositionContext,
  strip: string[]
): { gates: HardGateRow[]; allPass: boolean } {
  const sections = gceSectionsFromFormMap(context.form);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const songwriterId =
    resolveEffectiveGceStyleId(context) ?? context.generationMetadata?.songwriterStyleId;

  const melodic = scoreMelodicIdentity(melody, songwriterId);
  const melodicFail = melodic.score <= 6 || melodic.justification.includes('[HARD FAIL]');

  const structure = scoreStructureAndForm(score, strip, sections);
  const sectionFail = structure.justification.includes('[HARD FAIL]');

  const cadence = scoreCadentialClarity(melody, strip, sections);
  const coverage = cadence.score / 10;
  const cadenceFail = coverage < 0.4;

  const fbt = evaluateFinalBarTensionGate({
    score,
    chords: strip,
    presetId: context.presetId,
    endingContext: context.generationMetadata?.endingContext,
    acknowledgeOpenIdiomEnding: context.generationMetadata?.acknowledgeOpenIdiomEnding,
    finalBar: VERLAINE_GBD_EVAL_TOTAL_BARS,
  });

  const gates: HardGateRow[] = [
    { id: 'melodicIdentity', pass: !melodicFail, detail: `score=${melodic.score}; ${melodic.justification}` },
    { id: 'sectionContrast', pass: !sectionFail, detail: structure.justification },
    {
      id: 'cadentialClarityCoverage',
      pass: !cadenceFail,
      detail: `score=${cadence.score}; coverage=${coverage.toFixed(3)} (need >= 0.4); ${cadence.justification}`,
    },
    {
      id: 'finalBarTension',
      pass: fbt.pass,
      detail: fbt.detail,
    },
  ];

  return { gates, allPass: gates.every((g) => g.pass) };
}

export function categoryScoresRecord(
  categories: ReturnType<typeof evaluateGce>['categories']
): Record<GceCategory, number> {
  const out = {} as Record<GceCategory, number>;
  for (const cat of GCE_CATEGORY_ORDER) out[cat] = categories[cat].score;
  return out;
}

export function runVerlaineGbdFormalEval(seed: number, primary: string) {
  const result = runGoldenPathOnce(seed, buildVerlaineGbdGoldenPathRequest(primary));
  if (!result.score) {
    throw new Error(`Generation failed: ${result.errors?.join('; ') ?? 'no score'}`);
  }

  const strip = stripFromContext(result.context);
  const features = extractScoreModelFeatures(result.score);
  const songwriterStyleId =
    resolveEffectiveGceStyleId(result.context) ??
    result.context.generationMetadata?.songwriterStyleId ??
    primary;

  const gce = evaluateGce({
    output: result.score,
    features,
    weights: defaultGceWeights,
    metadata: {
      songwriterStyleId,
      [GCE_EVAL_COMPOSITION_CONTEXT_KEY]: result.context,
    },
  });

  const hard = evaluateHardGates(result.score, result.context, strip);

  return { result, gce, hard, strip };
}

export function musicianFacingGceScore(result: ReturnType<typeof runGoldenPathOnce>): number {
  if (!result.score) return 0;
  const features = extractScoreModelFeatures(result.score);
  const sw = result.context.generationMetadata?.songwriterStyleId;
  const gce = evaluateGce({
    output: result.score,
    features,
    weights: defaultGceWeights,
    metadata: {
      songwriterStyleId: resolveEffectiveGceStyleId(result.context) ?? sw,
      [GCE_EVAL_COMPOSITION_CONTEXT_KEY]: result.context,
    },
  });
  return gce.finalScore;
}

export function applyVerlaineGbdDcrOnce(
  seed: number,
  primary: string,
  prior: ReturnType<typeof runVerlaineGbdFormalEval>
): {
  result: ReturnType<typeof runGoldenPathOnce>;
  gce: ReturnType<typeof evaluateGce>;
  hard: ReturnType<typeof evaluateHardGates>;
  evalSeed: number;
  dcrNote: string;
} {
  const evalSeed = seed + 1;
  const needsBandDcr = prior.gce.finalScore < VERLAINE_GBD_RELEASE_BAND;
  const finalBarGateFailed = prior.hard.gates.some((g) => g.id === 'finalBarTension' && !g.pass);
  const weakest = prior.gce.weakestCategory;

  if (finalBarGateFailed) {
    const strip = stripFromContext(prior.result.context);
    const tonicBar =
      [...strip].reverse().find((sym) => isTonicFamilyChord(sym)) ??
      strip.find((sym) => sym.trim()) ??
      'Cmaj7';
    const refinedStrip = [...strip];
    refinedStrip[VERLAINE_GBD_EVAL_TOTAL_BARS - 1] = tonicBar;
    const dcrNote = `DCR refine (one pass): finalBarTension — bar ${VERLAINE_GBD_EVAL_TOTAL_BARS} locked to tonic-family ${tonicBar} via custom_locked regen (seed ${evalSeed})`;
    const result = runGoldenPathOnce(evalSeed, {
      ...buildVerlaineGbdGoldenPathRequest(primary),
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: refinedStrip,
      parsedChordBars: refinedStrip,
      chordProgressionText: refinedStrip.join(' | '),
    });
    if (!result.score) throw new Error(`DCR regen failed: ${result.errors?.join('; ')}`);
    const outStrip = stripFromContext(result.context);
    const features = extractScoreModelFeatures(result.score);
    const gce = evaluateGce({
      output: result.score,
      features,
      weights: defaultGceWeights,
      metadata: { songwriterStyleId: result.context.generationMetadata?.songwriterStyleId ?? primary },
    });
    const hard = evaluateHardGates(result.score, result.context, outStrip);
    return { result, gce, hard, evalSeed, dcrNote };
  }

  const dcrNote = `DCR refine (one pass): weakest=${weakest} — regen seed ${evalSeed} with creativeControlLevel surprise`;
  const result = runGoldenPathOnce(evalSeed, {
    ...buildVerlaineGbdGoldenPathRequest(primary),
    creativeControlLevel: 'surprise',
  });
  if (!result.score) throw new Error(`DCR regen failed: ${result.errors?.join('; ')}`);
  const outStrip = stripFromContext(result.context);
  const features = extractScoreModelFeatures(result.score);
  const gce = evaluateGce({
    output: result.score,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: result.context.generationMetadata?.songwriterStyleId ?? primary },
  });
  const hard = evaluateHardGates(result.score, result.context, outStrip);
  return { result, gce, hard, evalSeed, dcrNote };
}

export function verlaineGbdVrbReceipt() {
  return getVoiceRuleBundle('verlaine').voiceId;
}

/** CLI entry — imported by scripts/runVerlaineGbdWriterEval.ts */
export function runVerlaineGbdWriterEvalCli(argv: string[] = process.argv.slice(2)): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const { GCE_CATEGORY_ORDER } = require('../../core/evaluation/gceEvaluator') as typeof import('../../core/evaluation/gceEvaluator');

  const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
  const DEFAULT_SEED = 50021;

  let seed = DEFAULT_SEED;
  let outDir = path.join(REPO_ROOT, 'output', 'verlaine-gbd-eval');
  let primary = 'verlaine';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && argv[i + 1]) seed = parseInt(argv[++i]!, 10) || DEFAULT_SEED;
    else if (a === '--out' && argv[i + 1]) {
      const raw = argv[++i]!;
      outDir = path.isAbsolute(raw) ? raw : path.join(REPO_ROOT, raw);
    } else if (a === '--primary' && argv[i + 1]) primary = argv[++i]!;
  }

  const sha256File = (filePath: string) =>
    crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

  fs.mkdirSync(outDir, { recursive: true });
  console.log('=== Formal GCE — Verlaine GBD writer ===');
  console.log(`Command: npm run eval:verlaine -- --seed ${seed} --primary ${primary}`);

  let evalSeed = seed;
  let dcrApplied = false;
  let dcrNote = '';
  const prior = runVerlaineGbdFormalEval(seed, primary);
  let { result, gce, hard } = prior;

  if (gce.finalScore < VERLAINE_GBD_RELEASE_BAND || !hard.allPass) {
    dcrApplied = true;
    const refined = applyVerlaineGbdDcrOnce(seed, primary, prior);
    result = refined.result;
    gce = refined.gce;
    hard = refined.hard;
    evalSeed = refined.evalSeed;
    dcrNote = refined.dcrNote;
    console.log('\n' + dcrNote);
  }

  console.log('\n--- GCE categories (formal evaluateGce) ---');
  for (const cat of GCE_CATEGORY_ORDER) {
    console.log(`  ${cat.padEnd(28)} ${String(gce.categories[cat].score).padStart(5)}/10`);
  }
  console.log(`\nOVERALL GCE: ${gce.finalScore}/10 (release band ${VERLAINE_GBD_RELEASE_BAND})`);
  console.log(`Weakest: ${gce.weakestCategory} | Strongest: ${gce.strongestCategory}`);
  console.log('\n--- Hard gates ---');
  for (const g of hard.gates) console.log(`  ${g.id.padEnd(28)} ${g.pass ? 'PASS' : 'FAIL'}`);
  console.log(`Hard gates all PASS: ${hard.allPass}`);

  const xmlPath = path.join(outDir, `verlaine_gbd_writer_seed${evalSeed}.musicxml`);
  if (result.xml) fs.writeFileSync(xmlPath, result.xml, 'utf8');

  const report = {
    mode: 'formal',
    command: `npm run eval:verlaine -- --seed ${seed} --primary ${primary}`,
    seed: evalSeed,
    requestSeed: seed,
    harmonicVoice: 'verlaine',
    primarySongwriterStyle: primary,
    overallGce: gce.finalScore,
    releaseBand: VERLAINE_GBD_RELEASE_BAND,
    gcePassReleaseBand: gce.finalScore >= VERLAINE_GBD_RELEASE_BAND,
    weakestCategory: gce.weakestCategory,
    strongestCategory: gce.strongestCategory,
    categories: categoryScoresRecord(gce.categories),
    hardGates: hard.gates,
    hardGatesAllPass: hard.allPass,
    dcrApplied,
    dcrNote,
    vrbVoiceId: verlaineGbdVrbReceipt(),
    harmonicSceneReceipt: result.context.generationMetadata?.harmonicSceneReceipt,
    exportIntegrityPassed: result.exportIntegrityPassed,
    goldenPathSuccess: result.success,
    musicXmlPath: result.xml ? xmlPath : null,
    musicXmlSha256: result.xml && fs.existsSync(xmlPath) ? sha256File(xmlPath) : null,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'gce-report.json'), JSON.stringify(report, null, 2), 'utf8');

  if (!hard.allPass) process.exit(1);
  if (gce.finalScore < VERLAINE_GBD_RELEASE_BAND && dcrApplied) process.exit(2);
}
