/**
 * GCE benchmark — deep harmonic voices × seed (manual / CI-adjunct; not smoke).
 * Usage: npx ts-node --project ../../tsconfig.json scripts/runGceBenchmark.ts [--seed 50021] [--voices all|<id>]
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import {
  scoreCadentialClarity,
  scoreMelodicIdentity,
  scorePhraseGrammar,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreEconomyAndFocusForEnsemble,
  scoreTensionAndReleaseForEnsemble,
  scoreThematicRecallPotential,
  gceSectionsFromFormMap,
} from '../core/gce/gceAutoScorers';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';
import { buildChordsForGceGate, GCE_GATE_HARMONIC_BAR_TARGET } from '../core/gce/gceGate';

const ALL_VOICES = [
  'gil_evans',
  'maria_schneider',
  'john_coltrane',
  'wayne_shorter',
  'pat_metheny',
  'henry_threadgill',
  'charles_mingus',
] as const;

function parseArgs(): { seed: number; voices: string[] } {
  const argv = process.argv.slice(2);
  let seed = 50021;
  const voices: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed' && argv[i + 1]) {
      seed = Number(argv[i + 1]);
      i++;
      continue;
    }
    if (argv[i] === '--voices' && argv[i + 1]) {
      const v = argv[i + 1]!;
      if (v === 'all') voices.push(...ALL_VOICES);
      else voices.push(...v.split(',').map((s) => s.trim()).filter(Boolean));
      i++;
    }
  }
  if (voices.length === 0) voices.push(...ALL_VOICES);
  return { seed, voices };
}

function weightedOverall(cats: Record<string, { score: number; weight: number }>): number {
  let sum = 0;
  let w = 0;
  for (const x of Object.values(cats)) {
    sum += x.score * x.weight;
    w += x.weight;
  }
  return Math.round((sum / w) * 10) / 10;
}

/** Parses Melodic Identity justification sub-scores (0–10 display scale). */
function parseMelodicIdentityBreakdown(justification: string): {
  motifRecurrence: number | null;
  contour: number | null;
  intervalBalance: number | null;
  registerCohesion: number | null;
} {
  const m = justification.match(
    /motif recurrence ([\d.]+),\s*contour ([\d.]+),\s*interval balance ([\d.]+),\s*register cohesion ([\d.]+)/i
  );
  if (!m) {
    return {
      motifRecurrence: null,
      contour: null,
      intervalBalance: null,
      registerCohesion: null,
    };
  }
  return {
    motifRecurrence: Number(m[1]),
    contour: Number(m[2]),
    intervalBalance: Number(m[3]),
    registerCohesion: Number(m[4]),
  };
}

function main(): void {
  const { seed, voices } = parseArgs();
  const primary = 'donald_fagen';
  const rows: unknown[] = [];

  for (const hv of voices) {
    const result = runGoldenPath(seed, {
      presetId: 'guitar_bass_duo',
      primarySongwriterStyle: primary,
      harmonicVoice: hv,
      totalBars: 32,
      bpm: 100,
      longFormEnabled: true,
      creativeControlLevel: 'balanced',
      songModeHookFirstIdentity: true,
      styleProfile: defaultStyleProfileForPrimarySongwriter(primary) ?? 'STYLE_MODERN_JAZZ',
    });
    if (!result.score || !result.success) {
      rows.push({ voice: hv, error: 'no_score_or_failed', errors: result.errors });
      continue;
    }
    const melody = scoreModelToMelodicLine(result.score, resolveMelodicPartId(result.score));
    const chords = buildChordsForGceGate(result.score, result.context, GCE_GATE_HARMONIC_BAR_TARGET);
    const sections = gceSectionsFromFormMap(result.context.form);
    const sw = result.context.generationMetadata?.songwriterStyleId;

    const miCat = scoreMelodicIdentity(melody, sw);
    const miBreak = parseMelodicIdentityBreakdown(miCat.justification);

    const pillars = {
      cadentialClarity: { score: scoreCadentialClarity(melody, chords, sections).score, weight: 2 },
      melodicIdentity: { score: miCat.score, weight: 2 },
      phraseGrammar: { score: scorePhraseGrammar(melody).score, weight: 1 },
      harmonyAndLanguage: { score: scoreHarmonyAndLanguage(chords).score, weight: 1 },
      rhythmicIdentity: { score: scoreRhythmicIdentity(melody).score, weight: 1 },
      structureAndForm: { score: scoreStructureAndForm(result.score, chords, sections).score, weight: 1 },
      arrangementAndOrchestration: { score: scoreArrangementAndOrchestrationForEnsemble(result.score).score, weight: 1 },
      economyAndFocus: { score: scoreEconomyAndFocusForEnsemble(melody, sections, result.score).score, weight: 1 },
      tensionAndRelease: { score: scoreTensionAndReleaseForEnsemble(result.score, chords, melody).score, weight: 1 },
      thematicRecallPotential: { score: scoreThematicRecallPotential(melody, sections).score, weight: 1 },
    };

    rows.push({
      voice: hv,
      overall: weightedOverall(pillars),
      melodicIdentity: miCat.score,
      motifRecurrence: miBreak.motifRecurrence,
      contour: miBreak.contour,
      intervalBalance: miBreak.intervalBalance,
      registerCohesion: miBreak.registerCohesion,
      pillars: Object.fromEntries(Object.entries(pillars).map(([k, v]) => [k, v.score])),
    });
  }

  console.log(JSON.stringify({ seed, primary, benchmark: 'harmonicVoice × Song Mode', rows }, null, 2));
}

main();
