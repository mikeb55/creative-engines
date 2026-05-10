/**
 * Steely Orbit Prelude V2.0 — fingerprint-gated generation vs `orbit_v6_64`.
 * Default run: STEELY_GCE_GATE=7.5 STEELY_MAX_TRIES=16 (override via env).
 * Requires local Orbit sources under repo `projects/Orbit/` (see paths below).
 *
 * Survey:
 * - `donald_fagen` — Song Mode slice + GCE targets (full pool).
 * - `bacharach` — canonical id is `bacharach` (not `burt_bacharach`); full pool.
 * - `steely_dan` — no separate registry entry; use `donald_fagen` as primary proxy.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import { createCombinedEvaluator } from '../core/evaluation/combinedEvaluator';
import { clareFischerStyleProfile } from '../core/evaluation/clareFischerStyleProfile';
import { songModeBurtBacharachStyleProfile } from '../core/evaluation/songModeBurtBacharachStyleProfile';
import type {
  CombinedEvaluationResult,
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from '../core/evaluation/evaluationTypes';
import { scoreModelFeatureExtractor } from '../core/evaluation/featureExtractor';
import { GCE_CATEGORY_ORDER, defaultGceWeights } from '../core/evaluation/gceEvaluator';
import { defaultLockGates } from '../core/evaluation/lockGates';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import {
  STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT,
  loadFingerprint,
  validateSteelyOrbitV2FingerprintGate,
} from '../core/gce/gceStructuralMemory';
import { auditDrumVoice1FourBarRepeats } from '../core/big-band/orbitSteelyV13DrumNarrative';
import {
  auditAltoConsecutiveRestBars,
  validateAlto917Vs58,
} from '../core/big-band/orbitSteelyV14MelodicDevelopment';
import { BB_PART_TRUMPETS, BB_PART_TROMBONES } from '../core/big-band/buildBigBandOrchestrationPlan';
import { drumVoice1MeasureSignature } from '../core/big-band/orbitSteelyV13DrumNarrative';

const repoRoot = path.resolve(__dirname, '../../..');
const LEAD_REL = 'projects/Orbit/Orbit_lead_V5.1.musicxml';
const REF_REL = 'projects/Orbit/V6.0 orbit - BB.musicxml';
const OUT_DIR_REL = 'projects/Orbit/Steely Orbit - 1st 64 bars';
const OUT_FILE = 'V2.0-Steely-Orbit.musicxml';

function gitHeadShort(): string {
  try {
    return execSync('git rev-parse --short=8 HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function envFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return v === '1' || /^true$/i.test(v);
}

const GCE_GATE = envFloat('STEELY_GCE_GATE', 7.5);
/** Gate matches **display** rounding (avoids 6.998 printing as 7.00 but failing `>= 7`). */
const passesGceGate = (score: number): boolean => Math.round(score * 100) / 100 >= GCE_GATE;
const TARGET_GCE = 9.0;
const MAX_TRIES = Math.max(1, Math.floor(envFloat('STEELY_MAX_TRIES', 16)));
const BPM = 129;

/** V2 fingerprint tolerances (`STEELY_V2_SECTION_ABS_DELTA_MIN=0` disables section Δ gate until exports carry real rehearsal deltas). */
const V2_DENSITY_EIGHT_MAX = envFloat('STEELY_V2_DENSITY_EIGHT_MAX', 0.5);
const V2_DRUM_VAR_MIN = envFloat('STEELY_V2_DRUM_VARIANCE_MIN', 0.05);
const V2_SECTION_DELTA_MIN = envFloat('STEELY_V2_SECTION_ABS_DELTA_MIN', 0);
const V2_DISABLE_MELODY_STREAK = envBool('STEELY_V2_DISABLE_MELODY_STREAK', false);

function buildBarMeterMap64(): BarMeterMap {
  const m: BarMeterMap = {};
  for (let i = 1; i <= 64; i++) {
    m[i] = { numerator: 3, denominator: 4 };
  }
  return m;
}

