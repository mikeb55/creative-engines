/**
 * Steely Orbit Prelude V1.4 — alto melodic development pass + V1.3 drums/motif (orbit_steely_v1_4_64).
 * Requires local Orbit sources under repo `projects/Orbit/` (see paths below).
 *
 * Survey:
 * - `donald_fagen` — Song Mode slice + GCE targets (full pool).
 * - `bacharach` — canonical id is `bacharach` (not `burt_bacharach`); full pool.
 * - `steely_dan` — no separate registry entry; use `donald_fagen` as primary proxy.
 */

import fs from 'fs';
import path from 'path';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../core/lead-sheet/leadSheetTypes';
import { createCombinedEvaluator } from '../core/evaluation/combinedEvaluator';
import { clareFischerStyleProfile } from '../core/evaluation/clareFischerStyleProfile';
import { scoreModelFeatureExtractor } from '../core/evaluation/featureExtractor';
import { defaultGceWeights } from '../core/evaluation/gceEvaluator';
import { defaultLockGates } from '../core/evaluation/lockGates';
import type { CombinedEvaluationResult } from '../core/evaluation/evaluationTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { auditDrumVoice1FourBarRepeats } from '../core/big-band/orbitSteelyV13DrumNarrative';
import { validateAlto917Vs58 } from '../core/big-band/orbitSteelyV14MelodicDevelopment';

const repoRoot = path.resolve(__dirname, '../../..');
const LEAD_REL = 'projects/Orbit/Orbit_lead_V5.1.musicxml';
const REF_REL = 'projects/Orbit/V6.0 orbit - BB.musicxml';
const OUT_DIR_REL = 'projects/Orbit/Steely Orbit - 1st 64 bars';
const OUT_FILE = 'V1.4-Steely-Orbit.musicxml';

function envFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const GCE_GATE = envFloat('STEELY_GCE_GATE', 8.8);
const TARGET_GCE = 9.0;
const MAX_TRIES = Math.max(1, Math.floor(envFloat('STEELY_MAX_TRIES', 64)));
const BPM = 129;

function buildBarMeterMap64(): BarMeterMap {
  const m: BarMeterMap = {};
  for (let i = 1; i <= 64; i++) {
    m[i] = { numerator: 3, denominator: 4 };
  }
  return m;
}

function melodyFingerprint(events: LeadSheetMelodyNoteEvent[]): string {
  const sorted = [...events].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  return sorted.map((e) => `${e.bar}|${e.beat.toFixed(4)}|${e.midi}|${e.durationBeats.toFixed(4)}`).join(';');
}

/** Core head fingerprint only — bars 21–32 may carry varied motif returns (V1.2). */
function eventsHeadBody(events: LeadSheetMelodyNoteEvent[]): LeadSheetMelodyNoteEvent[] {
  return events.filter((e) => e.bar >= 5 && e.bar <= 20);
}

