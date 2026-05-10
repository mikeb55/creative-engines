/**
 * Deliberately awful synthetic score + melody line to sanity-check GCE scorer calibration (inflation).
 * Does not modify scorers — read-only harness.
 */

import { createMeasure, createNote } from '../core/score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import type { MelodicNote } from '../core/gce/gce_melody_eval';
import {
  scoreMelodicIdentity,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreEconomyAndFocusForEnsemble,
  scoreTensionAndReleaseForEnsemble,
  scoreCadentialClarity,
  scorePhraseGrammar,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreThematicRecallPotential,
  type GceStructureSection,
} from '../core/gce/gceAutoScorers';

const CAT_PAD = 34;

const badMelody: MelodicNote[] = Array.from({ length: 32 }, (_, i) => ({
  midi: 60,
  beats: 1,
  bar: i + 1,
  beat: 0,
  rest: false,
}));

const badChords = Array(32).fill('C') as string[];

const badSections: GceStructureSection[] = [
  { label: 'verse_0', barStart: 1, barEnd: 32, role: 'verse' },
];

function buildBadPart(
  id: string,
  name: string,
  instrumentIdentity: string,
  midiProgram: number,
  clef: 'treble' | 'bass'
): PartModel {
  const measures: MeasureModel[] = [];
  for (let b = 1; b <= 32; b++) {
    const m = createMeasure(b, 'C');
    m.events = [createNote(60, 0, 1, 1)];
    measures.push(m);
  }
  return { id, name, instrumentIdentity, midiProgram, clef, measures };
}

const badScore: ScoreModel = {
  title: 'GCE Bad Piece (synthetic)',
  tempo: 120,
  timeSignature: { beats: 4, beatType: 4 },
  parts: [
    buildBadPart('guitar', 'Guitar', 'clean_electric_guitar', 27, 'treble'),
    buildBadPart('bass', 'Bass', 'acoustic_upright_bass', 32, 'bass'),
  ],
};

function main(): void {
  console.log('═'.repeat(56));
  console.log('GCE BAD PIECE TEST — deliberately terrible synthetic music');
  console.log('═'.repeat(56));
  console.log(
    'Melody: 32 × MIDI 60, 1 beat, beat 0, bars 1–32 | Chords: 32× "C" | Sections: one verse | Score: guitar+bass MIDI 60/bar\n'
  );

  const cadential = scoreCadentialClarity(badMelody, badChords, badSections);
  const melodic = scoreMelodicIdentity(badMelody);
  const phraseGrammar = scorePhraseGrammar(badMelody);
  const harmony = scoreHarmonyAndLanguage(badChords);
  const rhythm = scoreRhythmicIdentity(badMelody);
  const structure = scoreStructureAndForm(badScore, badChords, badSections);
  const arrangement = scoreArrangementAndOrchestrationForEnsemble(badScore);
  const economy = scoreEconomyAndFocusForEnsemble(badMelody, badSections, badScore);
  const tension = scoreTensionAndReleaseForEnsemble(badScore, badChords, badMelody);
  const thematicRecall = scoreThematicRecallPotential(badMelody, badSections);

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
  } as const;

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
  console.log(`\nOVERALL GCE SCORE (weighted like gceStyleEval): ${overall}/10`);
}

main();