/**
 * Style eval for Steely: **real** scorers on `ExtractedStyleFeatures` — 50% Song Mode Bacharach +
 * 50% Clare Fischer (arranger). Replaces Fischer-only bucket scores that often cluster at 7.0.
 * GCE still uses `metadata.songwriterStyleId: 'donald_fagen'` for melodic/harmony auto-scorers (no separate Fagen StyleProfile in eval).
 */
function buildSteelyOrbitEvalStyleProfile(): StyleProfile<unknown, ExtractedStyleFeatures> {
  const halfBach: StyleDimensionDefinition[] = songModeBurtBacharachStyleProfile.dimensions.map((d) => ({
    ...d,
    id: `songwriter_bacharach_${d.id}`,
    weight: d.weight * 0.5,
  }));
  const halfFish: StyleDimensionDefinition[] = clareFischerStyleProfile.dimensions.map((d) => ({
    ...d,
    id: `arranger_fischer_${d.id}`,
    weight: d.weight * 0.5,
  }));
  return {
    id: 'steely_orbit_bacharach_fischer',
    name: 'Steely Orbit — Bacharach + Clare Fischer (eval blend)',
    family: 'bigBand',
    threshold: 7.0,
    dimensions: [...halfBach, ...halfFish],
    description:
      'Weighted sum of songModeBurtBacharachStyleProfile (voicing size, riff repetition, swing grid) and clareFischerStyleProfile (harmonic mass, functional ratio, groove, piano density).',
    score(input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>): StyleProfileEvaluationResult {
      const bach = songModeBurtBacharachStyleProfile.score({
        ...input,
        profile: songModeBurtBacharachStyleProfile,
      });
      const fischer = clareFischerStyleProfile.score({
        ...input,
        profile: clareFischerStyleProfile,
      });
      const finalStyleScore = 0.5 * bach.finalStyleScore + 0.5 * fischer.finalStyleScore;
      const dimensions: StyleDimensionScore[] = [
        ...bach.dimensions.map((d) => ({
          ...d,
          id: `songwriter_bacharach_${d.id}`,
          label: `Bacharach: ${d.label}`,
          weightedScore: d.weightedScore * 0.5,
        })),
        ...fischer.dimensions.map((d) => ({
          ...d,
          id: `arranger_fischer_${d.id}`,
          label: `Fischer: ${d.label}`,
          weightedScore: d.weightedScore * 0.5,
        })),
      ];
      let weakestDimensionId = dimensions[0]?.id ?? '';
      let strongestDimensionId = dimensions[0]?.id ?? '';
      let minS = Infinity;
      let maxS = -Infinity;
      for (const d of dimensions) {
        if (d.score < minS) {
          minS = d.score;
          weakestDimensionId = d.id;
        }
        if (d.score > maxS) {
          maxS = d.score;
          strongestDimensionId = d.id;
        }
      }
      return {
        styleId: 'steely_orbit_bacharach_fischer',
        styleName: 'Steely Orbit eval blend',
        dimensions,
        finalStyleScore,
        weakestDimensionId,
        strongestDimensionId,
        pass: finalStyleScore >= 7.0,
        threshold: 7.0,
        notes: [
          `bacharach_component=${bach.finalStyleScore.toFixed(3)}`,
          `fischer_component=${fischer.finalStyleScore.toFixed(3)}`,
        ],
      };
    },
  };
}

const steelyOrbitEvalStyleProfile = buildSteelyOrbitEvalStyleProfile();

function printWinningEvalBreakdown(ev: CombinedEvaluationResult): void {
  console.log('\nGCE pillar breakdown (winning attempt):');
  for (const cat of GCE_CATEGORY_ORDER) {
    const c = ev.gce.categories[cat];
    console.log(`  ${cat}: ${c.score.toFixed(2)}  (w=${c.weight})`);
  }
  console.log('\nStyle dimension breakdown (Bacharach + Fischer blend):');
  for (const d of ev.style.dimensions) {
    console.log(`  ${d.label}: ${d.score.toFixed(2)}  (w×score=${d.weightedScore.toFixed(3)})`);
  }
  if (ev.style.notes?.length) {
    console.log('Style sub-scores:', ev.style.notes.join('  '));
  }
}