/** Same blend as `composerOsAppGeneration` big_band path — not raw `scoreGoldenPathResultForGce` (ensemble-unfriendly). */
function evaluateBigBandSteely(score: ScoreModel): CombinedEvaluationResult {
  const evaluator = createCombinedEvaluator({ lockRequired: false });
  return evaluator.evaluate({
    output: score,
    sourceFormat: 'scoreModel',
    styleProfile: clareFischerStyleProfile,
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
  const sourceLead = imp.leadSheet;

  /** Best export by combined score (always tracked when export succeeds). */
  let bestOverallXml = '';
  let bestOverallScoreModel: ScoreModel | null = null;
  let bestOverallEval: CombinedEvaluationResult | null = null;
  let bestOverallSeed = 0;
  let bestOverallScore = -1;

  /** Best export that also clears STEELY_GCE_GATE (may stay empty). */
  let gatedXml = '';
  let gatedScoreModel: ScoreModel | null = null;
  let gatedEval: CombinedEvaluationResult | null = null;
  let gatedSeed = 0;
  let gatedScore = -1;

  let failureHint = '';

  const baseSeed = 1740080400;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = baseSeed + attempt;
    const realised = runBigBandRealisation({
      seed,
      title: 'Steely Orbit Prelude V1.4',
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
      bigBandArrangementProfile: 'orbit_steely_v1_4_64',
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
      continue;
    }

    const xmlOut = realised.exportPipeline.xml ?? '';
    const ev = evaluateBigBandSteely(realised.score);

    if (ev.finalScore > bestOverallScore) {
      bestOverallScore = ev.finalScore;
      bestOverallSeed = seed;
      bestOverallEval = ev;
      bestOverallXml = xmlOut;
      bestOverallScoreModel = realised.score;
    }

    if (ev.finalScore >= GCE_GATE && ev.finalScore > gatedScore) {
      gatedScore = ev.finalScore;
      gatedSeed = seed;
      gatedEval = ev;
      gatedXml = xmlOut;
      gatedScoreModel = realised.score;
    }
  }

  const gateMet = gatedXml.trim().length > 0 && gatedEval != null;
  const bestXml = gateMet ? gatedXml : bestOverallXml;
  const bestEval = gateMet ? gatedEval : bestOverallEval;
  const bestSeed = gateMet ? gatedSeed : bestOverallSeed;
  const bestScoreForReport = gateMet ? gatedScoreModel : bestOverallScoreModel;

  if (!bestXml.trim() || !bestEval) {
    console.error('Generation failed — no successful MusicXML export after', MAX_TRIES, 'tries.');
    console.error('Hint:', failureHint || 'check planning/export errors above');
    process.exit(1);
  }

  if (!gateMet) {
    console.warn(
      `STEELY_GATE_NOT_MET: best combined ${bestOverallScore.toFixed(2)} < gate ${GCE_GATE} — writing best-effort ${OUT_FILE} anyway (raise STEELY_MAX_TRIES or lower STEELY_GCE_GATE to chase gate).`
    );
  }

  fs.mkdirSync(outDir, { recursive: true });
  const outFinal = path.join(outDir, OUT_FILE);
  let writePath = outFinal;
  if (fs.existsSync(outFinal)) {
    writePath = path.join(outDir, `V1.4-Steely-Orbit-${bestSeed}.musicxml`);
    console.warn(`Preserving existing ${OUT_FILE} — writing ${path.basename(writePath)}`);
  }

  fs.writeFileSync(writePath, bestXml, 'utf8');

  const wrapped = bestXml.match(/<part\s+id="bb_alto_sax">([\s\S]*?)<\/part>/i)?.[1];
  let melOk = false;
  if (wrapped) {
    const stub = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Alto</part-name></score-part></part-list><part id="P1">${wrapped}</part></score-partwise>`;
    const altImp = importLeadSheetFromMusicXml(stub);
    if (altImp.ok && altImp.leadSheet) {
      const a = melodyFingerprint(eventsHeadBody(sourceLead.melodyEvents));
      const b = melodyFingerprint(eventsHeadBody(altImp.leadSheet.melodyEvents));
      melOk = a === b;
    }
  }

  const drumAudit = bestScoreForReport
    ? auditDrumVoice1FourBarRepeats(bestScoreForReport)
    : { ok: true, messages: [] as string[] };

  const melodicDev = bestScoreForReport ? validateAlto917Vs58(bestScoreForReport) : { ok: false, detail: 'no score' };

  console.log('\n--- STEELY ORBIT V1.4 REPORT ---');
  console.log(
    'Drum variation audit (voice 1 / four-bar repeats):',
    drumAudit.ok ? 'PASS' : 'FLAG',
    drumAudit.messages.length ? drumAudit.messages.join('; ') : ''
  );
  console.log('Melodic development audit (bars 9–17 vs 5–8):', melodicDev.ok ? 'PASS' : 'FLAG', melodicDev.detail);
  console.log(
    'Melodic GCE source part:',
    bestScoreForReport ? resolveMelodicPartId(bestScoreForReport) : '(unknown)'
  );
  console.log(
    'Combined score:',
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
  console.log('Songwriter pools: primary donald_fagen (Steely proxy); secondary bacharach — registry id `bacharach` (Big Band uses single songwriterStyleId + arrangement pairing)');
  console.log('Missing style data: steely_dan alias not in registry — use donald_fagen; burt_bacharach → use `bacharach` for Song Mode');
  console.log('Melody lock (source bars 5–20 vs export alto):', melOk ? 'PASS' : 'SKIP/FAIL');
  console.log('Gate:', gateMet ? 'MET' : 'NOT MET (best-effort file still written)');
  console.log('Wrote', writePath);

  if (!melOk) process.exitCode = 1;
}

main();
