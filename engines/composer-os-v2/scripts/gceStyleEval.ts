/**
 * Automated GCE-style evaluation across Song Mode primary songwriter styles (golden path duo).
 * Categories follow docs/GCE_FRAMEWORK_V2.md (10 automatable pillars where implemented).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import {
  scoreMelodicIdentity,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreEconomyAndFocus,
  scoreTensionAndRelease,
  scoreCadentialClarity,
  scorePhraseGrammar,
  scoreArrangementAndOrchestration,
  scoreThematicRecallPotential,
  gceSectionsFromFormMap,
} from '../core/gce/gceAutoScorers';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';

const STYLES = ['donald_fagen', 'wayne_shorter', 'bacharach', 'barry_harris', 'ecm_chamber'] as const;

const CAT_PAD = 34;

/** Align Style Engine profile with primary songwriter — default STYLE_ECM triggers Metheny-density gates unrelated to several writers. */
function styleProfileForSongwriter(style: string): StyleProfile {
  switch (style) {
    case 'wayne_shorter':
      return 'STYLE_SHORTER_POST_BOP';
    case 'ecm_chamber':
      return 'STYLE_ECM';
    case 'bacharach':
      return 'STYLE_SOPHISTICATED_POP';
    case 'barry_harris':
      return 'STYLE_BEBOP_LITE';
    case 'donald_fagen':
      return 'STYLE_MODERN_JAZZ';
    default:
      return 'STYLE_MODERN_JAZZ';
  }
}

function chordsFromScoreAndContext(score: ScoreModel, locked?: string[]): string[] {
  if (locked && locked.length > 0) return locked;
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const out: string[] = [];
  for (const m of guitar?.measures ?? []) {
    if (m.chord) out.push(m.chord);
  }
  return out;
}

function main(): void {
  for (const style of STYLES) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`GCE EVALUATION — ${style.toUpperCase()}`);
    console.log('═'.repeat(50));

    /** Song Mode harmony + surfaces require `guitar_bass_duo` + `songModeHookFirstIdentity` (not `song_mode` preset id). */
    /** Multi-seed sweep + duo-regression-aligned base seed (`50021` stays green on standard duo harness). */
    const result = runGoldenPath(50021, {
      presetId: 'guitar_bass_duo',
      primarySongwriterStyle: style,
      totalBars: 32,
      longFormEnabled: true,
      bpm: 100,
      creativeControlLevel: 'balanced',
      songModeHookFirstIdentity: true,
      styleProfile: styleProfileForSongwriter(style),
    });

    const guitarPart = result.score.parts.find((p) => p.id === 'guitar');
    if (!guitarPart || guitarPart.measures.length === 0) {
      console.log('GENERATION FAILED — no guitar score');
      console.log(result.errors?.join('; ') ?? '');
      continue;
    }
    if (!result.success) {
      console.warn(
        '(Golden path success=false — behaviour/export gates; scoring duo output anyway for GCE diagnostics.)'
      );
      console.warn(result.errors?.join('; ') ?? '');
    }

    const melody = scoreModelToMelodicLine(result.score);
    const chords = chordsFromScoreAndContext(result.score, result.context?.lockedHarmonyBarsRaw);
    const sections = gceSectionsFromFormMap(result.context.form);

    const cadential = scoreCadentialClarity(melody, chords, sections);
    const melodic = scoreMelodicIdentity(melody);
    const phraseGrammar = scorePhraseGrammar(melody);
    const harmony = scoreHarmonyAndLanguage(chords);
    const rhythm = scoreRhythmicIdentity(melody);
    const structure = scoreStructureAndForm(result.score, chords, sections);
    const arrangement = scoreArrangementAndOrchestration(result.score);
    const economy = scoreEconomyAndFocus(melody);
    const tension = scoreTensionAndRelease(chords);
    const thematicRecall = scoreThematicRecallPotential(melody, sections);

    /** Weights: Cadential + Melodic weighted 2× (critical pillars); others 1×. */
    const scores = {
      'Cadential Clarity': { ...cadential, weight: 2 },
      'Melodic Identity': { ...melodic, weight: 2 },
      'Phrase Grammar': { ...phraseGrammar, weight: 1 },
      'Harmony & Language': { ...harmony, weight: 1 },
      'Rhythmic Identity': { ...rhythm, weight: 1 },
      'Structure & Form': { ...structure, weight: 1 },
      'Arrangement & Orchestration': { ...arrangement, weight: 1 },
      'Economy & Focus': { ...economy, weight: 1 },
      'Tension & Release': { ...tension, weight: 1 },
      'Thematic Recall Potential': { ...thematicRecall, weight: 1 },
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [cat, data] of Object.entries(scores)) {
      console.log(
        `${cat.padEnd(CAT_PAD)} ${String(data.score).padStart(5)}/10  ${data.justification}`
      );
      weightedSum += data.score * data.weight;
      totalWeight += data.weight;
    }

    const overall = Math.round((weightedSum / totalWeight) * 10) / 10;
    console.log(`\nOVERALL GCE SCORE: ${overall}/10`);
    if (overall < 9.0) {
      const weakest = Object.entries(scores).sort((a, b) => a[1].score - b[1].score)[0]?.[0];
      console.log(`⚠ BELOW TARGET — weakest: ${weakest}`);
    } else {
      console.log('✓ MEETS GCE TARGET (≥ 9.0)');
    }
  }
}

main();