function printWatchPillars(ev: CombinedEvaluationResult): void {
  const tr = ev.gce.categories.tensionAndRelease.score;
  const clDim = ev.style.dimensions.find((d) => d.id.includes('chromaticLattice'));
  const cl = clDim?.score;
  console.log(
    '\nWatch pillars:',
    `tensionAndRelease=${tr.toFixed(2)}`,
    `chromaticLattice=${typeof cl === 'number' ? cl.toFixed(2) : 'n/a'}`
  );
}

function barHasVoice1Pitch(score: ScoreModel, partId: string, bar: number): boolean {
  const p = score.parts.find((x) => x.id === partId);
  const m = p?.measures[bar - 1];
  if (!m) return false;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    return true;
  }
  return false;
}

function barHasAnyDrumHit(score: ScoreModel, bar: number): boolean {
  const p = score.parts.find((x) => x.id === 'bb_drums');
  const m = p?.measures[bar - 1];
  if (!m) return false;
  for (const e of m.events) {
    if (e.kind === 'note') return true;
  }
  return false;
}

function validateSteelyV17Export(score: ScoreModel): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let ok = true;
  if (score.parts.length !== 7) {
    ok = false;
    messages.push(`part count ${score.parts.length} (need 7)`);
  }
  const drums = score.parts.find((p) => p.id === 'bb_drums');
  if (drums) {
    for (let b = 1; b <= 64; b++) {
      if (!barHasAnyDrumHit(score, b)) {
        ok = false;
        messages.push(`drums empty bar ${b}`);
      }
    }
    for (let b = 61; b < 64; b++) {
      const a = drumVoice1MeasureSignature(drums.measures[b - 1]!);
      const c = drumVoice1MeasureSignature(drums.measures[b]!);
      if (a === c) {
        ok = false;
        messages.push(`drums voice-1 identical consecutive bars ${b}–${b + 1}`);
      }
    }
  }
  for (let b = 61; b <= 64; b++) {
    if (!barHasVoice1Pitch(score, 'bb_rhythm_section', b)) {
      ok = false;
      messages.push(`bass inactive bar ${b}`);
    }
    if (!barHasVoice1Pitch(score, 'bb_piano', b)) {
      ok = false;
      messages.push(`piano inactive bar ${b}`);
    }
    if (
      !barHasVoice1Pitch(score, BB_PART_TRUMPETS, b) &&
      !barHasVoice1Pitch(score, BB_PART_TROMBONES, b)
    ) {
      ok = false;
      messages.push(`brass inactive bar ${b}`);
    }
  }
  for (const b of [42, 43, 44]) {
    if (!barHasVoice1Pitch(score, 'bb_alto_sax', b)) {
      ok = false;
      messages.push(`alto melody missing bar ${b}`);
    }
  }
  return { ok, messages };
}

function activeLayerAuditLines(score: ScoreModel): string[] {
  const ids = [
    'bb_alto_sax',
    'bb_tenor_sax',
    BB_PART_TRUMPETS,
    BB_PART_TROMBONES,
    'bb_piano',
    'bb_rhythm_section',
    'bb_drums',
  ] as const;
  const lines: string[] = [];
  for (let b = 57; b <= 64; b++) {
    const active: string[] = [];
    for (const id of ids) {
      if (id === 'bb_drums') {
        if (barHasAnyDrumHit(score, b)) active.push(id);
      } else if (barHasVoice1Pitch(score, id, b)) {
        active.push(id);
      }
    }
    lines.push(`bar ${b}: ${active.length} layers — ${active.join(', ')}`);
  }
  return lines;
}

/** Combined GCE + blended style (see {@link steelyOrbitEvalStyleProfile}). */
function evaluateBigBandSteely(score: ScoreModel): CombinedEvaluationResult {
  const evaluator = createCombinedEvaluator({ lockRequired: false });
  return evaluator.evaluate({
    output: score,
    sourceFormat: 'scoreModel',
    styleProfile: steelyOrbitEvalStyleProfile,
    featureExtractor: scoreModelFeatureExtractor,
    gceWeights: defaultGceWeights,
    lockGates: defaultLockGates,
    metadata: { songwriterStyleId: 'donald_fagen' },
    config: {
      gceWeight: 0.6,
      styleWeight: 0.4,
      lockRequired: false,
      passThreshold: GCE_GATE,
    },
  });
}

function drumArticulationSteely(): Partial<Record<number, 'brushes' | 'sticks'>> {
  const o: Partial<Record<number, 'brushes' | 'sticks'>> = {};
  for (let b = 1; b <= 8; b++) {
    o[b] = 'brushes';
  }
  for (let b = 49; b <= 52; b++) {
    o[b] = 'brushes';
  }
  for (let b = 53; b <= 56; b++) {
    o[b] = 'sticks';
  }
  /** Tail strip — narrative pass overwrites drums; hints retained for any pre-pass policy. */
  for (let b = 57; b <= 64; b++) {
    o[b] = 'brushes';
  }
  return o;
}

function main(): void {
  console.log('[Steely V2.0] main start');
  const leadPath = path.join(repoRoot, LEAD_REL);
  const refPath = path.join(repoRoot, REF_REL);
  const outDir = path.join(repoRoot, OUT_DIR_REL);

  if (!fs.existsSync(leadPath)) {
    console.error(`Missing lead: ${leadPath}`);
    process.exit(1);
  }

  const leadXml = fs.readFileSync(leadPath, 'utf8');
  const refXml = fs.existsSync(refPath) ? fs.readFileSync(refPath, 'utf8') : leadXml;
  if (!fs.existsSync(refPath)) {
    console.warn(`Reference instrumentation file missing — using lead XML for behaviour hints: ${refPath}`);
  }

  const barMeterMap = buildBarMeterMap64();

  const imp = importLeadSheetFromMusicXml(leadXml);
  if (!imp.ok || !imp.leadSheet) {
    console.error('Lead import failed:', imp.errors);
    process.exit(1);
  }

  const orbitFp = loadFingerprint('orbit_v6_64');
  if (!orbitFp) {
    console.error('Missing fingerprint orbit_v6_64 — run npm run gce:seed-structural-fingerprints in engines/composer-os-v2');
    process.exit(1);
  }

  const ruleFailCounts: Record<string, number> = {};
  const bumpFailedRules = (rules: Record<string, boolean>) => {
    for (const [k, ok] of Object.entries(rules)) {
      if (!ok) ruleFailCounts[k] = (ruleFailCounts[k] ?? 0) + 1;
    }
  };

  let bestFpPassScore = -1;
  let bestFpPassXml = '';
  let bestFpPassModel: ScoreModel | null = null;
  let bestFpPassEval: CombinedEvaluationResult | null = null;
  let bestFpPassSeed = 0;

  let bestGateXml = '';
  let bestGateModel: ScoreModel | null = null;
  let bestGateEval: CombinedEvaluationResult | null = null;
  let bestGateSeed = 0;
  let bestGateScore = -1;

  let anyFpPass = false;
  let failureHint = '';

  const baseSeed = 1740080400;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = baseSeed + attempt;
    console.log(`\n[Steely V2.0] attempt ${attempt + 1}/${MAX_TRIES} seed=${seed}`);
    const realised = runBigBandRealisation({
      seed,
      title: 'Steely Orbit Prelude V2.0',
      totalBars: 64,
      formId: 'orbit_bb_64',
      bpm: BPM,
      era: 'cool_jazz',
      ensembleLeadSheetMusicXml: refXml,
      leadSheet: imp.leadSheet,
      barMeterMap,
      feelMode: 'in2',
      drumArticulation: 'brushes',
      drumArticulationBarOverrides: drumArticulationSteely(),
      figureResponse: 'medium',
      sectionIntensityOverrides: {
        intro: 'sparse',
        melody_head: 'standard',
        solo_section: 'driving',
        shout_chorus: 'sparse',
        ending: 'sparse',
      },
      barDrumIntensityOverrides: {
        5: 'sparse',
        6: 'sparse',
        7: 'sparse',
        8: 'sparse',
        9: 'driving',
        10: 'driving',
        11: 'driving',
        12: 'driving',
        17: 'standard',
        25: 'standard',
        41: 'sparse',
        53: 'driving',
        54: 'driving',
        55: 'standard',
        56: 'standard',
      },
      suppressDesignatedSaxSoli: true,
      songwriterStyleId: 'donald_fagen',
      bigBandArrangementProfile: 'orbit_steely_v1_7_64',
      stylePairing: {
        songwriterStyle: 'donald_fagen',
        arrangerStyle: 'clare_fischer',
        era: 'cool_jazz',
        seed,
      },
    });

    if (!realised.planning.validation.ok || !realised.exportPipeline.ok || !realised.score) {
      if (!realised.planning.validation.ok) {
        failureHint = `planning: ${realised.planning.validation.errors?.join('; ') ?? 'unknown'}`;
      } else if (!realised.exportPipeline.ok) {
        failureHint = `export: ${realised.exportPipeline.errors?.join('; ') ?? 'unknown'}`;
      }
      console.log('Fingerprint rules: n/a (no score)');
      console.log('Combined GCE: n/a');
      continue;
    }

    const fpGate = validateSteelyOrbitV2FingerprintGate(realised.score, orbitFp, {
      densityEightBarMaxMeanAbs: V2_DENSITY_EIGHT_MAX,
      drumSixteenBarMinVariance: V2_DRUM_VAR_MIN,
      sectionMinAbsDensityDelta: V2_SECTION_DELTA_MIN,
      disableMelodicPitchStreak: V2_DISABLE_MELODY_STREAK,
    });
    bumpFailedRules(fpGate.rules);

    console.log('Fingerprint rules (orbit_v6_64):', JSON.stringify(fpGate.rules));

    if (!fpGate.pass) {
      console.log('Combined GCE: n/a (fingerprint gate failed)');
      const preview = fpGate.failures.slice(0, 8);
      console.log('Failures (sample):', preview.join('; '), fpGate.failures.length > 8 ? `…(+${fpGate.failures.length - 8})` : '');
      failureHint = fpGate.failures[0] ?? 'fingerprint_v2';
      continue;
    }

    anyFpPass = true;
    const xmlOut = realised.exportPipeline.xml ?? '';
    const ev = evaluateBigBandSteely(realised.score);
    console.log('Combined GCE:', ev.finalScore.toFixed(2));

    if (ev.finalScore > bestFpPassScore) {
      bestFpPassScore = ev.finalScore;
      bestFpPassSeed = seed;
      bestFpPassEval = ev;
      bestFpPassXml = xmlOut;
      bestFpPassModel = realised.score;
    }

    if (passesGceGate(ev.finalScore) && ev.finalScore > bestGateScore) {
      bestGateScore = ev.finalScore;
      bestGateSeed = seed;
      bestGateEval = ev;
      bestGateXml = xmlOut;
      bestGateModel = realised.score;
    }
  }

  const sortedHardest = Object.entries(ruleFailCounts).sort((a, b) => b[1] - a[1]);

  if (!anyFpPass) {
    console.error('\n--- STEELY ORBIT V2.0 — ABORT ---');
    console.error('No attempt passed the V2 fingerprint gate.');
    console.error('Rule fail counts:', JSON.stringify(ruleFailCounts));
    console.error('Hint:', failureHint);
    process.exit(1);
  }

  const gateMet = bestGateEval != null && bestGateXml.trim().length > 0 && passesGceGate(bestGateScore);

  if (!gateMet) {
    console.log('\n--- STEELY ORBIT V2.0 — GATE NOT MET (no export <', GCE_GATE, ') ---');
    console.log('Best fingerprint-passing combined score:', bestFpPassScore.toFixed(2), 'seed', bestFpPassSeed);
    if (bestFpPassEval) {
      console.log('\nPer-dimension breakdown (best fingerprint-pass attempt):');
      printWinningEvalBreakdown(bestFpPassEval);
    }
    console.log('Fingerprint rules hardest to satisfy (fail counts across attempts):');
    for (const [rule, c] of sortedHardest) {
      console.log(`  ${rule}: ${c}`);
    }
    console.log('Declared rule buckets:', STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT);
    console.log('Commit:', gitHeadShort());
    process.exit(0);
  }

  const bestScoreForReport = bestGateModel!;
  const bestXml = bestGateXml;
  const bestEval = bestGateEval!;
  const bestSeed = bestGateSeed;

  const restFinalPre = auditAltoConsecutiveRestBars(bestScoreForReport);
  const v17val = validateSteelyV17Export(bestScoreForReport);
  console.log('\n--- Pre-export validation (V2.0) ---');
  console.log('Alto rest-span:', restFinalPre.ok ? 'PASS' : 'FAIL', restFinalPre.ok ? `maxSpan=${restFinalPre.maxSpanOutsideExempt}` : restFinalPre.violations.join('; '));
  console.log('Structural (7 parts, 61–64 rhythm, drums, 42–44 alto):', v17val.ok ? 'PASS' : 'FAIL', v17val.messages.join('; ') || '');
  console.log('Active-layer audit (bars 57–64):');
  for (const line of activeLayerAuditLines(bestScoreForReport)) {
    console.log(' ', line);
  }
  if (!restFinalPre.ok || !v17val.ok) {
    console.error('Pre-export validation failed — not writing MusicXML.');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const outFinal = path.join(outDir, OUT_FILE);
  let writePath = outFinal;
  if (fs.existsSync(outFinal)) {
    writePath = path.join(outDir, `V2.0-Steely-Orbit-${bestSeed}.musicxml`);
    console.warn(`Preserving existing ${OUT_FILE} — writing ${path.basename(writePath)}`);
  }

  fs.writeFileSync(writePath, bestXml, 'utf8');

  const drumAudit = auditDrumVoice1FourBarRepeats(bestScoreForReport);
  const melodicDev = validateAlto917Vs58(bestScoreForReport);
  const restAuditFinal = auditAltoConsecutiveRestBars(bestScoreForReport);

  const fpFinal = validateSteelyOrbitV2FingerprintGate(bestScoreForReport, orbitFp, {
    densityEightBarMaxMeanAbs: V2_DENSITY_EIGHT_MAX,
    drumSixteenBarMinVariance: V2_DRUM_VAR_MIN,
    sectionMinAbsDensityDelta: V2_SECTION_DELTA_MIN,
    disableMelodicPitchStreak: V2_DISABLE_MELODY_STREAK,
  });

  console.log('\n--- STEELY ORBIT V2.0 REPORT ---');
  console.log('Commit:', gitHeadShort());
  console.log(
    'Fingerprint gate (winning attempt, rule buckets',
    STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT,
    '):',
    JSON.stringify(fpFinal.rules),
    fpFinal.pass ? 'PASS' : 'FAIL'
  );
  console.log(
    'Drum variation audit (voice 1 / four-bar repeats):',
    drumAudit.ok ? 'PASS' : 'FLAG',
    drumAudit.messages.length ? drumAudit.messages.join('; ') : ''
  );
  console.log('Alto rest-span audit:', restAuditFinal.ok ? 'PASS' : 'FAIL', restAuditFinal.ok ? `maxSpan=${restAuditFinal.maxSpanOutsideExempt}` : restAuditFinal.violations.join('; '));
  console.log('Melodic development audit (bars 9–17 vs 5–8):', melodicDev.ok ? 'PASS' : 'FLAG', melodicDev.detail);
  console.log('Melodic GCE source part:', resolveMelodicPartId(bestScoreForReport));
  console.log(
    '\nCombined score:',
    bestEval.finalScore.toFixed(2),
    '(gate',
    GCE_GATE,
    'target',
    TARGET_GCE + ')  GCE pillar:',
    bestEval.gce.finalScore.toFixed(2),
    'style:',
    bestEval.style.finalStyleScore.toFixed(2)
  );
  console.log('Weakest combined dimension:', bestEval.weakestDimension);
  console.log('Weakest GCE pillar:', bestEval.gce.weakestCategory);
  console.log('Seed:', bestSeed);
  console.log('Gate: MET');
  console.log('Wrote', writePath);

  printWatchPillars(bestEval);
  printWinningEvalBreakdown(bestEval);
}

main();
